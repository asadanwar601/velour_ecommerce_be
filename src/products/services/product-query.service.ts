import { Injectable, NotFoundException } from '@nestjs/common';
import { ParentCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductFilterDto } from '../dto/product-filter.dto';
import { serializeProduct, serializeProducts, SerializedProduct } from '../product.serializer';

@Injectable()
export class ProductQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllProducts(filterCriteria: ProductFilterDto) {
    const whereClause: Prisma.ProductWhereInput = {};

    if (filterCriteria.category) {
      const normalizedCategory = filterCriteria.category.toUpperCase();
      if (normalizedCategory === 'WOMEN' || normalizedCategory === 'MEN') {
        whereClause.category = normalizedCategory as ParentCategory;
      }
    }

    if (filterCriteria.subcategory && filterCriteria.subcategory.toLowerCase() !== 'all') {
      whereClause.subcategory = { equals: filterCriteria.subcategory, mode: 'insensitive' };
    }

    if (filterCriteria.sizes && filterCriteria.sizes.trim() !== '') {
      const targetSizes = filterCriteria.sizes.split(',').map((size) => size.trim().toUpperCase());
      whereClause.sizes = { hasSome: targetSizes };
    }

    if (filterCriteria.colors && filterCriteria.colors.trim() !== '') {
      const targetColors = filterCriteria.colors.split(',').map((color) => color.trim());
      whereClause.colors = { hasSome: targetColors };
    }

    if (filterCriteria.minPrice !== undefined || filterCriteria.maxPrice !== undefined) {
      whereClause.price = {};
      if (filterCriteria.minPrice !== undefined) whereClause.price.gte = filterCriteria.minPrice;
      if (filterCriteria.maxPrice !== undefined) whereClause.price.lte = filterCriteria.maxPrice;
    }

    if (filterCriteria.inStock) {
      whereClause.inventoryItems = { some: { quantity: { gt: 0 } } };
    }

    if (filterCriteria.query && filterCriteria.query.trim() !== '') {
      const sanitizedSearchQuery = filterCriteria.query.trim();
      whereClause.OR = [
        { name: { contains: sanitizedSearchQuery, mode: 'insensitive' } },
        { description: { contains: sanitizedSearchQuery, mode: 'insensitive' } },
        { subcategory: { contains: sanitizedSearchQuery, mode: 'insensitive' } },
      ];
    }

    let orderConditions: Prisma.ProductOrderByWithRelationInput[] = [];
    switch (filterCriteria.sort) {
      case 'price-asc':
        orderConditions = [{ price: 'asc' }];
        break;
      case 'price-desc':
        orderConditions = [{ price: 'desc' }];
        break;
      case 'newest':
        orderConditions = [{ isNew: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'featured':
      default:
        orderConditions = [{ featured: 'desc' }, { createdAt: 'desc' }];
        break;
    }

    const currentPage = filterCriteria.page || 1;
    const pageItemLimit = filterCriteria.limit || 20;
    const skipOffset = (currentPage - 1) * pageItemLimit;

    const [totalProductCount, retrievedProducts] = await Promise.all([
      this.prisma.product.count({ where: whereClause }),
      this.prisma.product.findMany({
        where: whereClause,
        orderBy: orderConditions,
        include: { reviews: { select: { rating: true } } },
        skip: skipOffset,
        take: pageItemLimit,
      }),
    ]);

    return {
      data: serializeProducts(retrievedProducts),
      meta: {
        total: totalProductCount,
        page: currentPage,
        limit: pageItemLimit,
        totalPages: Math.ceil(totalProductCount / pageItemLimit),
      },
    };
  }

  async getCatalogFacets(categoryScope?: string) {
    const whereClause: Prisma.ProductWhereInput = {};
    if (categoryScope) {
      const normalizedCategory = categoryScope.toUpperCase();
      if (normalizedCategory === 'WOMEN' || normalizedCategory === 'MEN') {
        whereClause.category = normalizedCategory as ParentCategory;
      }
    }

    const matchedProducts = await this.prisma.product.findMany({
      where: whereClause,
      select: { sizes: true, colors: true, price: true, subcategory: true },
    });

    const uniqueSizes = new Set<string>();
    const uniqueColors = new Set<string>();
    const uniqueSubcategories = new Set<string>();
    let minimumPrice = Infinity;
    let maximumPrice = 0;

    for (const productRecord of matchedProducts) {
      (productRecord.sizes || []).forEach((size) => uniqueSizes.add(size));
      (productRecord.colors || []).forEach((color) => uniqueColors.add(color));
      if (productRecord.subcategory) uniqueSubcategories.add(productRecord.subcategory);
      const numericalPrice = Number(productRecord.price);
      if (numericalPrice < minimumPrice) minimumPrice = numericalPrice;
      if (numericalPrice > maximumPrice) maximumPrice = numericalPrice;
    }

    const standardSizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '30', '32', '34', '36'];
    const sortedSizes = Array.from(uniqueSizes).sort((a, b) => {
      const indexA = standardSizeOrder.indexOf(a);
      const indexB = standardSizeOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    return {
      sizes: sortedSizes.length > 0 ? sortedSizes : ['XS', 'S', 'M', 'L', 'XL'],
      colors: Array.from(uniqueColors).sort(),
      subcategories: Array.from(uniqueSubcategories).sort(),
      priceRange: {
        min: minimumPrice === Infinity ? 0 : minimumPrice,
        max: maximumPrice === 0 ? 500 : maximumPrice,
      },
    };
  }

  async findProductByIdOrSlug(idOrSlug: string): Promise<SerializedProduct> {
    const productRecord = await this.prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { reviews: { select: { rating: true } } },
    });

    if (!productRecord) {
      throw new NotFoundException(`Product not found with id or slug "${idOrSlug}"`);
    }

    return serializeProduct(productRecord);
  }

  async findBatchProducts(productIdentifiers: string[]): Promise<SerializedProduct[]> {
    if (!productIdentifiers || productIdentifiers.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { OR: [{ id: { in: productIdentifiers } }, { slug: { in: productIdentifiers } }] },
      include: { reviews: { select: { rating: true } } },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));
    const orderedProducts: any[] = [];
    for (const identifier of productIdentifiers) {
      const match = productMap.get(identifier) || products.find((product) => product.slug === identifier);
      if (match && !orderedProducts.some((item) => item.id === match.id)) {
        orderedProducts.push(match);
      }
    }

    return serializeProducts(orderedProducts);
  }

  async findCuratedSection(flag: 'featured' | 'newArrivals' | 'trending', resultLimit = 8): Promise<SerializedProduct[]> {
    const whereClause: Prisma.ProductWhereInput = {};
    if (flag === 'featured') whereClause.featured = true;
    if (flag === 'newArrivals') whereClause.isNew = true;
    if (flag === 'trending') whereClause.trending = true;

    const products = await this.prisma.product.findMany({
      where: whereClause,
      include: { reviews: { select: { rating: true } } },
      orderBy: { createdAt: 'desc' },
      take: resultLimit,
    });

    return serializeProducts(products);
  }

  async searchProducts(searchQuery: string, resultLimit = 8): Promise<SerializedProduct[]> {
    if (!searchQuery?.trim()) return [];
    const sanitizedQuery = searchQuery.trim();
    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: sanitizedQuery, mode: 'insensitive' } },
          { subcategory: { contains: sanitizedQuery, mode: 'insensitive' } },
          { description: { contains: sanitizedQuery, mode: 'insensitive' } },
        ],
      },
      include: { reviews: { select: { rating: true } } },
      take: resultLimit,
    });

    return serializeProducts(products);
  }
}
