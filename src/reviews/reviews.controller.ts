import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all reviews and rating breakdown for a product' })
  @ApiResponse({ status: 200, description: 'Product reviews and summary statistics' })
  async getProductReviews(@Param('productId') productId: string) {
    return this.reviewsService.getProductReviews(productId);
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a product rating & fit review' })
  @ApiResponse({ status: 201, description: 'Review created' })
  async createReview(
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: CurrentUserData | null,
  ) {
    return this.reviewsService.createReview(dto, user?.id);
  }
}
