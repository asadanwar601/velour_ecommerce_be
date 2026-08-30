import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';
import { AddWishlistItemDto, MoveToCartDto } from './dto/add-wishlist-item.dto';

@ApiTags('Wishlist')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-device-id', required: false, description: 'Anonymous guest device ID' })
  @ApiOperation({ summary: 'Get current user or guest saved wishlist' })
  @ApiResponse({ status: 200, description: 'User wishlist items' })
  async getWishlist(
    @CurrentUser() user: CurrentUserData | null,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.wishlistService.getWishlist(user?.id, deviceId);
  }

  @Post('items')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-device-id', required: false, description: 'Anonymous guest device ID' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add product to wishlist (heart save)' })
  @ApiResponse({ status: 200, description: 'Updated wishlist' })
  async addItem(
    @Body() dto: AddWishlistItemDto,
    @CurrentUser() user: CurrentUserData | null,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.wishlistService.addItem(dto, user?.id, deviceId);
  }

  @Delete('items/:productId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-device-id', required: false, description: 'Anonymous guest device ID' })
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiResponse({ status: 200, description: 'Updated wishlist' })
  async removeItem(
    @Param('productId') productId: string,
    @CurrentUser() user: CurrentUserData | null,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.wishlistService.removeItem(productId, user?.id, deviceId);
  }

  @Post('items/:productId/move-to-cart')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-device-id', required: false, description: 'Anonymous guest device ID' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move saved item directly to shopping bag' })
  @ApiResponse({ status: 200, description: 'Item moved to cart' })
  async moveToCart(
    @Param('productId') productId: string,
    @Body() dto: MoveToCartDto,
    @CurrentUser() user: CurrentUserData | null,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.wishlistService.moveToCart(productId, dto, user?.id, deviceId);
  }
}
