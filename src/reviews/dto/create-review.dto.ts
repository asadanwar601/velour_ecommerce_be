import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { FitRating } from '@prisma/client';

export class CreateReviewDto {
  @ApiProperty({ example: 'w-double-breasted-wool-coat', description: 'Product ID or slug' })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({ example: 5, description: 'Rating between 1 and 5 stars', minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Exceptional craftsmanship and drape', description: 'Review headline/title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'The virgin wool feels incredible. Perfect structured shoulder lines.', description: 'Review body' })
  @IsNotEmpty()
  @IsString()
  comment: string;

  @ApiPropertyOptional({
    enum: FitRating,
    default: FitRating.TRUE_TO_SIZE,
    description: 'Atelier Fit assessment (RUNS_SMALL, TRUE_TO_SIZE, RUNS_LARGE)',
  })
  @IsOptional()
  @IsEnum(FitRating)
  fitRating?: FitRating = FitRating.TRUE_TO_SIZE;

  @ApiPropertyOptional({ example: 'Elena R.', description: 'Display name for guest reviews' })
  @IsOptional()
  @IsString()
  userName?: string;
}
