import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { serializeProduct } from '../products/product.serializer';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get product stock breakdown across all locations and warehouses.
   */
  async getProductInventory(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: productId }, { slug: productId }] },
    });

    if (!product) {
      throw new NotFoundException(`Product "${productId}" not found`);
    }

    const items = await this.prisma.inventoryItem.findMany({
      where: { productId: product.id },
      include: { location: true },
    });

    const totalStock = items.reduce((sum, item) => sum + item.quantity, 0);

    const recentMovements = await this.prisma.stockMovement.findMany({
      where: { productId: product.id },
      include: { location: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      productId: product.id,
      productName: product.name,
      totalStock,
      locations: items.map((item) => ({
        locationId: item.locationId,
        locationName: item.location.name,
        locationType: item.location.type,
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
        isLowStock: item.quantity <= item.lowStockThreshold,
      })),
      recentMovements: recentMovements.map((m) => ({
        id: m.id,
        locationName: m.location.name,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Adjust inventory in a single transaction, writing a StockMovement audit record.
   */
  async adjust(dto: AdjustInventoryDto) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: dto.productId }, { slug: dto.productId }] },
    });

    if (!product) {
      throw new NotFoundException(`Product "${dto.productId}" not found`);
    }

    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });

    if (!location) {
      throw new NotFoundException(`Location "${dto.locationId}" not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Find or create inventory item row
      let inventory = await tx.inventoryItem.findUnique({
        where: {
          productId_locationId: {
            productId: product.id,
            locationId: location.id,
          },
        },
      });

      if (!inventory) {
        inventory = await tx.inventoryItem.create({
          data: {
            productId: product.id,
            locationId: location.id,
            quantity: 0,
            lowStockThreshold: 5,
          },
        });
      }

      const newQuantity = inventory.quantity + dto.quantity;
      if (newQuantity < 0) {
        throw new BadRequestException(
          `Adjustment of ${dto.quantity} would result in negative stock (${newQuantity}) at ${location.name}`,
        );
      }

      const updatedInventory = await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: { quantity: newQuantity },
      });

      const movementType =
        dto.type ||
        (dto.quantity > 0 ? StockMovementType.RESTOCK : StockMovementType.ADJUSTMENT);

      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          locationId: location.id,
          type: movementType,
          quantity: dto.quantity,
          reason: dto.reason || 'Manual inventory adjustment',
        },
      });

      this.logger.log(
        `Adjusted stock for ${product.name} at ${location.name}: ${dto.quantity > 0 ? '+' : ''}${dto.quantity} (New total: ${newQuantity})`,
      );

      return {
        productId: product.id,
        locationId: location.id,
        locationName: location.name,
        previousQuantity: inventory.quantity,
        adjustedQuantity: dto.quantity,
        newQuantity,
        movementId: movement.id,
      };
    });
  }

  /**
   * List all inventory items that are currently at or below their low-stock threshold.
   */
  async getLowStock() {
    // Fetch all inventory items and filter where quantity <= lowStockThreshold
    const items = await this.prisma.inventoryItem.findMany({
      include: {
        product: true,
        location: true,
      },
    });

    const lowStockItems = items
      .filter((item) => item.quantity <= item.lowStockThreshold)
      .map((item) => ({
        id: item.id,
        productId: item.productId,
        product: serializeProduct(item.product),
        locationId: item.locationId,
        locationName: item.location.name,
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
      }));

    return lowStockItems;
  }
}
