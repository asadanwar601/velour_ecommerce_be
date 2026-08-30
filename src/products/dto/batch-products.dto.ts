import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class BatchProductsDto {
  @ApiProperty({
    example: ['w-double-breasted-wool-coat', 'm-unstructured-wool-blazer'],
    description: 'Array of product IDs or slugs to batch fetch (e.g. for recently viewed carousel)',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
