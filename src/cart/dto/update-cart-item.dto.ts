import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ example: 2, description: 'New quantity for this cart line item (0 to remove)' })
  @IsInt()
  @Min(0)
  quantity: number;
}
