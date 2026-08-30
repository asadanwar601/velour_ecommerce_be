import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProductsService } from './products.service';
import { ProductFilterDto } from './dto/product-filter.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BatchProductsDto } from './dto/batch-products.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'List products with multi-faceted filters (category, subcategory, sizes, colors, price, inStock, sorting, query)',
  })
  @ApiResponse({ status: 200, description: 'Filtered products list with pagination metadata' })
  async findAll(@Query() filter: ProductFilterDto) {
    return this.productsService.findAll(filter);
  }

  @Get('facets')
  @ApiOperation({ summary: 'Get catalogue faceted metadata (available sizes, colors, subcategories, price range)' })
  @ApiQuery({ name: 'category', required: false, enum: ['women', 'men'] })
  @ApiResponse({ status: 200, description: 'Facet options summary' })
  async getFacets(@Query('category') category?: string) {
    return this.productsService.getFacets(category);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products for homepage showcase' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 8 })
  @ApiResponse({ status: 200, description: 'List of featured products' })
  async getFeatured(@Query('limit') limit?: number) {
    return this.productsService.findFeatured(limit ? Number(limit) : 8);
  }

  @Get('new-arrivals')
  @ApiOperation({ summary: 'Get new arrival products' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 8 })
  @ApiResponse({ status: 200, description: 'List of new arrival products' })
  async getNewArrivals(@Query('limit') limit?: number) {
    return this.productsService.findNewArrivals(limit ? Number(limit) : 8);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending products' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 8 })
  @ApiResponse({ status: 200, description: 'List of trending products' })
  async getTrending(@Query('limit') limit?: number) {
    return this.productsService.findTrending(limit ? Number(limit) : 8);
  }

  @Get('recently-viewed')
  @ApiOperation({ summary: 'Get products by comma-separated IDs list for recently viewed items carousel' })
  @ApiQuery({ name: 'ids', required: true, example: 'w-double-breasted-wool-coat,m-unstructured-wool-blazer' })
  @ApiResponse({ status: 200, description: 'List of recently viewed products' })
  async getRecentlyViewed(@Query('ids') idsString: string) {
    const ids = (idsString || '').split(',').map((s) => s.trim()).filter(Boolean);
    return this.productsService.getBatchByIds(ids);
  }

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch retrieve products by IDs array' })
  @ApiResponse({ status: 200, description: 'List of matching products' })
  async getBatch(@Body() dto: BatchProductsDto) {
    return this.productsService.getBatchByIds(dto.ids);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products by text query' })
  @ApiQuery({ name: 'q', required: true, type: String, example: 'wool' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 8 })
  @ApiResponse({ status: 200, description: 'Search matching products' })
  async search(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.productsService.search(query, limit ? Number(limit) : 8);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single product by unique ID or slug' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Get(':id/size-guide')
  @ApiOperation({ summary: 'Get Atelier sizing chart, measurements specifications & care guide' })
  @ApiResponse({ status: 200, description: 'Product size chart measurements' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getSizeGuide(@Param('id') id: string) {
    return this.productsService.getSizeGuide(id);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related products in same category/subcategory' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 4 })
  @ApiResponse({ status: 200, description: 'List of related products' })
  async getRelated(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.productsService.findRelated(id, limit ? Number(limit) : 4);
  }

  // ─── ADMIN ENDPOINTS ────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[ADMIN] Create a new product with initial inventory' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required' })
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Update an existing product (sizes, colors, tags, materials, images, stock)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Add an image to product (gallery, primary, or hover)' })
  @ApiResponse({ status: 200, description: 'Image added to product' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async addImage(
    @Param('id') id: string,
    @Body() dto: { imageUrl: string; type?: 'gallery' | 'primary' | 'hover' },
  ) {
    return this.productsService.addImage(id, dto.imageUrl, dto.type || 'gallery');
  }

  @Delete(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Remove an image from product gallery or images' })
  @ApiResponse({ status: 200, description: 'Image removed from product' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async deleteImage(
    @Param('id') id: string,
    @Body() dto: { imageUrl: string },
  ) {
    return this.productsService.deleteImage(id, dto.imageUrl);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Delete a product' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }
}
