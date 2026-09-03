import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse } from '../client.js';

export function registerProductTools(server: McpServer): void {
  // 1. List products with filtering
  server.tool(
    'velour_products_list',
    'List catalog garments with multi-faceted filtering, sorting, and pagination.',
    {
      category: z.enum(['women', 'men']).optional().describe('Filter by parent category'),
      subcategory: z.string().optional().describe('Filter by subcategory (e.g. Outerwear, Knitwear)'),
      sizes: z.string().optional().describe('Comma-separated sizes (e.g. "S,M,L")'),
      colors: z.string().optional().describe('Comma-separated colors (e.g. "Black,Camel")'),
      minPrice: z.number().optional().describe('Minimum price in USD'),
      maxPrice: z.number().optional().describe('Maximum price in USD'),
      inStock: z.boolean().optional().describe('Only show products with active inventory'),
      sort: z.enum(['featured', 'newest', 'price-asc', 'price-desc']).optional().describe('Sorting order'),
      query: z.string().optional().describe('Search keyword in name or description'),
      limit: z.number().default(20).describe('Page size limit (default 20)'),
      page: z.number().default(1).describe('Page number (default 1)'),
    },
    async (params) => {
      const res = await apiRequest('/products', { params });
      return formatToolResponse(res);
    },
  );

  // 2. Get single product by ID/slug
  server.tool(
    'velour_products_get',
    'Get full specifications and imagery for a single product by SKU ID or slug.',
    {
      id: z.string().describe('Product unique SKU ID or slug (e.g. "w-double-breasted-wool-coat")'),
    },
    async ({ id }) => {
      const res = await apiRequest(`/products/${id}`);
      return formatToolResponse(res);
    },
  );

  // 3. Search products
  server.tool(
    'velour_products_search',
    'Full-text search across the VELOUR fashion catalogue.',
    {
      query: z.string().describe('Search query keyword (e.g. "wool", "cashmere coat")'),
      limit: z.number().default(8).describe('Max results to return'),
    },
    async ({ query, limit }) => {
      const res = await apiRequest('/search', { params: { q: query, limit } });
      return formatToolResponse(res);
    },
  );

  // 4. Get catalog facets
  server.tool(
    'velour_products_get_facets',
    'Get available sizing options, color swatches, subcategories, and price boundaries.',
    {
      category: z.enum(['women', 'men']).optional().describe('Optional scope to women or men'),
    },
    async ({ category }) => {
      const res = await apiRequest('/products/facets', { params: { category } });
      return formatToolResponse(res);
    },
  );

  // 5. Get featured products
  server.tool(
    'velour_products_get_featured',
    'Get featured products curated for the homepage showcase.',
    {
      limit: z.number().default(8).describe('Max items to return'),
    },
    async ({ limit }) => {
      const res = await apiRequest('/products/featured', { params: { limit } });
      return formatToolResponse(res);
    },
  );

  // 6. Get new arrivals
  server.tool(
    'velour_products_get_new_arrivals',
    'Get the newest additions to the atelier collection.',
    {
      limit: z.number().default(8).describe('Max items to return'),
    },
    async ({ limit }) => {
      const res = await apiRequest('/products/new-arrivals', { params: { limit } });
      return formatToolResponse(res);
    },
  );

  // 7. Get trending products
  server.tool(
    'velour_products_get_trending',
    'Get currently trending pieces and high-demand silhouettes.',
    {
      limit: z.number().default(8).describe('Max items to return'),
    },
    async ({ limit }) => {
      const res = await apiRequest('/products/trending', { params: { limit } });
      return formatToolResponse(res);
    },
  );

  // 8. Get size guide
  server.tool(
    'velour_products_get_size_guide',
    'Get Atelier sizing measurements, care instructions, and garment specs for a product.',
    {
      id: z.string().describe('Product SKU ID or slug'),
    },
    async ({ id }) => {
      const res = await apiRequest(`/products/${id}/size-guide`);
      return formatToolResponse(res);
    },
  );

  // 9. [Admin] Create product
  server.tool(
    'velour_products_create',
    '[ADMIN] Introduce a new garment piece into the catalogue with initial warehouse stock.',
    {
      name: z.string().describe('Garment display title'),
      category: z.enum(['WOMEN', 'MEN', 'women', 'men']).describe('Parent category'),
      subcategory: z.string().describe('Subcategory (e.g. Outerwear, Knitwear, Tailoring)'),
      price: z.number().positive().describe('Retail price in USD'),
      compareAtPrice: z.number().optional().describe('Original compare-at price'),
      description: z.string().describe('Full garment description and tailoring notes'),
      sizes: z.array(z.string()).default(['XS', 'S', 'M', 'L']).describe('Available size run'),
      colors: z.array(z.string()).optional().describe('Color swatches'),
      materials: z.string().optional().describe('Fabric composition (e.g. "100% Italian Virgin Wool")'),
      careInstructions: z.string().optional().describe('Garment care directions'),
      primaryImageUrl: z.string().url().optional().describe('Primary model photo URL'),
      hoverImageUrl: z.string().url().optional().describe('Secondary hover photo URL'),
      images: z.array(z.string().url()).optional().describe('List of image URLs'),
      tags: z.array(z.string()).optional().describe('Badges and search tags'),
      featured: z.boolean().optional().default(false).describe('Feature on homepage'),
      isNew: z.boolean().optional().default(true).describe('Mark as new arrival'),
      initialStock: z.number().default(30).describe('Initial stock deposit in warehouse'),
    },
    async (body) => {
      const res = await apiRequest('/products', {
        method: 'POST',
        body,
      });
      return formatToolResponse(res);
    },
  );

  // 10. [Admin] Update product
  server.tool(
    'velour_products_update',
    '[ADMIN] Modify pricing, details, stock, or imagery for an existing garment piece.',
    {
      id: z.string().describe('Product unique SKU ID'),
      name: z.string().optional().describe('Updated title'),
      price: z.number().optional().describe('Updated price in USD'),
      compareAtPrice: z.number().optional().describe('Updated compare-at price'),
      description: z.string().optional().describe('Updated description'),
      sizes: z.array(z.string()).optional().describe('Updated sizes'),
      colors: z.array(z.string()).optional().describe('Updated colors'),
      featured: z.boolean().optional().describe('Feature status'),
      isNew: z.boolean().optional().describe('New arrival status'),
      trending: z.boolean().optional().describe('Trending status'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      primaryImageUrl: z.string().url().optional().describe('Updated primary image URL'),
      hoverImageUrl: z.string().url().optional().describe('Updated hover image URL'),
    },
    async ({ id, ...body }) => {
      const res = await apiRequest(`/products/${id}`, {
        method: 'PATCH',
        body,
      });
      return formatToolResponse(res);
    },
  );

  // 11. [Admin] Delete product
  server.tool(
    'velour_products_delete',
    '[ADMIN] Permanently delete a garment piece from the catalogue.',
    {
      id: z.string().describe('Product SKU ID to remove'),
    },
    async ({ id }) => {
      const res = await apiRequest(`/products/${id}`, {
        method: 'DELETE',
      });
      return formatToolResponse(res);
    },
  );
}
