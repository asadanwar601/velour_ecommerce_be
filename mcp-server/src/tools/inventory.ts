import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse } from '../client.js';
import { McpRole } from '../types.js';

export function registerInventoryTools(server: McpServer, role: McpRole = 'all'): void {
  // Inventory operations are strictly for Administrator maintenance
  if (role !== 'admin' && role !== 'all') {
    return;
  }

  // 1. [Admin] Get low stock alerts
  server.tool(
    'velour_inventory_get_low_stock',
    '[ADMIN] Retrieve garments that are at or below their low-stock replenishment threshold.',
    {},
    async () => {
      const res = await apiRequest('/inventory/low-stock');
      return formatToolResponse(res);
    },
  );

  // 2. [Admin] Get product stock by location
  server.tool(
    'velour_inventory_get_product_stock',
    '[ADMIN] View stock breakdown across all warehouses and fulfillment locations for a product.',
    {
      productId: z.string().describe('Product SKU ID'),
    },
    async ({ productId }) => {
      const res = await apiRequest(`/inventory/${productId}`);
      return formatToolResponse(res);
    },
  );

  // 3. [Admin] Adjust stock quantity
  server.tool(
    'velour_inventory_adjust',
    '[ADMIN] Adjust stock quantity at a warehouse location and record an immutable StockMovement audit entry.',
    {
      productId: z.string().describe('Product SKU ID'),
      locationId: z.string().optional().describe('Warehouse location ID (defaults to primary warehouse)'),
      quantityDelta: z.number().int().describe('Change in quantity (positive to restock, negative to deduct)'),
      reason: z.string().describe('Reason for adjustment (e.g. "Restock shipment", "Defective return")'),
    },
    async (body) => {
      const res = await apiRequest('/inventory/adjust', {
        method: 'POST',
        body,
      });
      return formatToolResponse(res);
    },
  );
}
