import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

@Injectable()
export class AccountProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: { orderBy: { isDefault: 'desc' } },
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { product: true } } },
        },
        _count: {
          select: { orders: true, reviews: true, returns: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      birthday: user.birthday?.toISOString() || null,
      preferences: user.preferences,
      twoFactorEnabled: user.twoFactorEnabled,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      addresses: user.addresses,
      recentOrders: user.orders,
      stats: {
        ordersCount: user._count.orders,
        reviewsCount: user._count.reviews,
        returnsCount: user._count.returns,
      },
    };
  }

  async updateCustomerProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName?.trim() || null }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName?.trim() || null }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
        ...(dto.birthday !== undefined && { birthday: dto.birthday ? new Date(dto.birthday) : null }),
        ...(dto.preferences !== undefined && { preferences: dto.preferences as any }),
      },
    });
  }

  async changeCustomerPassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.password) {
      throw new BadRequestException('Account does not have a password set. Registered via Google OAuth or OTP.');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Current password does not match');
    }

    const salt = await bcrypt.genSalt(12);
    const newHashed = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHashed },
    });

    return { message: 'Password updated successfully' };
  }

  async getSecurityOverview(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        password: true,
        googleId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      twoFactorEnabled: user.twoFactorEnabled,
      hasPassword: !!user.password,
      hasGoogleLinked: !!user.googleId,
      memberSince: user.createdAt.toISOString(),
      lastSecurityUpdate: user.updatedAt.toISOString(),
    };
  }

  async toggleTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: !user.twoFactorEnabled },
    });

    return {
      twoFactorEnabled: updated.twoFactorEnabled,
      message: updated.twoFactorEnabled ? '2FA enabled successfully' : '2FA disabled',
    };
  }

  async invalidateAllUserSessions(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
    return { message: 'All active sessions invalidated' };
  }
}
