import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParentCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Outerwear', description: 'Category or subcategory display name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    enum: ParentCategory,
    example: ParentCategory.WOMEN,
    description: 'Parent gender category (WOMEN or MEN, case-insensitive, defaults to WOMEN)',
    default: ParentCategory.WOMEN,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return ParentCategory.WOMEN;
    const upper = String(value).toUpperCase();
    return upper === 'MEN' ? ParentCategory.MEN : ParentCategory.WOMEN;
  })
  @IsEnum(ParentCategory)
  parent?: ParentCategory = ParentCategory.WOMEN;

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
