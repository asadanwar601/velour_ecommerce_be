import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ example: 'elena.rostova@atelier.com', description: 'User email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1 (555) 234-5678', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Elena', description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Rostova', description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ enum: Role, example: Role.CUSTOMER, description: 'User role permission' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Account status (ACTIVE, ARCHIVED, SUSPENDED)' })
  @IsOptional()
  @IsString()
  status?: 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED';

  @ApiPropertyOptional({ example: false, description: 'Archived / deactivated status' })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
