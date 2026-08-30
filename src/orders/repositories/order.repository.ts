import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { serializeProduct } from '../../products/product.serializer';

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find order by unique identifier or order number.
   */
  async findOrderByIdOrNumber(orderIdentifier: string) {
    return this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderIdentifier }, { orderNumber: orderIdentifier }],
      },
      include: {
        items: {
          include: { product: true },
        },
        returns: true,
      },
    });
  }

  /**
   * Find all orders belonging to a customer.
   */
  async findOrdersByCustomerId(customerUserId: string) {
    const orderRecords = await this.prisma.order.findMany({
      where: { userId: customerUserId },
      include: {
        items: {
          include: { product: true },
        },
        returns: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orderRecords.map((order) => this.formatOrderEntity(order));
  }

  /**
   * Paginated order listing for admin dashboards.
   */
  async findPaginatedOrders(paginationQuery: PaginationQueryDto & { status?: OrderStatus }) {
    const filteringCondition: Prisma.OrderWhereInput = {};
    if (paginationQuery.status) {
      filteringCondition.status = paginationQuery.status;
    }

    const currentPage = paginationQuery.page || 1;
    const pageItemLimit = paginationQuery.limit || 20;
    const skipOffset = (currentPage - 1) * pageItemLimit;

    const [totalOrderCount, retrievedOrders] = await Promise.all([
      this.prisma.order.count({ where: filteringCondition }),
      this.prisma.order.findMany({
        where: filteringCondition,
        include: {
          items: {
            include: { product: true },
          },
          returns: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: skipOffset,
        take: pageItemLimit,
      }),
    ]);

    return {
      data: retrievedOrders.map((order) => this.formatOrderEntity(order)),
      meta: {
        total: totalOrderCount,
        page: currentPage,
        limit: pageItemLimit,
        totalPages: Math.ceil(totalOrderCount / pageItemLimit),
      },
    };
  }

  /**
   * Format raw Prisma Order object into frontend client response.
   */
  formatOrderEntity(orderRecord: any) {
    return {
      id: orderRecord.id,
      orderNumber: orderRecord.orderNumber,
      status: orderRecord.status,
      subtotal: Number(orderRecord.subtotal),
      shipping: Number(orderRecord.shipping),
      discount: Number(orderRecord.discount || 0),
      total: Number(orderRecord.total),
      promoCode: orderRecord.promoCode,
      carrier: orderRecord.carrier,
      trackingNumber: orderRecord.trackingNumber,
      estimatedDelivery: orderRecord.estimatedDelivery?.toISOString(),
      giftPackaging: orderRecord.giftPackaging,
      giftNote: orderRecord.giftNote,
      cancelledAt: orderRecord.cancelledAt?.toISOString(),
      cancelReason: orderRecord.cancelReason,
      shippingAddress: orderRecord.shippingAddress,
      contactName: orderRecord.contactName,
      contactEmail: orderRecord.contactEmail,
      contactPhone: orderRecord.contactPhone,
      createdAt: orderRecord.createdAt?.toISOString(),
      updatedAt: orderRecord.updatedAt?.toISOString(),
      returns: orderRecord.returns || [],
      items: (orderRecord.items || []).map((lineItem: any) => ({
        id: lineItem.id,
        productId: lineItem.productId,
        product: lineItem.product ? serializeProduct(lineItem.product) : null,
        size: lineItem.size,
        quantity: lineItem.quantity,
        price: Number(lineItem.price),
        lineTotal: Number(lineItem.price) * lineItem.quantity,
      })),
    };
  }
}
