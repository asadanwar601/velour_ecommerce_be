import { Injectable } from '@nestjs/common';
import { OrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateDashboardMetrics() {
    const [
      totalOrdersCount,
      pendingOrdersCount,
      paidOrdersCount,
      shippedOrdersCount,
      deliveredOrdersCount,
      cancelledOrdersCount,
      totalCustomersCount,
      totalProductsCount,
      lowStockProductsAggregation,
      activeCouponsCount,
      recentPaidOrders,
      topSellingProductItems,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.PAID } }),
      this.prisma.order.count({ where: { status: OrderStatus.SHIPPED } }),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      this.prisma.user.count({ where: { role: Role.CUSTOMER, isArchived: false } }),
      this.prisma.product.count(),
      this.prisma.inventoryItem.count({ where: { quantity: { lte: 5 } } }),
      this.prisma.coupon.count({ where: { isActive: true } }),
      this.prisma.order.findMany({
        where: { status: { in: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED] } },
        select: { total: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const grossRevenueTotal = recentPaidOrders.reduce(
      (runningRevenue, order) => runningRevenue + Number(order.total),
      0,
    );

    const averageOrderValue = recentPaidOrders.length > 0 ? grossRevenueTotal / recentPaidOrders.length : 0;

    const topSellingProductsWithDetails = await Promise.all(
      topSellingProductItems.map(async (item) => {
        const productDetails = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, price: true, primaryImageUrl: true, category: true },
        });
        return {
          product: productDetails,
          totalQuantitySold: item._sum.quantity || 0,
        };
      }),
    );

    return {
      revenue: {
        grossRevenue: Math.round(grossRevenueTotal * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        completedOrdersCount: recentPaidOrders.length,
      },
      orders: {
        total: totalOrdersCount,
        pending: pendingOrdersCount,
        paid: paidOrdersCount,
        shipped: shippedOrdersCount,
        delivered: deliveredOrdersCount,
        cancelled: cancelledOrdersCount,
      },
      inventory: {
        totalCatalogProducts: totalProductsCount,
        lowStockAlertsCount: lowStockProductsAggregation,
      },
      customers: {
        totalActiveCustomers: totalCustomersCount,
      },
      marketing: {
        activeCouponsCount,
      },
      topSellingProducts: topSellingProductsWithDetails.filter((p) => p.product !== null),
    };
  }
}
