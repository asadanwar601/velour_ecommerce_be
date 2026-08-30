import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Home', description: 'Address label (e.g. Home, Office)' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 'Elena Rostova', description: 'Recipient full name' })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional({ example: '+15550003344', description: 'Contact phone number for courier' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '742 Evergreen Terrace', description: 'Address line 1' })
  @IsNotEmpty()
  @IsString()
  line1: string;

  @ApiPropertyOptional({ example: 'Apt 4B', description: 'Address line 2' })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({ example: 'New York', description: 'City' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'NY', description: 'State / Province / Region' })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({ example: '10001', description: 'Postal / Zip code' })
  @IsNotEmpty()
  @IsString()
  zip: string;

  @ApiPropertyOptional({ example: 'US', description: 'Country code', default: 'US' })
  @IsOptional()
  @IsString()
  country?: string = 'US';

  @ApiPropertyOptional({ example: true, description: 'Set as default shipping address', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}
