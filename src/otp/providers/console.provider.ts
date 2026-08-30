import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IOtpProvider } from '../otp-provider.interface';

@Injectable()
export class ConsoleOtpProvider implements IOtpProvider {
  private readonly logger = new Logger('ConsoleOtpProvider');
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  async sendOtp(to: string, code: string): Promise<boolean> {
    if (this.isProduction) {
      // In production, SMTP must be properly configured.
      // Logging OTP codes to server output is a security violation —
      // Render/cloud logs are visible to anyone with dashboard access.
      this.logger.error(
        `[PRODUCTION] OTP delivery failed for ${to} — SMTP is not configured or unreachable. ` +
        `Set SMTP_HOST, SMTP_USER, SMTP_PASS in your environment variables. ` +
        `Recommended: use Resend (smtp.resend.com:465) for cloud deployments.`,
      );
      throw new InternalServerErrorException(
        'Email delivery is temporarily unavailable. Please try again later or contact support.',
      );
    }

    // Development only — log OTP to console for easy testing
    const banner = [
      '┌────────────────────────────────────────────────────────┐',
      `│ [DEV OTP SIMULATOR] Destination: ${to.padEnd(21)} │`,
      `│ [DEV OTP SIMULATOR] Code:        ${code.padEnd(21)} │`,
      `│ Valid for 10 minutes. Use this code to verify in dev.  │`,
      '└────────────────────────────────────────────────────────┘',
    ].join('\n');

    this.logger.log(`\n${banner}\n`);
    return true;
  }
}
