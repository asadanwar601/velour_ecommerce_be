import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IOtpProvider } from '../otp-provider.interface';
import { ConsoleOtpProvider } from './console.provider';

@Injectable()
export class EmailOtpProvider implements IOtpProvider {
  private readonly logger = new Logger('EmailOtpProvider');
  private transporter: nodemailer.Transporter | null = null;
  private readonly resendApiKey: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly consoleProvider: ConsoleOtpProvider,
  ) {
    const resendKey =
      this.configService.get<string>('RESEND_API_KEY') ||
      this.getResendKeyFromSmtp();

    if (resendKey) {
      this.resendApiKey = resendKey;
      this.logger.log('Resend HTTPS REST API initialized (bypasses cloud SMTP port blocks).');
    } else {
      this.initializeSmtpTransporter();
    }
  }

  private getResendKeyFromSmtp(): string | null {
    const host = this.configService.get<string>('SMTP_HOST') || '';
    const pass = this.configService.get<string>('SMTP_PASS') || '';
    if (host.includes('resend') || pass.startsWith('re_')) {
      return pass;
    }
    return null;
  }

  private initializeSmtpTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('No email provider credentials set — fallback to console.');
      return;
    }

    const port = this.configService.get<number>('SMTP_PORT', 587);
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
    });

    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(
          `SMTP probe failed for ${host}:${port} (${error.message}). Disabling SMTP.`,
        );
        this.transporter = null;
      } else {
        this.logger.log(`SMTP transporter verified: ${host}:${port}`);
      }
    });
  }

  private getEmailHtml(code: string): string {
    return `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #fcfbf9; color: #1c1917;">
        <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; text-align: center;">VELOUR</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #44403c;">Please use the following single-use verification code to complete your authentication:</p>
        <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 4px; padding: 24px; margin: 32px 0; text-align: center;">
          <span style="font-size: 36px; font-weight: 600; letter-spacing: 8px; color: #0c0a09;">${code}</span>
        </div>
        <p style="font-size: 13px; color: #78716c; line-height: 1.5;">This code will expire in 10 minutes. If you did not request this code, you can safely disregard this message.</p>
      </div>
    `;
  }

  async sendOtp(to: string, code: string): Promise<boolean> {
    const from = this.configService.get<string>('SMTP_FROM', 'VELOUR Atelier <onboarding@resend.dev>');
    const html = this.getEmailHtml(code);
    const subject = `Your VELOUR Verification Code: ${code}`;

    // 1. Prioritize Resend HTTPS REST API (Port 443 — NEVER blocked by Render/AWS/GCP)
    if (this.resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: [to],
            subject,
            html,
          }),
        });

        if (!response.ok) {
          const errData = await response.text();
          throw new Error(`Resend API returned ${response.status}: ${errData}`);
        }

        this.logger.log(`Email OTP sent successfully via Resend HTTPS API to ${to}`);
        return true;
      } catch (error: any) {
        this.logger.error(`Resend HTTPS API delivery failed: ${error.message}`);
        return this.consoleProvider.sendOtp(to, code);
      }
    }

    // 2. Fallback to standard SMTP if configured
    if (this.transporter) {
      try {
        await this.transporter.sendMail({ from, to, subject, html });
        this.logger.log(`Email OTP sent successfully via SMTP to ${to}`);
        return true;
      } catch (error: any) {
        this.logger.error(`Failed to send email OTP via SMTP to ${to}: ${error.message}`);
        return this.consoleProvider.sendOtp(to, code);
      }
    }

    return this.consoleProvider.sendOtp(to, code);
  }
}
