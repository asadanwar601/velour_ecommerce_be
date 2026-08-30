import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IOtpProvider } from '../otp-provider.interface';
import { ConsoleOtpProvider } from './console.provider';

@Injectable()
export class EmailOtpProvider implements IOtpProvider {
  private readonly logger = new Logger('EmailOtpProvider');
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly consoleProvider: ConsoleOtpProvider,
  ) {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<number>('SMTP_PORT', 587) === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP transporter initialized with host: ${host}`);
    } else {
      this.logger.log('No SMTP credentials configured. Email OTPs will be logged to console in dev mode.');
    }
  }

  async sendOtp(to: string, code: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`[Email Provider Fallback] Sending email OTP to ${to}`);
      return this.consoleProvider.sendOtp(to, code);
    }

    try {
      const from = this.configService.get<string>('SMTP_FROM', 'VELOUR <no-reply@velour.com>');
      await this.transporter.sendMail({
        from,
        to,
        subject: `Your VELOUR Verification Code: ${code}`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #fcfbf9; color: #1c1917;">
            <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; text-align: center;">VELOUR</h1>
            <p style="font-size: 15px; line-height: 1.6; color: #44403c;">Please use the following single-use verification code to complete your authentication:</p>
            <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 4px; padding: 24px; margin: 32px 0; text-align: center;">
              <span style="font-size: 36px; font-weight: 600; letter-spacing: 8px; color: #0c0a09;">${code}</span>
            </div>
            <p style="font-size: 13px; color: #78716c; line-height: 1.5;">This code will expire in 10 minutes. If you did not request this code, you can safely disregard this message.</p>
          </div>
        `,
      });
      this.logger.log(`Email OTP sent successfully to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email OTP to ${to}: ${error.message}`, error.stack);
      // Fallback to console so dev / testing flow doesn't break
      return this.consoleProvider.sendOtp(to, code);
    }
  }
}
