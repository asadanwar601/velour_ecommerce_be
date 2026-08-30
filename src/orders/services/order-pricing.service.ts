import { Injectable, BadRequestException } from '@nestjs/common';
import { DiscountType, Coupon, Prisma } from '@prisma/client';

export interface CalculatedOrderTotals {
  calculatedSubtotal: number;
  calculatedDiscount: number;
  calculatedShipping: number;
  appliedPromoCode: string | null;
  calculatedTotal: number;
}

@Injectable()
export class OrderPricingService {
  /**
   * Calculate subtotal from cart items.
   */
  calculateCartSubtotal(cartItems: Array<{ product: { price: Prisma.Decimal | number }; quantity: number }>): number {
    const rawSubtotal = cartItems.reduce(
      (runningTotal, cartItem) => runningTotal + Number(cartItem.product.price) * cartItem.quantity,
      0,
    );
    return Math.round(rawSubtotal * 100) / 100;
  }

  /**
   * Validate coupon and calculate discount amount.
   */
  evaluateCouponDiscount(
    couponRecord: Coupon | null,
    orderSubtotal: number,
  ): { calculatedDiscount: number; validatedPromoCode: string | null } {
    if (!couponRecord || !couponRecord.isActive) {
      return { calculatedDiscount: 0, validatedPromoCode: null };
    }

    const currentTimestamp = new Date();
    const isDateValid =
      (!couponRecord.validFrom || currentTimestamp >= couponRecord.validFrom) &&
      (!couponRecord.validUntil || currentTimestamp <= couponRecord.validUntil);
    const isUsageValid = !couponRecord.usageLimit || couponRecord.usageCount < couponRecord.usageLimit;
    const minimumRequiredOrderValue = couponRecord.minOrderValue ? Number(couponRecord.minOrderValue) : 0;

    if (!isDateValid || !isUsageValid || orderSubtotal < minimumRequiredOrderValue) {
      return { calculatedDiscount: 0, validatedPromoCode: null };
    }

    let calculatedDiscount = 0;
    const discountFaceValue = Number(couponRecord.discountValue);

    if (couponRecord.discountType === DiscountType.PERCENTAGE) {
      calculatedDiscount = (orderSubtotal * discountFaceValue) / 100;
      if (couponRecord.maxDiscount) {
        calculatedDiscount = Math.min(calculatedDiscount, Number(couponRecord.maxDiscount));
      }
    } else {
      calculatedDiscount = Math.min(discountFaceValue, orderSubtotal);
    }

    return {
      calculatedDiscount: Math.round(calculatedDiscount * 100) / 100,
      validatedPromoCode: couponRecord.code,
    };
  }

  /**
   * Determine final shipping and optional gift fee.
   */
  computeShippingAndFees(
    orderSubtotal: number,
    calculatedDiscount: number,
    explicitShippingCost?: number,
    isGiftPackagingRequested?: boolean,
  ): { calculatedShipping: number; calculatedGiftFee: number } {
    const netOrderAmount = orderSubtotal - calculatedDiscount;
    const calculatedShipping =
      explicitShippingCost !== undefined
        ? explicitShippingCost
        : netOrderAmount >= 75 || orderSubtotal >= 75
        ? 0
        : 15.0;

    const calculatedGiftFee = isGiftPackagingRequested ? 10.0 : 0.0;
    return { calculatedShipping, calculatedGiftFee };
  }
}
