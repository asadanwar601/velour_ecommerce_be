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
    this.initializeTransporter();
  }

  /**
   * Builds the SMTP transporter and immediately runs a connectivity
   * probe. If the SMTP server is unreachable (e.g. cloud IP blocked by
   * Gmail, missing credentials, wrong port) the transporter is set to
   * null so every subsequent sendOtp() falls back to the console
   * provider instantly — no 30-second hang per request.
   */
  private initializeTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP_HOST / SMTP_USER / SMTP_PASS not set — email OTPs will be logged to console.',
      );
      return;
    }

    const port = this.configService.get<number>('SMTP_PORT', 587);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      // Fast-fail timeouts — prevents 30-second hangs when cloud IPs
      // are blocked by the upstream SMTP provider (e.g. Gmail from Render)
      connectionTimeout: 5_000,   // 5s to establish TCP connection
      greetingTimeout: 5_000,     // 5s for SMTP EHLO handshake
      socketTimeout: 10_000,      // 10s for any individual socket operation
    });

    // Probe the connection at startup so we know immediately if SMTP
    // is unreachable — avoids per-request failures in production.
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(
          `SMTP connection probe failed for ${host}:${port} — disabling email transport. ` +
          `OTPs will fall back to console. ` +
          `Hint: Use Resend (smtp.resend.com:587) for cloud deployments. Error: ${error.message}`,
        );
        this.transporter = null;
      } else {
        this.logger.log(`SMTP transporter verified and ready — host: ${host}:${port}`);
      }
    });
  }

  async sendOtp(to: string, code: string): Promise<boolean> {
    if (!this.transporter) {
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
      this.logger.error(`Failed to send email OTP to ${to}: ${error.message}`);
      // Fallback to console so auth flow is never completely blocked
      return this.consoleProvider.sendOtp(to, code);
    }
  }
}
