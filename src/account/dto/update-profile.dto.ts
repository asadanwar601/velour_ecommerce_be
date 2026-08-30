import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UserPreferencesDto {
  @ApiPropertyOptional({ example: 'both', enum: ['women', 'men', 'both'], description: 'Wardrobe category preference' })
  @IsOptional()
  @IsString()
  categoryPreference?: string;

  @ApiPropertyOptional({ example: true, description: 'Receive exclusive Atelier VIP lookbooks' })
  @IsOptional()
  vipNotifications?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Receive SMS delivery and dispatch alerts' })
  @IsOptional()
  smsAlerts?: boolean;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Elena', description: 'User first name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Rostova', description: 'User last name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: '+15550003344', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '1995-04-12T00:00:00.000Z', description: 'Birthday for anniversary gift rewards' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthday?: Date;

  @ApiPropertyOptional({ type: UserPreferencesDto, description: 'Client preferences and notification toggles' })
  @IsOptional()
  @IsObject()
  preferences?: UserPreferencesDto;
}
