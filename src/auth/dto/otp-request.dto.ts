import { ApiProperty } from '@nestjs/swagger';
import { OtpChannel } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class OtpRequestDto {
  @ApiProperty({
    example: 'customer@velour.com',
    description: 'Email address or phone number in international format (+15551234567)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Identifier (email or phone) is required' })
  identifier: string;

  @ApiProperty({
    enum: OtpChannel,
    example: OtpChannel.EMAIL,
    description: 'Delivery channel (EMAIL or WHATSAPP)',
  })
  @IsEnum(OtpChannel, { message: 'Channel must be EMAIL or WHATSAPP' })
  channel: OtpChannel;
}
