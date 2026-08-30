import { Injectable, Logger } from '@nestjs/common';
import { IOtpProvider } from '../otp-provider.interface';

@Injectable()
export class ConsoleOtpProvider implements IOtpProvider {
  private readonly logger = new Logger('ConsoleOtpProvider');

  async sendOtp(to: string, code: string): Promise<boolean> {
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
