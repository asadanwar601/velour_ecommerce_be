import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ example: 'w-double-breasted-wool-coat', description: 'Product ID or slug' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'M', description: 'Chosen apparel size (e.g. XS, S, M, L, XL)' })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiPropertyOptional({ default: 1, example: 1, description: 'Quantity to add' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  quantity?: number = 1;

  @ApiPropertyOptional({ example: 'device-guest-12345', description: 'Guest session device ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
