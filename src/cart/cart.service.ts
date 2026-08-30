import { Injectable } from '@nestjs/common';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItemManagementService } from './services/cart-item-management.service';
import { CartPricingService } from './services/cart-pricing.service';

@Injectable()
export class CartService {
  constructor(
    private readonly cartItemManagementService: CartItemManagementService,
    private readonly cartPricingService: CartPricingService,
  ) {}

  async getOrCreateCart(userId?: string, deviceId?: string) {
    return this.cartItemManagementService.resolveOrCreateCart(userId, deviceId);
  }

  async getCart(userId?: string, deviceId?: string, couponCode?: string) {
    const cart = await this.cartItemManagementService.resolveOrCreateCart(userId, deviceId);
    return this.cartPricingService.formatCartResponse(cart, couponCode);
  }

  async addItem(dto: AddCartItemDto, userId?: string, deviceId?: string) {
    const updatedCart = await this.cartItemManagementService.addLineItem(dto, userId, deviceId);
    return this.cartPricingService.formatCartResponse(updatedCart);
  }

  async updateItem(itemId: string, dto: UpdateCartItemDto, userId?: string, deviceId?: string) {
    const updatedCart = await this.cartItemManagementService.updateLineItemQuantity(itemId, dto, userId, deviceId);
    return this.cartPricingService.formatCartResponse(updatedCart);
  }

  async removeItem(itemId: string, userId?: string, deviceId?: string) {
    const updatedCart = await this.cartItemManagementService.removeLineItem(itemId, userId, deviceId);
    return this.cartPricingService.formatCartResponse(updatedCart);
  }

  async clearCart(userId?: string, deviceId?: string) {
    const clearedCart = await this.cartItemManagementService.clearActiveCartItems(userId, deviceId);
    return this.cartPricingService.formatCartResponse(clearedCart);
  }
}
