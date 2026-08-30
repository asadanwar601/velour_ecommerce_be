import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.PAID,
    description: 'Updated order status',
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
