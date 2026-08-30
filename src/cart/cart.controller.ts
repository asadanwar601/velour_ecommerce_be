import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(OptionalJwtAuthGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'x-device-id',
  required: false,
  description: 'Anonymous guest device ID for session tracking',
})
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user or guest shopping cart with drawer metadata and free shipping progress' })
  @ApiQuery({ name: 'coupon', required: false, description: 'Optional promo code to calculate discount' })
  @ApiResponse({ status: 200, description: 'Active shopping cart with line items, drawer cross-sells, and totals' })
  async getCart(
    @CurrentUser() user: CurrentUserData | null,
    @Headers('x-device-id') deviceId?: string,
    @Query('coupon') couponCode?: string,
  ) {
    return this.cartService.getCart(user?.id, deviceId, couponCode);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add product line item to cart (increments quantity if already exists)' })
  @ApiResponse({ status: 200, description: 'Updated shopping cart' })
  @ApiResponse({ status: 400, description: 'Invalid size or quantity' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async addItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() user: CurrentUserData | null,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.cartService.addItem(dto, user?.id, deviceId || dto.deviceId);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart line item quantity (0 removes the item)' })
  @ApiResponse({ status: 200, description: 'Updated shopping cart' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateItem(
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: CurrentUserData | null,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.cartService.updateItem(itemId, dto, user?.id, deviceId);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove an item from cart' })
  @ApiResponse({ status: 200, description: 'Updated shopping cart' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeItem(
    @Param('id') itemId: string,
    @CurrentUser() user: CurrentUserData | null,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.cartService.removeItem(itemId, user?.id, deviceId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from active cart' })
  @ApiResponse({ status: 200, description: 'Cleared empty shopping cart' })
  async clearCart(
    @CurrentUser() user: CurrentUserData | null,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.cartService.clearCart(user?.id, deviceId);
  }
}
