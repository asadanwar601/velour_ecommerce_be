import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ReturnStatus } from '@prisma/client';

export class UpdateReturnStatusDto {
  @ApiProperty({ enum: ReturnStatus, example: ReturnStatus.APPROVED, description: 'Updated return status' })
  @IsEnum(ReturnStatus)
  status: ReturnStatus;

  @ApiPropertyOptional({ example: 340.0, description: 'Refunded dollar amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}
