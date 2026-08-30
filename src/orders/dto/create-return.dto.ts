import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ReturnReason } from '@prisma/client';

export class ReturnItemInputDto {
  @ApiProperty({ example: 'order-item-uuid-12345', description: 'Order Item ID' })
  @IsNotEmpty()
  @IsString()
  orderItemId: string;

  @ApiProperty({ example: 'w-double-breasted-wool-coat', description: 'Product ID' })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({ example: 1, description: 'Quantity to return', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateReturnDto {
  @ApiProperty({ enum: ReturnReason, example: ReturnReason.SIZE_TOO_SMALL, description: 'Reason for return' })
  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @ApiPropertyOptional({ example: 'Need one size up for layering', description: 'Customer return comments' })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty({ type: [ReturnItemInputDto], description: 'Items being returned' })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemInputDto)
  items: ReturnItemInputDto[];
}
