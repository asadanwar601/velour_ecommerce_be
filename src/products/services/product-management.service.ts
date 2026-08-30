import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { LocationType, Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { serializeProduct, SerializedProduct } from '../product.serializer';

@Injectable()
export class ProductManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async createProduct(createProductDto: CreateProductDto): Promise<SerializedProduct> {
    const productSlug = createProductDto.id
      ? createProductDto.id.toLowerCase()
      : createProductDto.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

    const existingProduct = await this.prisma.product.findFirst({
      where: { OR: [{ id: productSlug }, { slug: productSlug }] },
    });

    if (existingProduct) {
      throw new ConflictException(`Product with slug/id "${productSlug}" already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          id: productSlug,
          slug: productSlug,
          name: createProductDto.name,
          category: createProductDto.category,
          subcategory: createProductDto.subcategory,
          price: createProductDto.price,
          compareAtPrice: createProductDto.compareAtPrice || null,
          description: createProductDto.description,
          sizes: createProductDto.sizes,
          colors: createProductDto.colors || ['Black', 'Sand', 'Ivory'],
          materials: createProductDto.materials || '100% Premium Natural Fibers',
          careInstructions: createProductDto.careInstructions || 'Dry clean recommended.',
          sizeGuide: createProductDto.sizeGuide || null,
          primaryImageUrl: createProductDto.primaryImageUrl,
          hoverImageUrl: createProductDto.hoverImageUrl || createProductDto.primaryImageUrl,
          galleryImages: createProductDto.galleryImages || [],
          tags: createProductDto.tags || [],
          featured: createProductDto.featured || false,
          isNew: createProductDto.isNew || false,
          trending: createProductDto.trending || false,
        },
      });

      let warehouse = await tx.location.findFirst({
        where: { type: LocationType.WAREHOUSE },
      });

      if (!warehouse) {
        warehouse = await tx.location.create({
          data: {
            name: 'Velour Central Warehouse',
            type: LocationType.WAREHOUSE,
          },
        });
      }

      const initialStockQuantity = createProductDto.initialStock || 50;
      await tx.inventoryItem.create({
        data: {
          productId: createdProduct.id,
          locationId: warehouse.id,
          quantity: initialStockQuantity,
          lowStockThreshold: 5,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: createdProduct.id,
          locationId: warehouse.id,
          type: StockMovementType.RESTOCK,
          quantity: initialStockQuantity,
          reason: 'Initial product creation restock',
        },
      });

      return serializeProduct(createdProduct);
    });
  }

  async updateProduct(productId: string, updateProductDto: UpdateProductDto): Promise<SerializedProduct> {
    const existingProduct = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) {
      throw new NotFoundException(`Product not found with id "${productId}"`);
    }

    const updatePayload: Prisma.ProductUpdateInput = {};
    if (updateProductDto.name) updatePayload.name = updateProductDto.name;
    if (updateProductDto.category) updatePayload.category = updateProductDto.category;
    if (updateProductDto.subcategory) updatePayload.subcategory = updateProductDto.subcategory;
    if (updateProductDto.price !== undefined) updatePayload.price = updateProductDto.price;
    if (updateProductDto.compareAtPrice !== undefined) updatePayload.compareAtPrice = updateProductDto.compareAtPrice;
    if (updateProductDto.description) updatePayload.description = updateProductDto.description;
    if (updateProductDto.sizes) updatePayload.sizes = updateProductDto.sizes;
    if (updateProductDto.colors) updatePayload.colors = updateProductDto.colors;
    if (updateProductDto.materials) updatePayload.materials = updateProductDto.materials;
    if (updateProductDto.careInstructions) updatePayload.careInstructions = updateProductDto.careInstructions;
    if (updateProductDto.sizeGuide !== undefined) updatePayload.sizeGuide = updateProductDto.sizeGuide;
    if (updateProductDto.primaryImageUrl) updatePayload.primaryImageUrl = updateProductDto.primaryImageUrl;
    if (updateProductDto.hoverImageUrl) updatePayload.hoverImageUrl = updateProductDto.hoverImageUrl;
    if (updateProductDto.galleryImages) updatePayload.galleryImages = updateProductDto.galleryImages;
    if (updateProductDto.tags) updatePayload.tags = updateProductDto.tags;
    if (updateProductDto.featured !== undefined) updatePayload.featured = updateProductDto.featured;
    if (updateProductDto.isNew !== undefined) updatePayload.isNew = updateProductDto.isNew;
    if (updateProductDto.trending !== undefined) updatePayload.trending = updateProductDto.trending;

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: updatePayload,
    });

    return serializeProduct(updatedProduct);
  }

  async addProductImage(productId: string, imageSourceUrl: string, imageSlotType = 'gallery'): Promise<SerializedProduct> {
    const existingProduct = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) {
      throw new NotFoundException(`Product not found with id "${productId}"`);
    }

    const updatePayload: Prisma.ProductUpdateInput = {};
    if (imageSlotType === 'primary') {
      updatePayload.primaryImageUrl = imageSourceUrl;
    } else if (imageSlotType === 'hover') {
      updatePayload.hoverImageUrl = imageSourceUrl;
    } else {
      const activeGalleryImages = existingProduct.galleryImages || [];
      if (!activeGalleryImages.includes(imageSourceUrl)) {
        updatePayload.galleryImages = [...activeGalleryImages, imageSourceUrl];
      }
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: updatePayload,
    });

    return serializeProduct(updatedProduct);
  }

  async deleteProductImage(productId: string, targetImageUrl: string): Promise<SerializedProduct> {
    const existingProduct = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) {
      throw new NotFoundException(`Product not found with id "${productId}"`);
    }

    const filteredGalleryImages = (existingProduct.galleryImages || []).filter((img) => img !== targetImageUrl);
    const updatePayload: Prisma.ProductUpdateInput = { galleryImages: filteredGalleryImages };

    if (existingProduct.primaryImageUrl === targetImageUrl) {
      updatePayload.primaryImageUrl = existingProduct.hoverImageUrl || filteredGalleryImages[0] || 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3';
    }

    if (existingProduct.hoverImageUrl === targetImageUrl) {
      updatePayload.hoverImageUrl = (updatePayload.primaryImageUrl as string) || existingProduct.primaryImageUrl;
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: updatePayload,
    });

    return serializeProduct(updatedProduct);
  }

  async deleteProduct(productId: string): Promise<{ success: boolean; message: string }> {
    const existingProduct = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) {
      throw new NotFoundException(`Product not found with id "${productId}"`);
    }

    await this.prisma.product.delete({ where: { id: productId } });
    return { success: true, message: `Product "${existingProduct.name}" (${productId}) deleted successfully` };
  }
}
