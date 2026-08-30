import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IOtpProvider } from '../otp-provider.interface';
import { ConsoleOtpProvider } from './console.provider';

/**
 * WhatsApp OTP Provider
 * 
 * Production Implementation Guide:
 * 1. Meta / WhatsApp Cloud API:
 *    - Configure `WHATSAPP_API_KEY` (Meta User Token) and `WHATSAPP_PHONE_NUMBER_ID`.
 *    - Send a template message POST to `https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`
 *      with template name e.g. `auth_otp_code` passing `{{code}}` as a parameter.
 * 2. Twilio / MSG91:
 *    - Twilio Verify API: `client.verify.v2.services(serviceSid).verifications.create({ to, channel: 'whatsapp' })`
 *
 * In local development (without active API keys), this provider logs directly via `ConsoleOtpProvider`
 * with a zero-cost dev simulation.
 */
@Injectable()
export class WhatsAppOtpProvider implements IOtpProvider {
  private readonly logger = new Logger('WhatsAppOtpProvider');

  constructor(
    private readonly configService: ConfigService,
    private readonly consoleProvider: ConsoleOtpProvider,
  ) {}

  async sendOtp(to: string, code: string): Promise<boolean> {
    const apiKey = this.configService.get<string>('WHATSAPP_API_KEY');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (!apiKey || !phoneNumberId) {
      this.logger.log(
        `[WhatsApp Provider (Dev Simulator)] WHATSAPP_API_KEY not configured. Logging OTP for ${to}:`,
      );
      return this.consoleProvider.sendOtp(`whatsapp:${to}`, code);
    }

    try {
      // Production stub for Meta WhatsApp Cloud API
      const endpoint = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: 'velour_auth_code',
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: code }],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: code }],
            },
          ],
        },
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        this.logger.error('WhatsApp API returned error response', errData);
        return this.consoleProvider.sendOtp(`whatsapp:${to}`, code);
      }

      this.logger.log(`WhatsApp OTP delivered via Cloud API to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`WhatsApp dispatch failed for ${to}: ${error.message}`, error.stack);
      return this.consoleProvider.sendOtp(`whatsapp:${to}`, code);
    }
  }
}
