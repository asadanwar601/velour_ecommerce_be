import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ApplyCartCouponDto {
  @ApiProperty({ example: 'WELCOME10', description: 'Coupon / Promo code to apply to active cart' })
  @IsNotEmpty()
  @IsString()
  code: string;
}
