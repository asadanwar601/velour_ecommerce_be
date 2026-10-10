import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse } from '../client.js';
import { McpRole } from '../types.js';

export function registerCartTools(server: McpServer, role: McpRole = 'all'): void {
  // Cart operations are available for logged-in Customers
  if (role !== 'customer' && role !== 'all') {
    return;
  }

  // 1. Get active cart
  server.tool(
    'velour_cart_get',
    'Retrieve the active shopping bag with line items, free shipping threshold status, and totals.',
    {
      coupon: z.string().optional().describe('Optional promo coupon code to preview discount'),
    },
    async ({ coupon }) => {
      const res = await apiRequest('/cart', { params: { coupon } });
      return formatToolResponse(res);
    },
  );

  // 2. Add item to cart
  server.tool(
    'velour_cart_add_item',
    'Add a garment piece to the active shopping bag (increments quantity if already present).',
    {
      productId: z.string().describe('Product SKU ID (e.g. "w-double-breasted-wool-coat")'),
      size: z.string().describe('Selected size (e.g. "S", "M", "L")'),
      quantity: z.number().int().min(1).default(1).describe('Quantity to add'),
    },
    async (body) => {
      const res = await apiRequest('/cart/items', {
        method: 'POST',
        body,
      });
      return formatToolResponse(res);
    },
  );

  // 3. Update cart item quantity
  server.tool(
    'velour_cart_update_item',
    'Update the quantity of an item in the cart (setting quantity to 0 removes it).',
    {
      itemId: z.string().describe('Cart item ID'),
      quantity: z.number().int().min(0).describe('New quantity'),
    },
    async ({ itemId, quantity }) => {
      const res = await apiRequest(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: { quantity },
      });
      return formatToolResponse(res);
    },
  );

  // 4. Remove item from cart
  server.tool(
    'velour_cart_remove_item',
    'Remove a specific item line from the shopping bag.',
    {
      itemId: z.string().describe('Cart item ID to remove'),
    },
    async ({ itemId }) => {
      const res = await apiRequest(`/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      return formatToolResponse(res);
    },
  );

  // 5. Clear cart
  server.tool(
    'velour_cart_clear',
    'Clear all items and reset the active shopping bag.',
    {},
    async () => {
      const res = await apiRequest('/cart', {
        method: 'DELETE',
      });
      return formatToolResponse(res);
    },
  );
}
