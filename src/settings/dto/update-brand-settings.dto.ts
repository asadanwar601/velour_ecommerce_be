import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBrandSettingsDto {
  @ApiPropertyOptional({ example: 'VELOUR', description: 'Brand or store name' })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiPropertyOptional({ example: 'Quiet Luxury & Modern Atelier', description: 'Brand slogan or tagline' })
  @IsOptional()
  @IsString()
  tagline?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3',
    description: 'Header logo image URL',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3',
    description: 'Mobile / Web app icon image URL',
  })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3',
    description: 'Favicon image URL',
  })
  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @ApiPropertyOptional({ example: 'USD', description: 'Store currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '$', description: 'Store currency symbol' })
  @IsOptional()
  @IsString()
  currencySymbol?: string;

  @ApiPropertyOptional({ example: 'care@velour.com', description: 'Support email address' })
  @IsOptional()
  @IsString()
  supportEmail?: string;

  @ApiPropertyOptional({ example: '+1 (800) 555-0199', description: 'Support contact phone number' })
  @IsOptional()
  @IsString()
  supportPhone?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/velour.atelier', description: 'Brand Instagram URL' })
  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/velour.atelier', description: 'Brand Facebook URL' })
  @IsOptional()
  @IsString()
  facebookUrl?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/@velour.atelier', description: 'Brand YouTube channel URL' })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  @ApiPropertyOptional({ example: 'https://velour.com', description: 'Brand official website URL' })
  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 75.0, description: 'Free shipping threshold amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShippingThreshold?: number;

  @ApiPropertyOptional({
    example: 'Complimentary Express Shipping on Orders Over $75 • Atelier Gift Packaging Included',
    description: 'Top header announcement banner text',
  })
  @IsOptional()
  @IsString()
  announcementBarText?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the announcement banner is active' })
  @IsOptional()
  @IsBoolean()
  announcementBarActive?: boolean;
}
