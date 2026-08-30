import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt.guard';
import { OtpModule } from '../otp/otp.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthCredentialService } from './services/auth-credential.service';
import { AuthOAuthService } from './services/auth-oauth.service';
import { AuthSessionService } from './services/auth-session.service';
import { AuthMfaService } from './services/auth-mfa.service';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'velour_super_secure_jwt_secret_key_2026_fashion_lux'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    OtpModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthCredentialService,
    AuthOAuthService,
    AuthSessionService,
    AuthMfaService,
    JwtStrategy,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [
    AuthService,
    AuthCredentialService,
    AuthOAuthService,
    AuthSessionService,
    AuthMfaService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
