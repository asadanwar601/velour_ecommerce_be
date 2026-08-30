import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminUserDto {
  @ApiProperty({ description: 'Administrator email address', example: 'colleague@velour.com' })
  @IsEmail({}, { message: 'Please provide a valid administrator email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Temporary or initial password', example: 'AdminPass2026!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'First name', example: 'Marcus' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Vance' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ description: 'Administrator direct phone line' })
  @IsOptional()
  @IsString()
  phone?: string;
}
