import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, ReturnStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { MailService } from '../mail/mail.service';
import { OrderPlacementService } from './services/order-placement.service';
import { OrderFulfillmentService } from './services/order-fulfillment.service';
import { InvoiceGeneratorService } from './services/invoice-generator.service';
import { OrderRepository } from './repositories/order.repository';
import { CheckoutDto } from './dto/checkout.dto';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly mailService: MailService,
    private readonly orderPlacementService: OrderPlacementService,
    private readonly orderFulfillmentService: OrderFulfillmentService,
    private readonly invoiceGeneratorService: InvoiceGeneratorService,
    private readonly orderRepository: OrderRepository,
  ) {}

  async checkout(checkoutDto: CheckoutDto, authenticatedUserId?: string, activeDeviceId?: string) {
    return this.orderPlacementService.processCheckout(checkoutDto, authenticatedUserId, activeDeviceId);
  }

  async cancelOrder(orderIdentifier: string, authenticatedUserId?: string, cancellationReason?: string) {
    return this.orderFulfillmentService.cancelOrder(orderIdentifier, authenticatedUserId, cancellationReason);
  }

  async getTrackingTimeline(orderIdentifier: string, authenticatedUserId?: string, isAdministrator: boolean = false) {
    return this.orderFulfillmentService.getTrackingTimeline(orderIdentifier, authenticatedUserId, isAdministrator);
  }

  async reorder(orderIdentifier: string, authenticatedUserId?: string, activeDeviceId?: string) {
    const orderRecord = await this.orderRepository.findOrderByIdOrNumber(orderIdentifier);
    if (!orderRecord) {
      throw new NotFoundException(`Order "${orderIdentifier}" not found`);
    }

    for (const orderItem of orderRecord.items) {
      await this.cartService.addItem(
        {
          productId: orderItem.productId,
          size: orderItem.size,
          quantity: orderItem.quantity,
          deviceId: activeDeviceId,
        },
        authenticatedUserId,
        activeDeviceId,
      );
    }

    const updatedCart = await this.cartService.getCart(authenticatedUserId, activeDeviceId);
    return {
      message: `Items from order ${orderRecord.orderNumber} added to your shopping bag`,
      cart: updatedCart,
    };
  }

  async createReturn(orderIdentifier: string, createReturnDto: CreateReturnDto, authenticatedUserId?: string) {
    return this.orderFulfillmentService.createReturnRequest(orderIdentifier, createReturnDto, authenticatedUserId);
  }

  async getReturnsForOrder(orderIdentifier: string, authenticatedUserId?: string) {
    const orderRecord = await this.orderRepository.findOrderByIdOrNumber(orderIdentifier);
    if (!orderRecord) {
      throw new NotFoundException(`Order "${orderIdentifier}" not found`);
    }
    return this.prisma.return.findMany({
      where: { orderId: orderRecord.id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllReturns(query: PaginationQueryDto & { status?: ReturnStatus }) {
    return this.orderFulfillmentService.findAllReturns(query);
  }

  async updateReturnStatus(returnId: string, updateReturnStatusDto: UpdateReturnStatusDto) {
    return this.orderFulfillmentService.updateReturnStatus(returnId, updateReturnStatusDto);
  }

  async findUserOrders(authenticatedUserId: string) {
    return this.orderRepository.findOrdersByCustomerId(authenticatedUserId);
  }

  async findById(orderIdentifier: string, authenticatedUserId?: string, isAdministrator?: boolean) {
    const orderRecord = await this.orderRepository.findOrderByIdOrNumber(orderIdentifier);
    if (!orderRecord) {
      throw new NotFoundException(`Order "${orderIdentifier}" not found`);
    }
    return this.orderRepository.formatOrderEntity(orderRecord);
  }

  async getOrderById(orderIdentifier: string, authenticatedUserId?: string, userRole?: Role) {
    return this.findById(orderIdentifier, authenticatedUserId, userRole === Role.ADMIN);
  }

  async findAllOrders(paginationQuery: PaginationQueryDto & { status?: OrderStatus }) {
    return this.orderRepository.findPaginatedOrders(paginationQuery);
  }

  async updateStatus(orderId: string, newOrderStatus: OrderStatus) {
    const existingOrder = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!existingOrder) {
      throw new NotFoundException(`Order "${orderId}" not found`);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: newOrderStatus },
      include: { items: { include: { product: true } }, returns: true },
    });

    const formattedOrder = this.orderRepository.formatOrderEntity(updatedOrder);
    if (newOrderStatus === OrderStatus.SHIPPED) {
      this.mailService.sendOrderShipped(formattedOrder).catch(() => {});
    }
    return formattedOrder;
  }

  async getInvoicePdf(orderIdentifier: string, authenticatedUserId?: string, isAdministrator?: boolean) {
    const orderRecord = await this.orderRepository.findOrderByIdOrNumber(orderIdentifier);
    if (!orderRecord) {
      throw new NotFoundException(`Order "${orderIdentifier}" not found`);
    }

    if (!isAdministrator && authenticatedUserId && orderRecord.userId && orderRecord.userId !== authenticatedUserId) {
      throw new NotFoundException(`Order "${orderIdentifier}" not found`);
    }

    const brandSettings = await this.prisma.brandSetting.findFirst();
    const pdfBuffer = await this.invoiceGeneratorService.generateInvoicePdf(orderRecord, brandSettings);

    return {
      pdfBuffer,
      orderNumber: orderRecord.orderNumber,
    };
  }
}
