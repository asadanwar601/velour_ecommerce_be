import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpChannel } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class OtpVerifyDto {
  @ApiProperty({
    example: 'customer@velour.com',
    description: 'Email address or phone number',
  })
  @IsString()
  @IsNotEmpty({ message: 'Identifier is required' })
  identifier: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
  code: string;

  @ApiPropertyOptional({
    enum: OtpChannel,
    example: OtpChannel.EMAIL,
    description: 'Channel used to request OTP',
  })
  @IsOptional()
  @IsEnum(OtpChannel)
  channel?: OtpChannel;

  @ApiPropertyOptional({ example: 'Elena', description: 'First name (for new user signup)' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Rostova', description: 'Last name (for new user signup)' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'dev-session-abc-123', description: 'Anonymous guest cart device ID to merge' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
