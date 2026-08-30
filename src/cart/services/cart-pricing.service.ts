import { Injectable } from '@nestjs/common';
import { DiscountType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeProduct } from '../../products/product.serializer';

@Injectable()
export class CartPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async formatCartResponse(cart: any, couponCode?: string) {
    let subtotal = 0;
    let itemCount = 0;

    const items = (cart.items || []).map((item: any) => {
      const price = Number(item.product.price);
      const lineTotal = price * item.quantity;
      subtotal += lineTotal;
      itemCount += item.quantity;

      return {
        id: item.id,
        productId: item.productId,
        product: serializeProduct(item.product),
        size: item.size,
        quantity: item.quantity,
        price,
        lineTotal,
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;

    const freeShippingThreshold = 75.0;
    const freeShippingEligible = subtotal >= freeShippingThreshold;
    const amountNeededForFreeShipping = Math.max(0, Math.round((freeShippingThreshold - subtotal) * 100) / 100);
    const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

    let appliedCoupon: any = null;
    let discountAmount = 0;

    if (couponCode && couponCode.trim() !== '') {
      const code = couponCode.trim().toUpperCase();
      const coupon = await this.prisma.coupon.findUnique({ where: { code } });
      if (coupon && coupon.isActive) {
        const minOrder = coupon.minOrderValue ? Number(coupon.minOrderValue) : 0;
        if (subtotal >= minOrder) {
          const discountVal = Number(coupon.discountValue);
          if (coupon.discountType === DiscountType.PERCENTAGE) {
            discountAmount = (subtotal * discountVal) / 100;
            if (coupon.maxDiscount) {
              discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
            }
          } else {
            discountAmount = Math.min(discountVal, subtotal);
          }
          discountAmount = Math.round(discountAmount * 100) / 100;
          appliedCoupon = {
            code: coupon.code,
            description: coupon.description,
            discountType: coupon.discountType,
            discountValue: discountVal,
            discountAmount,
          };
        }
      }
    }

    const estimatedShipping = freeShippingEligible || subtotal === 0 ? 0 : 15.0;
    const estimatedTotal = Math.max(0, Math.round((subtotal - discountAmount + estimatedShipping) * 100) / 100);

    const cartProductIds = items.map((i: any) => i.productId);
    const crossSells = await this.prisma.product.findMany({
      where: {
        id: { notIn: cartProductIds },
        trending: true,
      },
      take: 3,
    });

    return {
      id: cart.id,
      items,
      itemCount,
      subtotal,
      freeShippingThreshold,
      freeShippingEligible,
      amountNeededForFreeShipping,
      freeShippingProgress,
      appliedCoupon,
      discountAmount,
      estimatedShipping,
      estimatedTotal,
      crossSellProducts: crossSells.map(serializeProduct),
    };
  }
}
