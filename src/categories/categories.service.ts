import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ParentCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

// Curated order matching the frontend's CATEGORIES configuration
const CURATED_SUBCATEGORIES: Record<ParentCategory, string[]> = {
  [ParentCategory.WOMEN]: [
    'Outerwear',
    'Dresses',
    'Knitwear',
    'Tops & Shirts',
    'Trousers',
    'Tailoring',
  ],
  [ParentCategory.MEN]: [
    'Outerwear',
    'Tailoring',
    'Knitwear',
    'Shirts',
    'Trousers & Denim',
    'Basics',
  ],
};

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns active subcategories that have at least one product in stock/catalogue for the given parent category.
   * Preserves curated brand ordering, followed by any custom subcategories alphabetically.
   * Mirrors frontend's `subcategoriesFor(category)` helper.
   */
  async findSubcategoriesForParent(parentStr: string): Promise<string[]> {
    const parentUpper = parentStr.toUpperCase();
    if (parentUpper !== 'WOMEN' && parentUpper !== 'MEN') {
      throw new BadRequestException('parent query parameter must be "women" or "men"');
    }

    const parent = parentUpper as ParentCategory;

    // Find all distinct subcategories for products in this parent category
    const products = await this.prisma.product.findMany({
      where: { category: parent },
      select: { subcategory: true },
      distinct: ['subcategory'],
    });

    const activeSubcatSet = new Set(products.map((p) => p.subcategory));
    const curatedList = CURATED_SUBCATEGORIES[parent] || [];

    // Filter curated list to only those with active products
    const activeCurated = curatedList.filter((sub) => activeSubcatSet.has(sub));

    // Append any additional active subcategories not in the curated list
    const remainingActive = Array.from(activeSubcatSet)
      .filter((sub) => !curatedList.includes(sub))
      .sort();

    return [...activeCurated, ...remainingActive];
  }

  /**
   * Return all defined categories and active subcategories grouped by parent.
   */
  async findAllGrouped() {
    const [womenSubs, menSubs] = await Promise.all([
      this.findSubcategoriesForParent('women'),
      this.findSubcategoriesForParent('men'),
    ]);

    return [
      {
        id: 'women',
        name: 'Women',
        subcategories: womenSubs,
      },
      {
        id: 'men',
        name: 'Men',
        subcategories: menSubs,
      },
    ];
  }

  // ─── ADMIN CRUD OPERATIONS ──────────────────────────────────────────

  /**
   * Admin: List all registered categories with product counts.
   */
  async findAllAdmin() {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ parent: 'asc' }, { name: 'asc' }],
    });

    // Compute live product counts for each category/subcategory
    const results = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await this.prisma.product.count({
          where: {
            category: cat.parent,
            subcategory: cat.name,
          },
        });

        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          parent: cat.parent,
          description: cat.description,
          imageUrl: cat.imageUrl,
          isActive: cat.isActive,
          productCount,
          createdAt: cat.createdAt.toISOString(),
          updatedAt: cat.updatedAt.toISOString(),
        };
      }),
    );

    return results;
  }

  /**
   * Admin: Create a new category / subcategory.
   */
  async createCategory(dto: CreateCategoryDto) {
    const slug = dto.slug
      ? dto.slug.trim().toLowerCase()
      : `${dto.parent.toLowerCase()}-${dto.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

    const existing = await this.prisma.category.findFirst({
      where: {
        OR: [{ slug }, { name: dto.name.trim(), parent: dto.parent }],
      },
    });

    if (existing) {
      throw new ConflictException(`Category "${dto.name}" (${dto.parent}) or slug "${slug}" already exists`);
    }

    const created = await this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug,
        parent: dto.parent,
        description: dto.description?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    return {
      message: `Category "${created.name}" created successfully`,
      category: created,
    };
  }

  /**
   * Admin: Update an existing category / subcategory.
   */
  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Category "${id}" not found`);
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.slug !== undefined) data.slug = dto.slug.trim().toLowerCase();
    if (dto.parent !== undefined) data.parent = dto.parent;
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl?.trim() || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    // If name or parent updated, optionally update existing products matching the old category name
    const updated = await this.prisma.category.update({
      where: { id },
      data,
    });

    if (dto.name && dto.name.trim() !== existing.name) {
      await this.prisma.product.updateMany({
        where: {
          category: existing.parent,
          subcategory: existing.name,
        },
        data: { subcategory: dto.name.trim() },
      });
    }

    return {
      message: `Category "${updated.name}" updated successfully`,
      category: updated,
    };
  }

  /**
   * Admin: Delete category / subcategory.
   */
  async deleteCategory(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Category "${id}" not found`);
    }

    const productCount = await this.prisma.product.count({
      where: {
        category: existing.parent,
        subcategory: existing.name,
      },
    });

    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete category "${existing.name}". It is currently assigned to ${productCount} active products. Please reassign products first.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });

    return {
      message: `Category "${existing.name}" deleted successfully`,
    };
  }
}
