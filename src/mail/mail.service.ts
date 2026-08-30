import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { generateOrderConfirmationHtml } from './templates/order-confirmation.template';
import { generateOrderCancellationHtml } from './templates/order-cancellation.template';
import { generateRefundProcessedHtml } from './templates/refund-processed.template';
import { generateAuthOtpHtml } from './templates/auth-otp.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
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
      this.logger.log('No SMTP credentials configured. Transactional emails will be simulated in console.');
    }
  }

  private async dispatchEmail(to: string, subject: string, html: string, attachments?: any[]): Promise<boolean> {
    const from = this.configService.get<string>('SMTP_FROM', 'VELOUR Atelier <orders@velour.com>');

    if (!this.transporter) {
      this.logger.log(`[Mail Simulation] -> To: ${to} | Subject: "${subject}"`);
      return true;
    }

    try {
      await this.transporter.sendMail({ from, to, subject, html, attachments });
      this.logger.log(`Email dispatched to ${to} (Subject: "${subject}")`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      return false;
    }
  }

  async sendOrderConfirmation(order: any): Promise<boolean> {
    const to = order.contactEmail || order.user?.email;
    if (!to) return false;
    const subject = `Order Confirmed: ${order.orderNumber} — VELOUR Atelier`;
    const html = generateOrderConfirmationHtml(order);
    return this.dispatchEmail(to, subject, html);
  }

  async sendOrderCancellation(order: any, reason?: string): Promise<boolean> {
    const to = order.contactEmail || order.user?.email;
    if (!to) return false;
    const subject = `Order Cancelled: ${order.orderNumber} — VELOUR Atelier`;
    const html = generateOrderCancellationHtml(order, reason);
    return this.dispatchEmail(to, subject, html);
  }

  async sendRefundProcessed(order: any, refundDetails: { amount: number; reason?: string; returnId?: string }): Promise<boolean> {
    const to = order.contactEmail || order.user?.email;
    if (!to) return false;
    const subject = `Refund Processed: $${Number(refundDetails.amount || 0).toFixed(2)} for ${order.orderNumber}`;
    const html = generateRefundProcessedHtml(order, refundDetails);
    return this.dispatchEmail(to, subject, html);
  }

  async sendOrderShipped(order: any): Promise<boolean> {
    const to = order.contactEmail || order.user?.email;
    if (!to) return false;
    const subject = `Dispatched: Your Order ${order.orderNumber} is on the way — VELOUR`;
    const html = generateOrderConfirmationHtml(order);
    return this.dispatchEmail(to, subject, html);
  }

  async sendRegistrationOtp(email: string, otpCode: string, firstName?: string): Promise<boolean> {
    if (!email) return false;
    const subject = `${otpCode} is your VELOUR Atelier verification code`;
    const html = generateAuthOtpHtml(otpCode, firstName);
    return this.dispatchEmail(email, subject, html);
  }

  async sendOrderInvoicePdf(order: any, pdfBuffer: Buffer): Promise<boolean> {
    const to = order.contactEmail || order.user?.email;
    if (!to) return false;
    const subject = `Invoice & Receipt for Order ${order.orderNumber} — VELOUR`;
    const html = generateOrderConfirmationHtml(order);
    const attachments = [
      {
        filename: `Invoice-${order.orderNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ];
    return this.dispatchEmail(to, subject, html, attachments);
  }
}
