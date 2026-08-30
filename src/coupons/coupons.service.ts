import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { DiscountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate a promo code against current cart subtotal and return discount calculations.
   */
  async validate(dto: ValidateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      throw new NotFoundException(`Promo code "${code}" is invalid`);
    }

    if (!coupon.isActive) {
      throw new BadRequestException(`Promo code "${code}" is no longer active`);
    }

    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      throw new BadRequestException(`Promo code "${code}" is not yet active`);
    }

    if (coupon.validUntil && now > coupon.validUntil) {
      throw new BadRequestException(`Promo code "${code}" has expired`);
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException(`Promo code "${code}" has reached its maximum redemption limit`);
    }

    const minOrder = coupon.minOrderValue ? Number(coupon.minOrderValue) : 0;
    if (dto.subtotal < minOrder) {
      throw new BadRequestException(
        `Promo code "${code}" requires a minimum order subtotal of $${minOrder.toFixed(2)} (current: $${dto.subtotal.toFixed(2)})`,
      );
    }

    // Calculate discount
    let discountAmount = 0;
    const discountVal = Number(coupon.discountValue);

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (dto.subtotal * discountVal) / 100;
      if (coupon.maxDiscount) {
        const maxDisc = Number(coupon.maxDiscount);
        discountAmount = Math.min(discountAmount, maxDisc);
      }
    } else {
      // Fixed amount discount
      discountAmount = Math.min(discountVal, dto.subtotal);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const discountedSubtotal = Math.max(0, Math.round((dto.subtotal - discountAmount) * 100) / 100);

    return {
      isValid: true,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: discountVal,
      discountAmount,
      subtotal: dto.subtotal,
      discountedSubtotal,
    };
  }

  /**
   * List active public promotions or all coupons for Admin.
   */
  async findAll(isAdmin: boolean = false) {
    if (isAdmin) {
      return this.prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      select: {
        code: true,
        description: true,
        discountType: true,
        discountValue: true,
        minOrderValue: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Admin: Create a new promotion.
   */
  async create(dto: CreateCouponDto) {
    const code = dto.code.trim().toUpperCase();

    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException(`Promo code "${code}" already exists`);
    }

    return this.prisma.coupon.create({
      data: {
        code,
        description: dto.description?.trim() || null,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderValue: dto.minOrderValue !== undefined ? dto.minOrderValue : null,
        maxDiscount: dto.maxDiscount !== undefined ? dto.maxDiscount : null,
        validUntil: dto.validUntil || null,
        usageLimit: dto.usageLimit || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }
}
