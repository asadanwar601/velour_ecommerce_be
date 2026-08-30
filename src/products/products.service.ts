import { Injectable, NotFoundException } from '@nestjs/common';
import { ParentCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductFilterDto } from './dto/product-filter.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SerializedProduct, serializeProducts } from './product.serializer';
import { ProductQueryService } from './services/product-query.service';
import { ProductManagementService } from './services/product-management.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productQueryService: ProductQueryService,
    private readonly productManagementService: ProductManagementService,
  ) {}

  async findAll(filterCriteria: ProductFilterDto) {
    return this.productQueryService.findAllProducts(filterCriteria);
  }

  async getFacets(categoryScope?: string) {
    return this.productQueryService.getCatalogFacets(categoryScope);
  }

  async findById(idOrSlug: string): Promise<SerializedProduct> {
    return this.productQueryService.findProductByIdOrSlug(idOrSlug);
  }

  async getSizeGuide(idOrSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });

    if (!product) {
      throw new NotFoundException(`Product not found with id "${idOrSlug}"`);
    }

    const defaultGuide = {
      unit: 'inches',
      measurements: [
        { size: 'XS', chest: '34-36', waist: '28-30', hips: '35-37', length: '28.5' },
        { size: 'S', chest: '36-38', waist: '30-32', hips: '37-39', length: '29.0' },
        { size: 'M', chest: '38-40', waist: '32-34', hips: '39-41', length: '29.5' },
        { size: 'L', chest: '40-42', waist: '34-36', hips: '41-43', length: '30.0' },
        { size: 'XL', chest: '42-44', waist: '36-38', hips: '43-45', length: '30.5' },
      ],
      modelSpecs:
        product.category === ParentCategory.WOMEN
          ? 'Model is 5\'10" (178cm) wearing size S'
          : 'Model is 6\'2" (188cm) wearing size M',
      fitDescription: 'Tailored regular silhouette designed to drape cleanly over base layers.',
      careInstructions: product.careInstructions || 'Dry clean only. Store on shaped wooden hanger.',
      materials: product.materials || '100% Organic Natural Fibers',
    };

    return {
      productId: product.id,
      name: product.name,
      sizes: product.sizes,
      sizeGuide: (product.sizeGuide as any) || defaultGuide,
    };
  }

  async getBatchByIds(productIdentifiers: string[]): Promise<SerializedProduct[]> {
    return this.productQueryService.findBatchProducts(productIdentifiers);
  }

  async findFeatured(resultLimit = 8): Promise<SerializedProduct[]> {
    return this.productQueryService.findCuratedSection('featured', resultLimit);
  }

  async findNewArrivals(resultLimit = 8): Promise<SerializedProduct[]> {
    return this.productQueryService.findCuratedSection('newArrivals', resultLimit);
  }

  async findTrending(resultLimit = 8): Promise<SerializedProduct[]> {
    return this.productQueryService.findCuratedSection('trending', resultLimit);
  }

  async findRelated(idOrSlug: string, resultLimit = 4): Promise<SerializedProduct[]> {
    const currentProduct = await this.prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });

    if (!currentProduct) {
      const fallbackProducts = await this.prisma.product.findMany({
        take: resultLimit,
        include: { reviews: { select: { rating: true } } },
      });
      return serializeProducts(fallbackProducts);
    }

    const sameSubcategory = await this.prisma.product.findMany({
      where: {
        id: { not: currentProduct.id },
        category: currentProduct.category,
        subcategory: currentProduct.subcategory,
      },
      include: { reviews: { select: { rating: true } } },
      take: resultLimit,
    });

    if (sameSubcategory.length >= resultLimit) {
      return serializeProducts(sameSubcategory);
    }

    const remainingCount = resultLimit - sameSubcategory.length;
    const sameCategory = await this.prisma.product.findMany({
      where: {
        id: { notIn: [currentProduct.id, ...sameSubcategory.map((p) => p.id)] },
        category: currentProduct.category,
      },
      include: { reviews: { select: { rating: true } } },
      take: remainingCount,
    });

    return serializeProducts([...sameSubcategory, ...sameCategory]);
  }

  async search(searchQuery: string, resultLimit = 8): Promise<SerializedProduct[]> {
    return this.productQueryService.searchProducts(searchQuery, resultLimit);
  }

  async create(createProductDto: CreateProductDto): Promise<SerializedProduct> {
    return this.productManagementService.createProduct(createProductDto);
  }

  async update(productId: string, updateProductDto: UpdateProductDto): Promise<SerializedProduct> {
    return this.productManagementService.updateProduct(productId, updateProductDto);
  }

  async addImage(productId: string, imageSourceUrl: string, imageSlotType = 'gallery'): Promise<SerializedProduct> {
    return this.productManagementService.addProductImage(productId, imageSourceUrl, imageSlotType);
  }

  async deleteImage(productId: string, targetImageUrl: string): Promise<SerializedProduct> {
    return this.productManagementService.deleteProductImage(productId, targetImageUrl);
  }

  async delete(productId: string): Promise<{ success: boolean; message: string }> {
    return this.productManagementService.deleteProduct(productId);
  }
}
