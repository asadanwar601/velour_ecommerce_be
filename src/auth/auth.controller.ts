import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { OtpRequestDto } from './dto/otp-request.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate or register customer with Google OAuth / ID Token' })
  @ApiResponse({ status: 200, description: 'Google authentication successful, returns JWT and user profile' })
  @ApiResponse({ status: 400, description: 'Invalid Google credential token' })
  async googleLogin(@Body() dto: GoogleAuthDto) {
    return this.authService.googleLogin(dto);
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new customer account with email and password' })
  @ApiResponse({ status: 201, description: 'User account created and JWT access token issued' })
  @ApiResponse({ status: 409, description: 'Email address already in use' })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // Max 10 attempts per minute to prevent brute-force
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT access token' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Rate limit OTP dispatches to 5 per minute
  @ApiOperation({ summary: 'Request a 6-digit OTP verification code via Email or WhatsApp' })
  @ApiResponse({ status: 200, description: 'OTP dispatched successfully' })
  async requestOtp(@Body() dto: OtpRequestDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code and authenticate / create passwordless account' })
  @ApiResponse({ status: 200, description: 'OTP verified, returns JWT access token' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP code' })
  async verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve currently authenticated user profile and saved addresses' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized / invalid token' })
  async getMe(@CurrentUser() user: CurrentUserData) {
    return this.authService.getMe(user.id);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh JWT access token using a valid refresh token' })
  @ApiResponse({ status: 200, description: 'New access token and rotated refresh token' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body?.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out active user session and blacklist token' })
  @ApiResponse({ status: 200, description: 'User logged out successfully' })
  async logout(
    @Headers('authorization') authHeader?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const rawToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    return this.authService.logout(user?.id, rawToken);
  }
}
