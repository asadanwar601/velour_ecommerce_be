import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrderStockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate that all items in cart have sufficient inventory across locations.
   */
  async validateCartStockAvailability(
    cartItems: Array<{ productId: string; product: { name: string }; size: string; quantity: number }>,
  ): Promise<void> {
    for (const cartItem of cartItems) {
      const inventoryAggregation = await this.prisma.inventoryItem.aggregate({
        where: { productId: cartItem.productId },
        _sum: { quantity: true },
      });

      const totalAvailableStock = inventoryAggregation._sum.quantity || 0;
      if (totalAvailableStock < cartItem.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${cartItem.product.name}" (Size: ${cartItem.size}). Available: ${totalAvailableStock}, Requested: ${cartItem.quantity}.`,
        );
      }
    }
  }

  /**
   * Decrement inventory and record stock movements within an active database transaction.
   */
  async decrementInventoryForOrder(
    transactionClient: Prisma.TransactionClient,
    cartItems: Array<{ productId: string; quantity: number }>,
    orderTrackingNumber: string,
  ): Promise<void> {
    for (const cartItem of cartItems) {
      const primaryLocationInventory = await transactionClient.inventoryItem.findFirst({
        where: {
          productId: cartItem.productId,
          quantity: { gte: cartItem.quantity },
        },
      });

      const targetInventoryItem =
        primaryLocationInventory ||
        (await transactionClient.inventoryItem.findFirst({
          where: { productId: cartItem.productId },
        }));

      if (targetInventoryItem) {
        await transactionClient.inventoryItem.update({
          where: { id: targetInventoryItem.id },
          data: { quantity: { decrement: cartItem.quantity } },
        });

        await transactionClient.stockMovement.create({
          data: {
            productId: cartItem.productId,
            locationId: targetInventoryItem.locationId,
            type: StockMovementType.SALE,
            quantity: -cartItem.quantity,
            reason: `Checkout sale order ${orderTrackingNumber}`,
          },
        });
      }
    }
  }

  /**
   * Restock items into central warehouse during cancellation.
   */
  async restockCancelledOrderItems(
    transactionClient: Prisma.TransactionClient,
    orderItems: Array<{ productId: string; quantity: number }>,
    orderTrackingNumber: string,
  ): Promise<void> {
    const centralWarehouseLocation = await transactionClient.location.findFirst({
      where: { type: 'WAREHOUSE' },
    });

    if (!centralWarehouseLocation) return;

    for (const orderItem of orderItems) {
      const warehouseInventoryRecord = await transactionClient.inventoryItem.findUnique({
        where: {
          productId_locationId: {
            productId: orderItem.productId,
            locationId: centralWarehouseLocation.id,
          },
        },
      });

      if (warehouseInventoryRecord) {
        await transactionClient.inventoryItem.update({
          where: { id: warehouseInventoryRecord.id },
          data: { quantity: { increment: orderItem.quantity } },
        });
      }

      await transactionClient.stockMovement.create({
        data: {
          productId: orderItem.productId,
          locationId: centralWarehouseLocation.id,
          type: StockMovementType.RESTOCK,
          quantity: orderItem.quantity,
          reason: `Customer cancellation for order ${orderTrackingNumber}`,
        },
      });
    }
  }
}
