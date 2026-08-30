import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { ParentCategory } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty({ example: 'w-double-breasted-wool-coat', description: 'Product unique ID/slug' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Double-Breasted Wool Overcoat', description: 'Product title' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ParentCategory, example: ParentCategory.WOMEN, description: 'Top level category' })
  @IsEnum(ParentCategory)
  category: ParentCategory;

  @ApiProperty({ example: 'Outerwear', description: 'Subcategory' })
  @IsString()
  @IsNotEmpty()
  subcategory: string;

  @ApiProperty({ example: 340.0, description: 'Retail price in USD' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ example: 425.0, description: 'Original compare-at price' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  compareAtPrice?: number;

  @ApiProperty({ example: 'Crafted from heavy double-faced Italian virgin wool...', description: 'Full description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: ['XS', 'S', 'M', 'L', 'XL'], description: 'Available sizes' })
  @IsArray()
  @IsString({ each: true })
  sizes: string[];

  @ApiPropertyOptional({ example: ['Camel', 'Charcoal', 'Oatmeal'], description: 'Available color swatches' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({ example: '100% Italian Virgin Wool', description: 'Fabric composition' })
  @IsOptional()
  @IsString()
  materials?: string;

  @ApiPropertyOptional({ example: 'Specialist dry clean only.', description: 'Garment care instructions' })
  @IsOptional()
  @IsString()
  careInstructions?: string;

  @ApiProperty({ example: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3', description: 'Primary image' })
  @IsString()
  @IsNotEmpty()
  primaryImageUrl: string;

  @ApiProperty({ example: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea', description: 'Hover image' })
  @IsString()
  @IsNotEmpty()
  hoverImageUrl: string;

  @ApiPropertyOptional({
    example: [
      'https://images.unsplash.com/photo-1539533018447-63fcce2678e3',
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea',
    ],
    description: 'Array of additional gallery image URLs',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryImages?: string[];

  @ApiPropertyOptional({
    example: ['Featured on Homepage', 'New Arrival', 'Cashmere Collection'],
    description: 'Custom merchandising badges and search tags',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Atelier sizing measurements chart' })
  @IsOptional()
  sizeGuide?: any;

  @ApiPropertyOptional({ default: false, description: 'Featured in homepage grid' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean = false;

  @ApiPropertyOptional({ default: false, description: 'Mark as new arrival' })
  @IsOptional()
  @IsBoolean()
  isNew?: boolean = false;

  @ApiPropertyOptional({ default: false, description: 'Mark as trending' })
  @IsOptional()
  @IsBoolean()
  trending?: boolean = false;

  @ApiPropertyOptional({ default: 50, description: 'Initial stock count to deposit in primary warehouse' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialStock?: number = 50;
}
