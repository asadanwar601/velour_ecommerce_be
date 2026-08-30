import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddWishlistItemDto {
  @ApiProperty({ example: 'w-double-breasted-wool-coat', description: 'Product ID or slug' })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 'device-uuid-12345', description: 'Anonymous guest device ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class MoveToCartDto {
  @ApiPropertyOptional({ example: 'M', description: 'Selected size for the cart', default: 'M' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ example: 'device-uuid-12345', description: 'Anonymous guest device ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
