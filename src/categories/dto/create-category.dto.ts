import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParentCategory } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Outerwear', description: 'Category or subcategory display name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ParentCategory, example: ParentCategory.WOMEN, description: 'Parent gender category' })
  @IsNotEmpty()
  @IsEnum(ParentCategory)
  parent: ParentCategory;

  @ApiPropertyOptional({ example: 'women-outerwear', description: 'Unique category slug' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Luxury tailored overcoats, blazers, and trenches', description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3', description: 'Category banner/cover image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the category is active in navigation', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
