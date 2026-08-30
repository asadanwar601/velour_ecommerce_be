import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { AddWishlistItemDto, MoveToCartDto } from './dto/add-wishlist-item.dto';
import { serializeProduct } from '../products/product.serializer';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  /**
   * Resolve or create active wishlist for user or guest device.
   */
  async getOrCreateWishlist(userId?: string, deviceId?: string) {
    if (!userId && !deviceId) {
      throw new BadRequestException('Either authentication token or x-device-id header is required');
    }

    if (userId) {
      let wishlist = await this.prisma.wishlist.findUnique({
        where: { userId },
        include: {
          items: {
            include: { product: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!wishlist) {
        wishlist = await this.prisma.wishlist.create({
          data: { userId },
          include: {
            items: {
              include: { product: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        });
      }
      return wishlist;
    }

    // Guest wishlist
    let wishlist = await this.prisma.wishlist.findUnique({
      where: { anonymousId: deviceId },
      include: {
        items: {
          include: { product: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
        data: { anonymousId: deviceId },
        include: {
          items: {
            include: { product: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    return wishlist;
  }

  /**
   * Get formatted wishlist.
   */
  async getWishlist(userId?: string, deviceId?: string) {
    const wishlist = await this.getOrCreateWishlist(userId, deviceId);
    return this.formatWishlist(wishlist);
  }

  /**
   * Add a product to wishlist.
   */
  async addItem(dto: AddWishlistItemDto, userId?: string, deviceId?: string) {
    const activeDeviceId = deviceId || dto.deviceId;
    const wishlist = await this.getOrCreateWishlist(userId, activeDeviceId);

    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: dto.productId }, { slug: dto.productId }] },
    });

    if (!product) {
      throw new NotFoundException(`Product "${dto.productId}" not found`);
    }

    const existing = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId: product.id,
        },
      },
    });

    if (!existing) {
      await this.prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId: product.id,
        },
      });
    }

    return this.getWishlist(userId, activeDeviceId);
  }

  /**
   * Remove a product from wishlist.
   */
  async removeItem(productId: string, userId?: string, deviceId?: string) {
    const wishlist = await this.getOrCreateWishlist(userId, deviceId);

    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: productId }, { slug: productId }] },
    });

    if (product) {
      await this.prisma.wishlistItem.deleteMany({
        where: {
          wishlistId: wishlist.id,
          productId: product.id,
        },
      });
    }

    return this.getWishlist(userId, deviceId);
  }

  /**
   * Move item from wishlist to shopping cart.
   */
  async moveToCart(productId: string, dto: MoveToCartDto, userId?: string, deviceId?: string) {
    const activeDeviceId = deviceId || dto.deviceId;
    const wishlist = await this.getOrCreateWishlist(userId, activeDeviceId);

    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: productId }, { slug: productId }] },
    });

    if (!product) {
      throw new NotFoundException(`Product "${productId}" not found`);
    }

    const selectedSize = dto.size || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'One Size');

    // Add to cart
    await this.cartService.addItem(
      {
        productId: product.id,
        size: selectedSize,
        quantity: 1,
        deviceId: activeDeviceId,
      },
      userId,
      activeDeviceId,
    );

    // Remove from wishlist
    await this.prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
        productId: product.id,
      },
    });

    const updatedWishlist = await this.getWishlist(userId, activeDeviceId);
    const updatedCart = await this.cartService.getCart(userId, activeDeviceId);

    return {
      message: `"${product.name}" moved to bag successfully`,
      wishlist: updatedWishlist,
      cart: updatedCart,
    };
  }

  /**
   * Format raw wishlist for API response.
   */
  private formatWishlist(wishlist: any) {
    const items = (wishlist.items || []).map((item: any) => ({
      id: item.id,
      productId: item.productId,
      product: serializeProduct(item.product),
      createdAt: item.createdAt?.toISOString(),
    }));

    return {
      id: wishlist.id,
      itemCount: items.length,
      items,
    };
  }
}
