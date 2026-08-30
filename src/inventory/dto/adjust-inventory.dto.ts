import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdjustInventoryDto {
  @ApiProperty({ example: 'w-double-breasted-wool-coat', description: 'Product ID or slug' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'location-uuid', description: 'Location / Warehouse ID' })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({ example: 25, description: 'Signed quantity change (e.g. +25 for restock, -5 for damage/shrinkage)' })
  @IsInt()
  quantity: number;

  @ApiPropertyOptional({
    enum: StockMovementType,
    example: StockMovementType.RESTOCK,
    description: 'Movement classification',
  })
  @IsOptional()
  @IsEnum(StockMovementType)
  type?: StockMovementType = StockMovementType.ADJUSTMENT;

  @ApiPropertyOptional({ example: 'Supplier shipment PO-9982', description: 'Reason or audit note' })
  @IsOptional()
  @IsString()
  reason?: string;
}
