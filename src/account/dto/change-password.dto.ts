import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'CustomerPass2026!', description: 'Current user password' })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewSecurePass2026!', description: 'New user password (minimum 8 characters)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}
