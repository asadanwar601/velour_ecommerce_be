import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelOrderDto {
  @ApiPropertyOptional({
    example: 'Changed mind before shipping',
    description: 'Reason for self-service order cancellation',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
