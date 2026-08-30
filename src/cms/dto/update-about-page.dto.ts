import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateAboutPageDto {
  @ApiPropertyOptional({ example: 'Form, Texture, & Permanence', description: 'Hero section main title' })
  @IsOptional()
  @IsString()
  heroTitle?: string;

  @ApiPropertyOptional({ example: 'Our Philosophy', description: 'Hero section eyebrow subtitle' })
  @IsOptional()
  @IsString()
  heroSubtitle?: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d', description: 'Studio or atelier banner image' })
  @IsOptional()
  @IsString()
  bannerImageUrl?: string;

  @ApiPropertyOptional({ example: '<p>Founded on the principle of understated distinction...</p>', description: 'Rich text HTML formatted story' })
  @IsOptional()
  @IsString()
  storyHtml?: string;

  @ApiPropertyOptional({ example: 'Artisanal Materiality', description: 'Mission section heading' })
  @IsOptional()
  @IsString()
  missionTitle?: string;

  @ApiPropertyOptional({ example: 'Every fiber is selected with discerning intention...', description: 'Mission text' })
  @IsOptional()
  @IsString()
  missionText?: string;

  @ApiPropertyOptional({ description: 'Array of core atelier values [{title, description, icon}]' })
  @IsOptional()
  @IsArray()
  valuesJson?: Array<{ title: string; description: string; icon?: string }>;

  @ApiPropertyOptional({ description: 'Chronological company milestones [{year, title, description}]' })
  @IsOptional()
  @IsArray()
  milestonesJson?: Array<{ year: string; title: string; description: string }>;
}
