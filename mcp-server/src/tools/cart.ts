import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse, safeSegment } from '../client.js';
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
      coupon: z.string().max(64).optional().describe('Optional promo coupon code to preview discount'),
    },
    async ({ coupon }, extra) => {
      const res = await apiRequest('/cart', {
        params: { coupon },
        sessionId: extra.sessionId,
        requiredRole: 'customer',
      });
      return formatToolResponse(res);
    },
  );

  // 2. Add item to cart
  server.tool(
    'velour_cart_add_item',
    'Add a garment piece to the active shopping bag (increments quantity if already present).',
    {
      productId: z.string().min(1).max(128).describe('Product SKU ID (e.g. "w-double-breasted-wool-coat")'),
      size: z.string().min(1).max(32).describe('Selected size (e.g. "S", "M", "L")'),
      quantity: z.number().int().min(1).max(50).default(1).describe('Quantity to add'),
    },
    async (body, extra) => {
      const res = await apiRequest('/cart/items', {
        method: 'POST',
        body,
        sessionId: extra.sessionId,
        requiredRole: 'customer',
      });
      return formatToolResponse(res);
    },
  );

  // 3. Update cart item quantity
  server.tool(
    'velour_cart_update_item',
    'Update the quantity of an item in the cart (setting quantity to 0 removes it).',
    {
      itemId: z.string().min(1).max(128).describe('Cart item ID'),
      quantity: z.number().int().min(0).max(50).describe('New quantity'),
    },
    async ({ itemId, quantity }, extra) => {
      const res = await apiRequest(`/cart/items/${safeSegment(itemId)}`, {
        method: 'PATCH',
        body: { quantity },
        sessionId: extra.sessionId,
        requiredRole: 'customer',
      });
      return formatToolResponse(res);
    },
  );

  // 4. Remove item from cart
  server.tool(
    'velour_cart_remove_item',
    'Remove a specific item line from the shopping bag.',
    {
      itemId: z.string().min(1).max(128).describe('Cart item ID to remove'),
    },
    async ({ itemId }, extra) => {
      const res = await apiRequest(`/cart/items/${safeSegment(itemId)}`, {
        method: 'DELETE',
        sessionId: extra.sessionId,
        requiredRole: 'customer',
      });
      return formatToolResponse(res);
    },
  );

  // 5. Clear cart
  server.tool(
    'velour_cart_clear',
    'Clear all items and reset the active shopping bag.',
    {},
    async (_args, extra) => {
      const res = await apiRequest('/cart', {
        method: 'DELETE',
        sessionId: extra.sessionId,
        requiredRole: 'customer',
      });
      return formatToolResponse(res);
    },
  );
}
