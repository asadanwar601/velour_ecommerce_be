import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { OrderStatus, ReturnStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStockService } from './order-stock.service';
import { OrderRepository } from '../repositories/order.repository';
import { MailService } from '../../mail/mail.service';
import { CreateReturnDto } from '../dto/create-return.dto';
import { UpdateReturnStatusDto } from '../dto/update-return-status.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class OrderFulfillmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderStockService: OrderStockService,
    private readonly orderRepository: OrderRepository,
    private readonly mailService: MailService,
  ) {}

  async cancelOrder(orderIdentifier: string, authenticatedUserId?: string, cancellationReason?: string) {
    const existingOrder = await this.orderRepository.findOrderByIdOrNumber(orderIdentifier);
    if (!existingOrder) {
      throw new NotFoundException(`Order "${orderIdentifier}" not found`);
    }

    if (authenticatedUserId && existingOrder.userId && existingOrder.userId !== authenticatedUserId) {
      throw new ForbiddenException('You do not have permission to cancel this order');
    }

    if (existingOrder.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    if (existingOrder.status === OrderStatus.SHIPPED || existingOrder.status === OrderStatus.DELIVERED) {
      throw new BadRequestException(
        `Cannot cancel order in "${existingOrder.status}" status. Please initiate a return instead.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.orderStockService.restockCancelledOrderItems(tx, existingOrder.items, existingOrder.orderNumber);

      const updatedOrder = await tx.order.update({
        where: { id: existingOrder.id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: cancellationReason || 'Customer self-service cancellation',
        },
        include: { items: { include: { product: true } }, returns: true },
      });

      const formattedCancelledOrder = this.orderRepository.formatOrderEntity(updatedOrder);
      this.mailService.sendOrderCancellation(formattedCancelledOrder, cancellationReason).catch(() => {});

      return {
        message: `Order ${existingOrder.orderNumber} cancelled successfully. Refund initiated.`,
        order: formattedCancelledOrder,
      };
    });
  }

  async getTrackingTimeline(orderIdentifier: string, authenticatedUserId?: string, isAdministrator = false) {
    const orderRecord = await this.orderRepository.findOrderByIdOrNumber(orderIdentifier);
    if (!orderRecord) {
      throw new NotFoundException(`Order "${orderIdentifier}" not found`);
    }

    if (!isAdministrator && orderRecord.userId && authenticatedUserId && orderRecord.userId !== authenticatedUserId) {
      throw new ForbiddenException('You do not have permission to view tracking for this order');
    }

    const orderCreationDate = orderRecord.createdAt;
    const isCancelled = orderRecord.status === OrderStatus.CANCELLED;

    const stages = [
      { id: 'placed', label: 'Order Placed', description: 'Order received and confirmed' },
      { id: 'processing', label: 'Processing in Atelier', description: 'Garments inspected and packaged in signature box' },
      { id: 'dispatched', label: 'Dispatched & In Transit', description: 'Handed over to carrier courier' },
      { id: 'out_for_delivery', label: 'Out for Delivery', description: 'With local courier for final delivery' },
      { id: 'delivered', label: 'Delivered', description: 'Delivered to recipient address' },
    ];

    let currentStageIndex = 1;
    if (orderRecord.status === OrderStatus.PENDING) currentStageIndex = 0;
    if (orderRecord.status === OrderStatus.PAID) currentStageIndex = 1;
    if (orderRecord.status === OrderStatus.SHIPPED) currentStageIndex = 3;
    if (orderRecord.status === OrderStatus.DELIVERED) currentStageIndex = 4;
    if (isCancelled) currentStageIndex = -1;

    const timelineEvents = [
      { title: 'Order Placed', status: 'COMPLETED', timestamp: orderCreationDate.toISOString(), location: 'VELOUR Online Store' },
      ...(!isCancelled && currentStageIndex >= 1
        ? [{ title: 'Payment Confirmed', status: 'COMPLETED', timestamp: new Date(orderCreationDate.getTime() + 600000).toISOString(), location: 'VELOUR Logistics Secaucus, NJ' }]
        : []),
      ...(!isCancelled && currentStageIndex >= 3
        ? [{ title: 'In Transit with Courier', status: 'COMPLETED', timestamp: new Date(orderCreationDate.getTime() + 86400000).toISOString(), location: 'FedEx Sort Facility' }]
        : []),
      ...(!isCancelled && currentStageIndex >= 4
        ? [{ title: 'Delivered to Front Door', status: 'COMPLETED', timestamp: (orderRecord.updatedAt || new Date()).toISOString(), location: 'Delivered' }]
        : []),
      ...(isCancelled
        ? [{ title: 'Order Cancelled', status: 'CANCELLED', timestamp: (orderRecord.cancelledAt || orderRecord.updatedAt).toISOString(), location: orderRecord.cancelReason || 'Cancelled' }]
        : []),
    ];

    return {
      orderNumber: orderRecord.orderNumber,
      status: orderRecord.status,
      carrier: orderRecord.carrier || 'FedEx Luxury Express',
      trackingNumber: orderRecord.trackingNumber || 'VLR-TRK-PENDING',
      estimatedDelivery: orderRecord.estimatedDelivery?.toISOString() || null,
      activeStageIndex: currentStageIndex,
      isCancelled,
      stages,
      timelineEvents,
    };
  }

  async createReturnRequest(orderIdentifier: string, returnDto: CreateReturnDto, authenticatedUserId?: string) {
    const existingOrder = await this.orderRepository.findOrderByIdOrNumber(orderIdentifier);
    if (!existingOrder) {
      throw new NotFoundException(`Order "${orderIdentifier}" not found`);
    }

    if (authenticatedUserId && existingOrder.userId && existingOrder.userId !== authenticatedUserId) {
      throw new ForbiddenException('You do not have permission to return items from this order');
    }

    const returnTrackingCode = `VLR-RET-${crypto.randomInt(100000, 999999)}`;
    let refundAmount = 0;
    for (const item of returnDto.items) {
      const match = existingOrder.items.find((i) => i.productId === item.productId || i.id === item.orderItemId);
      if (match) refundAmount += Number(match.price) * item.quantity;
    }

    const createdReturn = await this.prisma.return.create({
      data: {
        orderId: existingOrder.id,
        userId: authenticatedUserId || existingOrder.userId || null,
        status: ReturnStatus.REQUESTED,
        reason: returnDto.reason,
        comments: returnDto.comments?.trim() || null,
        trackingNumber: returnTrackingCode,
        refundAmount: refundAmount > 0 ? refundAmount.toFixed(2) : null,
        items: { create: returnDto.items.map((i) => ({ orderItemId: i.orderItemId, productId: i.productId, quantity: i.quantity })) },
      },
      include: { items: { include: { product: true } } },
    });

    return {
      message: 'Return request received. Prepaid return shipping label generated.',
      return: {
        id: createdReturn.id,
        orderId: createdReturn.orderId,
        orderNumber: existingOrder.orderNumber,
        status: createdReturn.status,
        reason: createdReturn.reason,
        trackingNumber: createdReturn.trackingNumber,
        refundAmount: Number(createdReturn.refundAmount || 0),
        items: createdReturn.items.map((i) => ({ productId: i.productId, productName: i.product?.name, quantity: i.quantity })),
        createdAt: createdReturn.createdAt.toISOString(),
      },
    };
  }

  async updateReturnStatus(returnId: string, dto: UpdateReturnStatusDto) {
    const existingReturn = await this.prisma.return.findUnique({ where: { id: returnId } });
    if (!existingReturn) throw new NotFoundException(`Return "${returnId}" not found`);

    const updated = await this.prisma.return.update({
      where: { id: returnId },
      data: { status: dto.status, ...(dto.refundAmount !== undefined && { refundAmount: dto.refundAmount }) },
      include: { order: { include: { user: true } }, items: { include: { product: true } } },
    });

    if (dto.status === ReturnStatus.REFUNDED && updated.order) {
      this.mailService.sendRefundProcessed(updated.order, {
        amount: Number(updated.refundAmount || 0),
        reason: updated.reason,
        returnId: updated.id,
      }).catch(() => {});
    }

    return updated;
  }

  async findAllReturns(query: PaginationQueryDto & { status?: ReturnStatus }) {
    const filteringCondition: any = {};
    if (query.status) filteringCondition.status = query.status;

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skipOffset = (page - 1) * limit;

    const [totalCount, retrievedReturns] = await Promise.all([
      this.prisma.return.count({ where: filteringCondition }),
      this.prisma.return.findMany({
        where: filteringCondition,
        include: { order: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        skip: skipOffset,
        take: limit,
      }),
    ]);

    return {
      data: retrievedReturns,
      meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
    };
  }
}
