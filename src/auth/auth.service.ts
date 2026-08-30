import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OtpChannel, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../otp/otp.service';
import { AuthCredentialService } from './services/auth-credential.service';
import { AuthOAuthService } from './services/auth-oauth.service';
import { AuthSessionService } from './services/auth-session.service';
import { AuthMfaService } from './services/auth-mfa.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { OtpRequestDto } from './dto/otp-request.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly authCredentialService: AuthCredentialService,
    private readonly authOAuthService: AuthOAuthService,
    private readonly authSessionService: AuthSessionService,
    private readonly authMfaService: AuthMfaService,
  ) {}

  async signup(signupDto: SignupDto) {
    const createdUser = await this.authCredentialService.registerCustomerAccount(signupDto);

    await this.otpService.requestOtp(createdUser.email, OtpChannel.EMAIL);

    return {
      requiresVerification: true,
      email: createdUser.email,
      message: 'Account registered. Please enter the 6-digit verification code sent to your email.',
    };
  }

  async login(loginDto: LoginDto) {
    const validatedUser = await this.authCredentialService.validatePasswordCredentials(loginDto);

    if (validatedUser.role !== Role.ADMIN && !validatedUser.isEmailVerified) {
      await this.otpService.requestOtp(validatedUser.email, OtpChannel.EMAIL);
      return {
        requiresVerification: true,
        email: validatedUser.email,
        message: 'Account is pending email verification. A fresh 6-digit code has been sent to your email.',
      };
    }

    if (loginDto.deviceId) {
      await this.authSessionService.mergeAnonymousCart(validatedUser.id, loginDto.deviceId);
    }

    const accessToken = this.authSessionService.generateAccessToken(validatedUser.id, validatedUser.email, validatedUser.role);
    const refreshToken = await this.authSessionService.createRefreshToken(validatedUser.id);

    return {
      accessToken,
      refreshToken,
      user: this.authCredentialService.formatUserProfileResponse(validatedUser),
    };
  }

  async googleLogin(googleAuthDto: GoogleAuthDto) {
    const { user, isNewUser } = await this.authOAuthService.authenticateGoogleCustomer(googleAuthDto);

    if (googleAuthDto.deviceId) {
      await this.authSessionService.mergeAnonymousCart(user.id, googleAuthDto.deviceId);
    }

    const accessToken = this.authSessionService.generateAccessToken(user.id, user.email, user.role);

    return {
      accessToken,
      isNewUser,
      user: this.authCredentialService.formatUserProfileResponse(user),
    };
  }

  async requestOtp(otpRequestDto: OtpRequestDto) {
    return this.otpService.requestOtp(otpRequestDto.identifier.trim(), otpRequestDto.channel);
  }

  async verifyOtp(otpVerifyDto: OtpVerifyDto) {
    const sanitizedIdentifier = otpVerifyDto.identifier.trim().toLowerCase();
    await this.otpService.verifyOtp(sanitizedIdentifier, otpVerifyDto.code, otpVerifyDto.channel);

    const isEmail = sanitizedIdentifier.includes('@');
    let matchedUser = await this.prisma.user.findFirst({
      where: isEmail ? { email: sanitizedIdentifier } : { phone: sanitizedIdentifier },
    });

    let isNewUser = false;
    if (!matchedUser) {
      isNewUser = true;
      matchedUser = await this.prisma.user.create({
        data: {
          email: isEmail ? sanitizedIdentifier : `user_${Date.now()}@velour.internal`,
          phone: !isEmail ? sanitizedIdentifier : null,
          firstName: otpVerifyDto.firstName?.trim() || null,
          lastName: otpVerifyDto.lastName?.trim() || null,
          role: Role.CUSTOMER,
          isEmailVerified: true,
          isActive: true,
        },
      });
    } else {
      matchedUser = await this.prisma.user.update({
        where: { id: matchedUser.id },
        data: { isEmailVerified: true, isActive: true },
      });
    }

    if (otpVerifyDto.deviceId) {
      await this.authSessionService.mergeAnonymousCart(matchedUser.id, otpVerifyDto.deviceId);
    }

    const accessToken = this.authSessionService.generateAccessToken(matchedUser.id, matchedUser.email, matchedUser.role);
    const refreshToken = await this.authSessionService.createRefreshToken(matchedUser.id);

    return {
      accessToken,
      refreshToken,
      isNewUser,
      user: this.authCredentialService.formatUserProfileResponse(matchedUser),
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { addresses: { orderBy: { isDefault: 'desc' } } },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.authCredentialService.formatUserProfileResponse(user);
  }

  async refreshToken(refreshTokenString: string) {
    const result = await this.authSessionService.rotateRefreshToken(refreshTokenString);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: this.authCredentialService.formatUserProfileResponse(result.user),
    };
  }

  async logout(authenticatedUserId?: string, rawBearerToken?: string) {
    return this.authSessionService.terminateActiveSession(authenticatedUserId, rawBearerToken);
  }
}
