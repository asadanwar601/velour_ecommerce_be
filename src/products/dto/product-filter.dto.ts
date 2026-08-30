import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ProductFilterDto {
  @ApiPropertyOptional({
    description: 'Category filter',
    enum: ['women', 'men'],
    example: 'women',
  })
  @IsOptional()
  @IsString()
  @IsIn(['women', 'men', 'WOMEN', 'MEN'])
  category?: string;

  @ApiPropertyOptional({
    description: 'Subcategory filter',
    example: 'Outerwear',
  })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({
    description: 'Sizes filter (comma separated or single string e.g. "S,M,L")',
    example: 'M',
  })
  @IsOptional()
  @IsString()
  sizes?: string;

  @ApiPropertyOptional({
    description: 'Colors filter (comma separated e.g. "Black,Camel")',
    example: 'Black',
  })
  @IsOptional()
  @IsString()
  colors?: string;

  @ApiPropertyOptional({
    description: 'Minimum price filter',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price filter',
    example: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Only show items currently in stock',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({
    description: 'Sort ordering',
    enum: ['featured', 'price-asc', 'price-desc', 'newest'],
    example: 'featured',
  })
  @IsOptional()
  @IsString()
  @IsIn(['featured', 'price-asc', 'price-desc', 'newest'])
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'newest';

  @ApiPropertyOptional({
    description: 'Search query across name, description, and subcategory',
    example: 'wool',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination (1-indexed)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
