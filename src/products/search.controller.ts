import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Global text search across products (name, description, subcategory)' })
  @ApiQuery({ name: 'q', required: true, type: String, example: 'cashmere' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 8 })
  @ApiResponse({ status: 200, description: 'List of matching products' })
  async search(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.productsService.search(query, limit ? Number(limit) : 8);
  }
}
