import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { SignupDto } from '../dto/signup.dto';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthCredentialService {
  private readonly logger = new Logger(AuthCredentialService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerCustomerAccount(signupDto: SignupDto) {
    const sanitizedEmail = signupDto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existingUser) {
      throw new ConflictException(`An account with email "${sanitizedEmail}" already exists`);
    }

    const saltRounds = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(signupDto.password, saltRounds);

    const createdCustomerUser = await this.prisma.user.create({
      data: {
        email: sanitizedEmail,
        password: hashedPassword,
        firstName: signupDto.firstName?.trim() || null,
        lastName: signupDto.lastName?.trim() || null,
        phone: signupDto.phone?.trim() || null,
        role: Role.CUSTOMER,
        isEmailVerified: false,
        isActive: true,
      },
    });

    return createdCustomerUser;
  }

  async validatePasswordCredentials(loginDto: LoginDto) {
    const sanitizedEmail = loginDto.email.trim().toLowerCase();

    const matchedUser = await this.prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (!matchedUser) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!matchedUser.password) {
      throw new BadRequestException(
        'This account was registered via Google OAuth or OTP. Please log in using Google or OTP.',
      );
    }

    const isPasswordMatching = await bcrypt.compare(loginDto.password, matchedUser.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return matchedUser;
  }

  formatUserProfileResponse(userEntity: any) {
    return {
      id: userEntity.id,
      email: userEntity.email,
      phone: userEntity.phone,
      firstName: userEntity.firstName,
      lastName: userEntity.lastName,
      avatarUrl: userEntity.avatarUrl || null,
      role: userEntity.role,
      isAdmin: userEntity.role === Role.ADMIN,
      isCustomer: userEntity.role === Role.CUSTOMER,
      isEmailVerified: !!userEntity.isEmailVerified,
      isActive: userEntity.isActive !== false,
      birthday: userEntity.birthday
        ? userEntity.birthday.toISOString
          ? userEntity.birthday.toISOString()
          : userEntity.birthday
        : null,
      preferences: userEntity.preferences || null,
      twoFactorEnabled: !!userEntity.twoFactorEnabled,
      createdAt: userEntity.createdAt
        ? userEntity.createdAt.toISOString
          ? userEntity.createdAt.toISOString()
          : userEntity.createdAt
        : null,
      addresses: userEntity.addresses || undefined,
    };
  }
}
