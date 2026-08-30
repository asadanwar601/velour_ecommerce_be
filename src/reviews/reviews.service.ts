import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FitRating } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all reviews for a product with comprehensive rating breakdown & fit statistics.
   */
  async getProductReviews(productIdOrSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: productIdOrSlug }, { slug: productIdOrSlug }] },
    });

    if (!product) {
      throw new NotFoundException(`Product "${productIdOrSlug}" not found`);
    }

    const reviews = await this.prisma.review.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const totalReviews = reviews.length;
    let totalRatingSum = 0;
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const fitCounts: Record<FitRating, number> = {
      [FitRating.RUNS_SMALL]: 0,
      [FitRating.TRUE_TO_SIZE]: 0,
      [FitRating.RUNS_LARGE]: 0,
    };

    for (const r of reviews) {
      totalRatingSum += r.rating;
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
      fitCounts[r.fitRating] = (fitCounts[r.fitRating] || 0) + 1;
    }

    const averageRating = totalReviews > 0 ? Math.round((totalRatingSum / totalReviews) * 10) / 10 : 0;

    const ratingPercentages: Record<number, number> = {};
    for (let star = 1; star <= 5; star++) {
      ratingPercentages[star] = totalReviews > 0
        ? Math.round((ratingDistribution[star] / totalReviews) * 100)
        : 0;
    }

    const fitDistribution = {
      runsSmall: totalReviews > 0 ? Math.round((fitCounts[FitRating.RUNS_SMALL] / totalReviews) * 100) : 0,
      trueToSize: totalReviews > 0 ? Math.round((fitCounts[FitRating.TRUE_TO_SIZE] / totalReviews) * 100) : 100,
      runsLarge: totalReviews > 0 ? Math.round((fitCounts[FitRating.RUNS_LARGE] / totalReviews) * 100) : 0,
    };

    return {
      productId: product.id,
      summary: {
        averageRating,
        totalReviews,
        ratingDistribution,
        ratingPercentages,
        fitDistribution,
      },
      reviews: reviews.map((r) => ({
        id: r.id,
        userName: r.userName || (r.user ? `${r.user.firstName || ''} ${(r.user.lastName || '').charAt(0)}.`.trim() : 'Verified Guest'),
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        fitRating: r.fitRating,
        isVerifiedPurchase: r.isVerifiedPurchase,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Submit a new customer review. Automatically marks as verified purchase if user ordered the item.
   */
  async createReview(dto: CreateReviewDto, userId?: string) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: dto.productId }, { slug: dto.productId }] },
    });

    if (!product) {
      throw new NotFoundException(`Product "${dto.productId}" not found`);
    }

    let isVerifiedPurchase = false;
    let userName = dto.userName?.trim() || 'Velour Client';
    let userEmail: string | null = null;

    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        userEmail = user.email;
        if (user.firstName || user.lastName) {
          userName = `${user.firstName || ''} ${(user.lastName || '').charAt(0)}.`.trim();
        }

        // Check if user has an order containing this item
        const matchingOrder = await this.prisma.order.findFirst({
          where: {
            userId,
            items: { some: { productId: product.id } },
            status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
          },
        });

        if (matchingOrder) {
          isVerifiedPurchase = true;
        }
      }
    }

    const review = await this.prisma.review.create({
      data: {
        productId: product.id,
        userId: userId || null,
        userName,
        userEmail,
        rating: dto.rating,
        title: dto.title?.trim() || null,
        comment: dto.comment.trim(),
        fitRating: dto.fitRating || FitRating.TRUE_TO_SIZE,
        isVerifiedPurchase,
      },
    });

    return {
      message: 'Review submitted successfully',
      review: {
        id: review.id,
        productId: review.productId,
        userName: review.userName,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        fitRating: review.fitRating,
        isVerifiedPurchase: review.isVerifiedPurchase,
        createdAt: review.createdAt.toISOString(),
      },
    };
  }
}
