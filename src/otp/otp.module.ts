import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OtpService } from './otp.service';
import { ConsoleOtpProvider } from './providers/console.provider';
import { EmailOtpProvider } from './providers/email.provider';
import { WhatsAppOtpProvider } from './providers/whatsapp.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    OtpService,
    ConsoleOtpProvider,
    EmailOtpProvider,
    WhatsAppOtpProvider,
  ],
  exports: [OtpService],
})
export class OtpModule {}
