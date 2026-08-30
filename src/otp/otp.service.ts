import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpChannel } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailOtpProvider } from './providers/email.provider';
import { WhatsAppOtpProvider } from './providers/whatsapp.provider';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly expiryMinutes: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailProvider: EmailOtpProvider,
    private readonly whatsappProvider: WhatsAppOtpProvider,
  ) {
    this.expiryMinutes = this.configService.get<number>('OTP_EXPIRY_MINUTES', 10);
    this.maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 5);
  }

  /**
   * Generates a cryptographically secure 6-digit numeric OTP,
   * stores a bcrypt hash in the database with a 10-minute expiry,
   * and dispatches it through the requested channel.
   */
  async requestOtp(identifier: string, channel: OtpChannel): Promise<{ message: string; channel: OtpChannel }> {
    const cleanIdentifier = identifier.trim().toLowerCase();

    // 1. Generate 6-digit code using cryptographically secure PRNG (crypto.randomInt)
    const code = crypto.randomInt(100000, 1000000).toString();

    // 2. Hash OTP code with bcrypt (never store plain-text OTPs)
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(code, salt);

    // 3. Expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + this.expiryMinutes * 60 * 1000);

    // 4. Invalidate any existing unverified OTPs for this identifier & channel
    await this.prisma.otpVerification.deleteMany({
      where: {
        identifier: cleanIdentifier,
        channel,
      },
    });

    // 5. Create new OtpVerification record
    await this.prisma.otpVerification.create({
      data: {
        identifier: cleanIdentifier,
        channel,
        otpHash,
        expiresAt,
        verified: false,
        attempts: 0,
      },
    });

    // 6. Dispatch through appropriate provider
    if (channel === OtpChannel.EMAIL) {
      await this.emailProvider.sendOtp(cleanIdentifier, code);
    } else if (channel === OtpChannel.WHATSAPP) {
      await this.whatsappProvider.sendOtp(cleanIdentifier, code);
    }

    return {
      message: `Verification code sent to ${identifier} via ${channel}`,
      channel,
    };
  }

  /**
   * Verifies an OTP code against the latest stored verification record.
   * Protects against brute-force attacks by capping verification attempts at 5.
   */
  async verifyOtp(identifier: string, code: string, channel?: OtpChannel): Promise<boolean> {
    const cleanIdentifier = identifier.trim().toLowerCase();

    const query: any = {
      identifier: cleanIdentifier,
      verified: false,
    };
    if (channel) {
      query.channel = channel;
    }

    const verification = await this.prisma.otpVerification.findFirst({
      where: query,
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('No pending verification code found. Please request a new code.');
    }

    // Check expiration
    if (new Date() > verification.expiresAt) {
      await this.prisma.otpVerification.delete({ where: { id: verification.id } });
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }

    // Check attempt threshold for brute-force protection
    if (verification.attempts >= this.maxAttempts) {
      await this.prisma.otpVerification.delete({ where: { id: verification.id } });
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
    }

    // Increment attempts count
    await this.prisma.otpVerification.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });

    // Verify hash
    const isValid = await bcrypt.compare(code.trim(), verification.otpHash);
    if (!isValid) {
      const remaining = this.maxAttempts - (verification.attempts + 1);
      throw new BadRequestException(
        remaining > 0
          ? `Invalid verification code. ${remaining} attempt(s) remaining.`
          : 'Invalid verification code. Maximum attempts reached. Please request a new code.',
      );
    }

    // Mark as verified
    await this.prisma.otpVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    return true;
  }
}
