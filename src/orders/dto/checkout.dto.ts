import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ShippingAddressDto {
  @ApiProperty({ example: '742 Evergreen Terrace', description: 'Address line 1' })
  @IsString()
  @IsNotEmpty()
  line1: string;

  @ApiPropertyOptional({ example: 'Apt 4B', description: 'Address line 2' })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({ example: 'New York', description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'NY', description: 'State / Province' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '10001', description: 'Postal / ZIP Code' })
  @IsString()
  @IsNotEmpty()
  zip: string;

  @ApiPropertyOptional({ default: 'US', example: 'US', description: 'Country Code' })
  @IsOptional()
  @IsString()
  country?: string = 'US';
}

export class CheckoutDto {
  @ApiProperty({ example: 'Elena Rostova', description: 'Customer full name' })
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @ApiProperty({ example: 'customer@velour.com', description: 'Customer email' })
  @IsEmail()
  @IsNotEmpty()
  contactEmail: string;

  @ApiPropertyOptional({ example: '+15550003344', description: 'Customer phone number' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ type: ShippingAddressDto, description: 'Destination shipping address' })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiPropertyOptional({ example: 0.0, description: 'Shipping fee' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number = 0;

  @ApiPropertyOptional({ example: 'WELCOME10', description: 'Optional coupon / promo code' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: true, description: 'Signature luxury gift box packaging' })
  @IsOptional()
  @IsBoolean()
  giftPackaging?: boolean = false;

  @ApiPropertyOptional({
    example: 'Happy Birthday Elena! Enjoy this luxury wool coat.',
    description: 'Custom handwritten gift card note',
  })
  @IsOptional()
  @IsString()
  giftNote?: string;

  @ApiPropertyOptional({ example: 'device-guest-12345', description: 'Guest session device ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
