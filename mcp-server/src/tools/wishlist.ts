import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse } from '../client.js';

export function registerWishlistTools(server: McpServer): void {
  // 1. Get saved wishlist
  server.tool(
    'velour_wishlist_get',
    'Get saved pieces in the wishlist for the current authenticated user or guest device.',
    {},
    async () => {
      const res = await apiRequest('/wishlist');
      return formatToolResponse(res);
    },
  );

  // 2. Add product to wishlist
  server.tool(
    'velour_wishlist_add',
    'Save a garment piece to the wishlist.',
    {
      productId: z.string().describe('Product SKU ID to save'),
    },
    async ({ productId }) => {
      const res = await apiRequest('/wishlist/items', {
        method: 'POST',
        body: { productId },
      });
      return formatToolResponse(res);
    },
  );

  // 3. Remove product from wishlist
  server.tool(
    'velour_wishlist_remove',
    'Remove a garment piece from the wishlist.',
    {
      productId: z.string().describe('Product SKU ID to remove'),
    },
    async ({ productId }) => {
      const res = await apiRequest(`/wishlist/items/${productId}`, {
        method: 'DELETE',
      });
      return formatToolResponse(res);
    },
  );

  // 4. Move wishlist item to cart
  server.tool(
    'velour_wishlist_move_to_cart',
    'Move a saved wishlist piece directly into the shopping bag with chosen size.',
    {
      productId: z.string().describe('Product SKU ID'),
      size: z.string().default('M').describe('Garment size'),
    },
    async ({ productId, size }) => {
      const res = await apiRequest(`/wishlist/items/${productId}/move-to-cart`, {
        method: 'POST',
        body: { size },
      });
      return formatToolResponse(res);
    },
  );
}
