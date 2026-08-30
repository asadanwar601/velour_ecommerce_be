import { Product as PrismaProduct, ParentCategory } from '@prisma/client';

/**
 * ============================================================================
 * FRONTEND INTEGRATION CONTRACT SERIALIZER
 * ============================================================================
 * Mirrors the Next.js frontend's `Product` interface from `lib/types.ts`.
 * Ensures 100% binary compatibility with existing frontend components:
 * - `images` as a tuple `[primaryImageUrl, hoverImageUrl]`
 * - `category` as lowercase `'women' | 'men'`
 * - `price` and `compareAtPrice` formatted as numeric values (not Decimal objects)
 * - `colors`, `materials`, `careInstructions`, `sizeGuide` for Atelier specifications
 * ============================================================================
 */

export interface SerializedProduct {
  id: string;
  name: string;
  category: 'women' | 'men';
  subcategory: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  sizes: string[];
  colors?: string[];
  materials?: string;
  careInstructions?: string;
  sizeGuide?: any;
  primaryImageUrl: string;
  hoverImageUrl: string;
  galleryImages: string[];
  tags: string[];
  images: [string, string];
  featured: boolean;
  isNew: boolean;
  trending: boolean;
  rating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export function serializeProduct(product: PrismaProduct & { reviews?: any[] }): SerializedProduct {
  let rating: number | undefined;
  let reviewCount: number | undefined;

  if (product.reviews && Array.isArray(product.reviews)) {
    reviewCount = product.reviews.length;
    if (reviewCount > 0) {
      const sum = product.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
      rating = Math.round((sum / reviewCount) * 10) / 10;
    } else {
      rating = 5.0; // Default curated aesthetic baseline
    }
  }

  return {
    id: product.id,
    name: product.name,
    category: product.category === ParentCategory.WOMEN ? 'women' : 'men',
    subcategory: product.subcategory,
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice !== null && product.compareAtPrice !== undefined
      ? Number(product.compareAtPrice)
      : undefined,
    description: product.description,
    sizes: product.sizes,
    colors: product.colors || [],
    materials: product.materials || undefined,
    careInstructions: product.careInstructions || undefined,
    sizeGuide: product.sizeGuide || undefined,
    primaryImageUrl: product.primaryImageUrl,
    hoverImageUrl: product.hoverImageUrl || product.primaryImageUrl,
    galleryImages: product.galleryImages || [],
    tags: product.tags || [],
    images: [product.primaryImageUrl, product.hoverImageUrl || product.primaryImageUrl],
    featured: product.featured,
    isNew: product.isNew,
    trending: product.trending,
    rating,
    reviewCount,
    createdAt: product.createdAt?.toISOString(),
    updatedAt: product.updatedAt?.toISOString(),
  };
}

export function serializeProducts(products: (PrismaProduct & { reviews?: any[] })[]): SerializedProduct[] {
  return products.map(serializeProduct);
}
