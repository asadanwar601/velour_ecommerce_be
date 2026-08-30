import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateContactPageDto {
  @ApiPropertyOptional({ example: 'How May We Assist You?', description: 'Contact page main headline' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Client Care', description: 'Contact page eyebrow category' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: 'Our concierge team is available Monday through Friday...', description: 'Introductory description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'concierge@velour.com', description: 'Primary concierge email' })
  @IsOptional()
  @IsString()
  supportEmail?: string;

  @ApiPropertyOptional({ example: '+1 (800) 555-0198', description: 'Concierge direct phone' })
  @IsOptional()
  @IsString()
  supportPhone?: string;

  @ApiPropertyOptional({ example: 'Monday – Friday: 9:00 AM – 6:00 PM EST', description: 'Operational service hours' })
  @IsOptional()
  @IsString()
  workingHours?: string;

  @ApiPropertyOptional({ example: '482 Mercer Street', description: 'Flagship address line 1' })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'SoHo, New York, NY 10013', description: 'Flagship address line 2' })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'https://www.google.com/maps/embed?...', description: 'Google Maps embed iframe URL or map location' })
  @IsOptional()
  @IsString()
  mapEmbedUrl?: string;

  @ApiPropertyOptional({ description: 'Custom step-by-step instructions [{stepNumber, title, description}]' })
  @IsOptional()
  @IsArray()
  contactStepsJson?: Array<{ stepNumber: number; title: string; description: string }>;
}
