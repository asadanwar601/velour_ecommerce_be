import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../jwt.strategy';

@Injectable()
export class AuthSessionService {
  private readonly logger = new Logger(AuthSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  generateAccessToken(userId: string, email: string, role: Role): string {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
      isAdmin: role === Role.ADMIN,
    };
    return this.jwtService.sign(payload);
  }

  async createRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
    return token;
  }

  async rotateRefreshToken(refreshTokenString: string) {
    if (!refreshTokenString) {
      throw new BadRequestException('Refresh token is required');
    }

    const savedTokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenString },
      include: { user: true },
    });

    if (!savedTokenRecord || savedTokenRecord.revoked || savedTokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid, expired, or has been revoked');
    }

    await this.prisma.refreshToken.update({
      where: { id: savedTokenRecord.id },
      data: { revoked: true },
    });

    const newAccessToken = this.generateAccessToken(
      savedTokenRecord.user.id,
      savedTokenRecord.user.email,
      savedTokenRecord.user.role,
    );
    const newRefreshToken = await this.createRefreshToken(savedTokenRecord.user.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: savedTokenRecord.user,
    };
  }

  async terminateActiveSession(authenticatedUserId?: string, rawBearerToken?: string) {
    if (rawBearerToken) {
      try {
        await this.prisma.blacklistedToken.upsert({
          where: { token: rawBearerToken },
          update: {},
          create: {
            token: rawBearerToken,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      } catch (err: any) {
        this.logger.warn(`Could not blacklist token: ${err.message}`);
      }
    }

    if (authenticatedUserId) {
      try {
        await this.prisma.refreshToken.updateMany({
          where: { userId: authenticatedUserId, revoked: false },
          data: { revoked: true },
        });
      } catch (err: any) {
        this.logger.warn(`Could not revoke refresh tokens: ${err.message}`);
      }
    }

    return { message: 'Successfully signed out from VELOUR Atelier session.' };
  }

  async mergeAnonymousCart(customerUserId: string, deviceIdentifier: string) {
    try {
      const guestCart = await this.prisma.cart.findUnique({
        where: { anonymousId: deviceIdentifier },
        include: { items: true },
      });

      if (!guestCart || !guestCart.items || guestCart.items.length === 0) return;

      let userCart = await this.prisma.cart.findUnique({
        where: { userId: customerUserId },
      });

      if (!userCart) {
        userCart = await this.prisma.cart.create({
          data: { userId: customerUserId },
        });
      }

      for (const item of guestCart.items) {
        const existingCartItem = await this.prisma.cartItem.findUnique({
          where: {
            cartId_productId_size: {
              cartId: userCart.id,
              productId: item.productId,
              size: item.size,
            },
          },
        });

        if (existingCartItem) {
          await this.prisma.cartItem.update({
            where: { id: existingCartItem.id },
            data: { quantity: existingCartItem.quantity + item.quantity },
          });
        } else {
          await this.prisma.cartItem.create({
            data: {
              cartId: userCart.id,
              productId: item.productId,
              size: item.size,
              quantity: item.quantity,
            },
          });
        }
      }

      await this.prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
      await this.prisma.cart.delete({ where: { id: guestCart.id } });
    } catch (err) {
      this.logger.error('Failed to merge guest cart into user account', err);
    }
  }
}
