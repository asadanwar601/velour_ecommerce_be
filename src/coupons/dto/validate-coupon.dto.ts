import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({ example: 'WELCOME10', description: 'Promo / Coupon code' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 150.0, description: 'Cart subtotal to validate eligibility' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subtotal: number;
}
