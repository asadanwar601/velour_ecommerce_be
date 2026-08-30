import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddCartItemDto } from '../dto/add-cart-item.dto';
import { UpdateCartItemDto } from '../dto/update-cart-item.dto';

@Injectable()
export class CartItemManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveOrCreateCart(userId?: string, deviceId?: string) {
    if (!userId && !deviceId) {
      throw new BadRequestException('Either authentication token or x-device-id header is required');
    }

    if (userId) {
      let userCart = await this.prisma.cart.findUnique({
        where: { userId },
        include: {
          items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
        },
      });

      if (!userCart) {
        userCart = await this.prisma.cart.create({
          data: { userId },
          include: {
            items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
          },
        });
      }
      return userCart;
    }

    let guestCart = await this.prisma.cart.findUnique({
      where: { anonymousId: deviceId },
      include: {
        items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
      },
    });

    if (!guestCart) {
      guestCart = await this.prisma.cart.create({
        data: { anonymousId: deviceId },
        include: {
          items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
        },
      });
    }

    return guestCart;
  }

  async addLineItem(dto: AddCartItemDto, userId?: string, deviceId?: string) {
    const activeCart = await this.resolveOrCreateCart(userId, deviceId || dto.deviceId);

    const productRecord = await this.prisma.product.findFirst({
      where: { OR: [{ id: dto.productId }, { slug: dto.productId }] },
    });

    if (!productRecord) {
      throw new NotFoundException(`Product "${dto.productId}" not found`);
    }

    if (productRecord.sizes && productRecord.sizes.length > 0 && !productRecord.sizes.includes(dto.size)) {
      throw new BadRequestException(
        `Size "${dto.size}" is not valid for product "${productRecord.name}". Available sizes: ${productRecord.sizes.join(', ')}`,
      );
    }

    const quantityToAdd = dto.quantity || 1;

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId_size: {
          cartId: activeCart.id,
          productId: productRecord.id,
          size: dto.size,
        },
      },
    });

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantityToAdd },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: activeCart.id,
          productId: productRecord.id,
          size: dto.size,
          quantity: quantityToAdd,
        },
      });
    }

    return this.resolveOrCreateCart(userId, deviceId || dto.deviceId);
  }

  async updateLineItemQuantity(itemId: string, dto: UpdateCartItemDto, userId?: string, deviceId?: string) {
    const activeCart = await this.resolveOrCreateCart(userId, deviceId);

    const targetItem = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: activeCart.id },
    });

    if (!targetItem) {
      throw new NotFoundException(`Cart item "${itemId}" not found in current cart`);
    }

    if (dto.quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: dto.quantity },
      });
    }

    return this.resolveOrCreateCart(userId, deviceId);
  }

  async removeLineItem(itemId: string, userId?: string, deviceId?: string) {
    const activeCart = await this.resolveOrCreateCart(userId, deviceId);

    const targetItem = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: activeCart.id },
    });

    if (!targetItem) {
      throw new NotFoundException(`Cart item "${itemId}" not found in current cart`);
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.resolveOrCreateCart(userId, deviceId);
  }

  async clearActiveCartItems(userId?: string, deviceId?: string) {
    const activeCart = await this.resolveOrCreateCart(userId, deviceId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: activeCart.id } });
    return this.resolveOrCreateCart(userId, deviceId);
  }
}
