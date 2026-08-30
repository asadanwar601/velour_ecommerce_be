import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ProductImageType {
  GALLERY = 'gallery',
  PRIMARY = 'primary',
  HOVER = 'hover',
}

export class AddProductImageDto {
  @ApiProperty({
    example: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3',
    description: 'Image URL or relative /uploads path',
  })
  @IsNotEmpty()
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({
    enum: ProductImageType,
    default: ProductImageType.GALLERY,
    description: 'Where to set this image (gallery, primary, or hover)',
  })
  @IsOptional()
  @IsEnum(ProductImageType)
  type?: ProductImageType = ProductImageType.GALLERY;
}

export class DeleteProductImageDto {
  @ApiProperty({
    example: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3',
    description: 'Image URL or path to remove from product gallery or images',
  })
  @IsNotEmpty()
  @IsString()
  imageUrl: string;
}
