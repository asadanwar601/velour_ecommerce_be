import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse, safeSegment } from '../client.js';
import { McpRole } from '../types.js';

export function registerCategoryTools(server: McpServer, role: McpRole = 'all'): void {
  // Public Category Browsing (1)
  if (role === 'public' || role === 'customer' || role === 'all') {
    // 1. List public categories & active subcategories
    server.tool(
      'velour_categories_list',
      'Get active categories (Women, Men) and active subcategories derived from in-stock garments.',
      {
        parent: z.enum(['women', 'men']).optional().describe('Filter by parent gender category'),
      },
      async ({ parent }, extra) => {
        const res = await apiRequest('/categories', {
          params: { parent },
          sessionId: extra.sessionId,
          requiredRole: 'public',
        });
        return formatToolResponse(res);
      },
    );
  }

  // Admin Category Management (2-6)
  if (role === 'admin' || role === 'all') {
    // 2. [Admin] List all registered categories with product counts
    server.tool(
      'velour_categories_admin_list',
      '[ADMIN] List all registered categories with live product count metrics.',
      {},
      async (_args, extra) => {
        const res = await apiRequest('/categories/admin', {
          sessionId: extra.sessionId,
          requiredRole: 'admin',
        });
        return formatToolResponse(res);
      },
    );

    // 3. [Admin] Create a category
    server.tool(
      'velour_categories_create',
      '[ADMIN] Register a new category or subcategory with display name and parent gender.',
      {
        name: z.string().min(1).max(100).describe('Category title (e.g. "Tailoring", "Silk Scarves")'),
        parent: z.enum(['WOMEN', 'MEN', 'women', 'men']).default('WOMEN').describe('Parent category'),
        slug: z.string().max(100).optional().describe('URL slug identifier'),
        description: z.string().max(500).optional().describe('Category description'),
      },
      async (body, extra) => {
        const res = await apiRequest('/categories', {
          method: 'POST',
          body,
          sessionId: extra.sessionId,
          requiredRole: 'admin',
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
        name: z.string().min(1).max(100).describe('Subcategory display name (e.g. "Cashmere Knits")'),
      },
      async ({ parentCategoryId, name }, extra) => {
        const res = await apiRequest(`/categories/${safeSegment(parentCategoryId)}/subcategories`, {
          method: 'POST',
          body: { name },
          sessionId: extra.sessionId,
          requiredRole: 'admin',
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
        subcategoryName: z.string().min(1).max(100).describe('Subcategory name to remove'),
      },
      async ({ parentCategoryId, subcategoryName }, extra) => {
        const res = await apiRequest(
          `/categories/${safeSegment(parentCategoryId)}/subcategories/${safeSegment(subcategoryName)}`,
          {
            method: 'DELETE',
            sessionId: extra.sessionId,
            requiredRole: 'admin',
          },
        );
        return formatToolResponse(res);
      },
    );

    // 6. [Admin] Delete category by ID
    server.tool(
      'velour_categories_delete',
      '[ADMIN] Delete a category by ID (guarded: cannot delete if products are currently assigned).',
      {
        id: z.string().min(1).max(128).describe('Category unique ID'),
      },
      async ({ id }, extra) => {
        const res = await apiRequest(`/categories/${safeSegment(id, ['admin'])}`, {
          method: 'DELETE',
          sessionId: extra.sessionId,
          requiredRole: 'admin',
        });
        return formatToolResponse(res);
      },
    );
  }
}
