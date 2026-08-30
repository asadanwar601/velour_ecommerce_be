import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderPricingService } from './order-pricing.service';
import { OrderStockService } from './order-stock.service';
import { OrderRepository } from '../repositories/order.repository';
import { MailService } from '../../mail/mail.service';
import { CheckoutDto } from '../dto/checkout.dto';

@Injectable()
export class OrderPlacementService {
  private readonly logger = new Logger(OrderPlacementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderPricingService: OrderPricingService,
    private readonly orderStockService: OrderStockService,
    private readonly orderRepository: OrderRepository,
    private readonly mailService: MailService,
  ) {}

  /**
   * Execute atomic checkout transaction for active user.
   */
  async processCheckout(checkoutDto: CheckoutDto, authenticatedUserId?: string, activeDeviceId?: string) {
    if (!authenticatedUserId) {
      throw new UnauthorizedException('Authentication required. You must sign in before completing checkout.');
    }

    const customerUser = await this.prisma.user.findUnique({
      where: { id: authenticatedUserId },
    });

    if (!customerUser) {
      throw new UnauthorizedException('Active customer account not found. Please sign in with a valid account.');
    }

    const targetDeviceId = activeDeviceId || checkoutDto.deviceId;
    let customerCart = await this.resolveAndMergeCart(authenticatedUserId, targetDeviceId);

    if (!customerCart || !customerCart.items || customerCart.items.length === 0) {
      throw new BadRequestException('Your shopping cart is empty. Please add items before checking out.');
    }

    await this.orderStockService.validateCartStockAvailability(customerCart.items);

    const checkoutTransactionResult = await this.prisma.$transaction(async (tx) => {
      const orderSubtotal = this.orderPricingService.calculateCartSubtotal(customerCart.items);

      let couponRecord = null;
      if (checkoutDto.couponCode?.trim()) {
        couponRecord = await tx.coupon.findUnique({
          where: { code: checkoutDto.couponCode.trim().toUpperCase() },
        });
      }

      const { calculatedDiscount, validatedPromoCode } = this.orderPricingService.evaluateCouponDiscount(
        couponRecord,
        orderSubtotal,
      );

      if (couponRecord && validatedPromoCode) {
        await tx.coupon.update({
          where: { id: couponRecord.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      const { calculatedShipping, calculatedGiftFee } = this.orderPricingService.computeShippingAndFees(
        orderSubtotal,
        calculatedDiscount,
        checkoutDto.shippingCost,
        checkoutDto.giftPackaging,
      );

      const finalOrderTotal = Math.max(
        0,
        Math.round((orderSubtotal - calculatedDiscount + calculatedShipping + calculatedGiftFee) * 100) / 100,
      );

      const currentYear = new Date().getFullYear();
      const generatedOrderNumber = `VLR-${currentYear}-${crypto.randomInt(10000, 99999)}`;
      const generatedTrackingNumber = `VLR-TRK-${crypto.randomInt(100000, 999999)}`;
      const estimatedDeliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      const createdOrder = await tx.order.create({
        data: {
          userId: customerUser.id,
          orderNumber: generatedOrderNumber,
          status: OrderStatus.PAID,
          subtotal: orderSubtotal.toFixed(2),
          shipping: calculatedShipping.toFixed(2),
          discount: calculatedDiscount.toFixed(2),
          total: finalOrderTotal.toFixed(2),
          promoCode: validatedPromoCode,
          carrier: 'FedEx Luxury Express',
          trackingNumber: generatedTrackingNumber,
          estimatedDelivery: estimatedDeliveryDate,
          giftPackaging: !!checkoutDto.giftPackaging,
          giftNote: checkoutDto.giftNote?.trim() || null,
          shippingAddress: checkoutDto.shippingAddress as any,
          contactName:
            checkoutDto.contactName?.trim() ||
            `${customerUser.firstName || ''} ${customerUser.lastName || ''}`.trim() ||
            customerUser.email,
          contactEmail: customerUser.email,
          contactPhone: checkoutDto.contactPhone?.trim() || customerUser.phone || null,
        },
      });

      for (const cartItem of customerCart.items) {
        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: cartItem.productId,
            size: cartItem.size,
            quantity: cartItem.quantity,
            price: cartItem.product.price,
          },
        });
      }

      await this.orderStockService.decrementInventoryForOrder(tx, customerCart.items, generatedOrderNumber);

      await tx.cartItem.deleteMany({
        where: { cartId: customerCart.id },
      });

      const retrievedCompleteOrder = await tx.order.findUnique({
        where: { id: createdOrder.id },
        include: {
          items: { include: { product: true } },
          returns: true,
        },
      });

      return {
        orderNumber: generatedOrderNumber,
        order: this.orderRepository.formatOrderEntity(retrievedCompleteOrder),
      };
    });

    if (checkoutTransactionResult?.order) {
      this.mailService.sendOrderConfirmation(checkoutTransactionResult.order).catch((mailError) => {
        this.logger.warn(`Could not dispatch order confirmation email: ${mailError.message}`);
      });
    }

    return checkoutTransactionResult;
  }

  private async resolveAndMergeCart(customerUserId: string, deviceIdentifier?: string) {
    let customerCart = await this.prisma.cart.findUnique({
      where: { userId: customerUserId },
      include: {
        items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
      },
    });

    if ((!customerCart || !customerCart.items || customerCart.items.length === 0) && deviceIdentifier) {
      const guestCart = await this.prisma.cart.findUnique({
        where: { anonymousId: deviceIdentifier },
        include: {
          items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
        },
      });

      if (guestCart && guestCart.items.length > 0) {
        if (!customerCart) {
          customerCart = await this.prisma.cart.create({
            data: { userId: customerUserId },
            include: {
              items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
            },
          });
        }

        for (const guestItem of guestCart.items) {
          await this.prisma.cartItem.upsert({
            where: {
              cartId_productId_size: {
                cartId: customerCart.id,
                productId: guestItem.productId,
                size: guestItem.size,
              },
            },
            update: { quantity: { increment: guestItem.quantity } },
            create: {
              cartId: customerCart.id,
              productId: guestItem.productId,
              size: guestItem.size,
              quantity: guestItem.quantity,
            },
          });
        }

        await this.prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
        await this.prisma.cart.delete({ where: { id: guestCart.id } });

        customerCart = await this.prisma.cart.findUnique({
          where: { userId: customerUserId },
          include: {
            items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
          },
        });
      }
    }

    return customerCart;
  }
}
