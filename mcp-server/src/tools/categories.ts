import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse } from '../client.js';

export function registerCategoryTools(server: McpServer): void {
  // 1. List public categories & active subcategories
  server.tool(
    'velour_categories_list',
    'Get active categories (Women, Men) and active subcategories derived from in-stock garments.',
    {
      parent: z.enum(['women', 'men']).optional().describe('Filter by parent gender category'),
    },
    async ({ parent }) => {
      const res = await apiRequest('/categories', { params: { parent } });
      return formatToolResponse(res);
    },
  );

  // 2. [Admin] List all registered categories with product counts
  server.tool(
    'velour_categories_admin_list',
    '[ADMIN] List all registered categories with live product count metrics.',
    {},
    async () => {
      const res = await apiRequest('/categories/admin');
      return formatToolResponse(res);
    },
  );

  // 3. [Admin] Create a category
  server.tool(
    'velour_categories_create',
    '[ADMIN] Register a new category or subcategory with display name and parent gender.',
    {
      name: z.string().describe('Category title (e.g. "Tailoring", "Silk Scarves")'),
      parent: z.enum(['WOMEN', 'MEN', 'women', 'men']).default('WOMEN').describe('Parent category'),
      slug: z.string().optional().describe('URL slug identifier'),
      description: z.string().optional().describe('Category description'),
    },
    async (body) => {
      const res = await apiRequest('/categories', {
        method: 'POST',
        body,
      });
      return formatToolResponse(res);
    },
  );

  // 4. [Admin] Add subcategory
  server.tool(
    'velour_categories_create_subcategory',
    '[ADMIN] Add a subcategory under a parent category (e.g. under "women" or "men").',
    {
      parentCategoryId: z.enum(['women', 'men']).describe('Parent category identifier'),
      name: z.string().describe('Subcategory display name (e.g. "Cashmere Knits")'),
    },
    async ({ parentCategoryId, name }) => {
      const res = await apiRequest(`/categories/${parentCategoryId}/subcategories`, {
        method: 'POST',
        body: { name },
      });
      return formatToolResponse(res);
    },
  );

  // 5. [Admin] Delete subcategory
  server.tool(
    'velour_categories_delete_subcategory',
    '[ADMIN] Remove a subcategory under a parent category.',
    {
      parentCategoryId: z.enum(['women', 'men']).describe('Parent category identifier'),
      subcategoryName: z.string().describe('Subcategory name to remove'),
    },
    async ({ parentCategoryId, subcategoryName }) => {
      const res = await apiRequest(`/categories/${parentCategoryId}/subcategories/${encodeURIComponent(subcategoryName)}`, {
        method: 'DELETE',
      });
      return formatToolResponse(res);
    },
  );

  // 6. [Admin] Delete category by ID
  server.tool(
    'velour_categories_delete',
    '[ADMIN] Delete a category by ID (guarded: cannot delete if products are currently assigned).',
    {
      id: z.string().describe('Category unique ID'),
    },
    async ({ id }) => {
      const res = await apiRequest(`/categories/${id}`, {
        method: 'DELETE',
      });
      return formatToolResponse(res);
    },
  );
}
