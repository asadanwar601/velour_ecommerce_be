import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse, safeSegment } from '../client.js';
import { McpRole } from '../types.js';

const RESERVED_ORDER_SEGMENTS = ['all', 'returns', 'tracking'];

export function registerOrderTools(server: McpServer, role: McpRole = 'all'): void {
  // Customer Orders, Tracking, and Checkout Tools
  if (role === 'customer' || role === 'all') {
    // 1. Process checkout & create order
    server.tool(
      'velour_checkout',
      'Process a checkout transaction, deduct inventory atomically, and create an order.',
      {
        contactName: z.string().min(1).max(120).describe('Recipient full name'),
        contactEmail: z.string().email().max(254).describe('Recipient email address'),
        contactPhone: z.string().max(32).optional().describe('Recipient phone'),
        shippingAddress: z
          .object({
            line1: z.string().min(1).max(200).describe('Street address line 1'),
            line2: z.string().max(200).optional().describe('Apartment, suite, unit'),
            city: z.string().min(1).max(100).describe('City'),
            state: z.string().min(1).max(100).describe('State or province'),
            zip: z.string().min(1).max(32).describe('Postal / ZIP code'),
            country: z.string().min(2).max(64).default('US').describe('Country code'),
          })
          .describe('Delivery destination address'),
        items: z
          .array(
            z.object({
              productId: z.string().min(1).max(128).describe('Product SKU ID'),
              size: z.string().min(1).max(32).describe('Selected size'),
              quantity: z.number().int().min(1).max(50).describe('Quantity'),
              price: z.number().positive().describe('Price in USD'),
            }),
          )
          .min(1)
          .describe('Order line items'),
        promoCode: z.string().max(64).optional().describe('Discount promotional code'),
        giftPackaging: z.boolean().optional().default(false).describe('Atelier signature gift packaging'),
        giftNote: z.string().max(500).optional().describe('Custom gift note message'),
      },
      async (body, extra) => {
        const res = await apiRequest('/checkout', {
          method: 'POST',
          body,
          sessionId: extra.sessionId,
          requiredRole: 'customer',
        });
        return formatToolResponse(res);
      },
    );

    // 2. List user orders
    server.tool(
      'velour_orders_list',
      'Get order history for the currently authenticated user.',
      {},
      async (_args, extra) => {
        const res = await apiRequest('/orders', {
          sessionId: extra.sessionId,
          requiredRole: 'customer',
        });
        return formatToolResponse(res);
      },
    );

    // 3. Get single order details
    server.tool(
      'velour_orders_get',
      'Get detailed information for an order by its ID or order number.',
      {
        orderId: z.string().min(1).max(128).describe('Order ID or order number (e.g. "VEL-88219")'),
      },
      async ({ orderId }, extra) => {
        const res = await apiRequest(`/orders/${safeSegment(orderId, RESERVED_ORDER_SEGMENTS)}`, {
          sessionId: extra.sessionId,
          requiredRole: 'customer',
        });
        return formatToolResponse(res);
      },
    );

    // 4. Live shipment tracking
    server.tool(
      'velour_orders_track',
      'Track shipment timeline progress, active transit milestone, carrier, and ETA.',
      {
        orderId: z.string().min(1).max(128).describe('Order ID or order number to track'),
      },
      async ({ orderId }, extra) => {
        const res = await apiRequest(`/orders/tracking/${safeSegment(orderId, RESERVED_ORDER_SEGMENTS)}`, {
          sessionId: extra.sessionId,
          requiredRole: 'customer',
        });
        return formatToolResponse(res);
      },
    );

    // 5. Cancel order
    server.tool(
      'velour_orders_cancel',
      'Cancel an order before dispatch and automatically restock inventory.',
      {
        orderId: z.string().min(1).max(128).describe('Order ID to cancel'),
        reason: z.string().max(500).optional().describe('Reason for cancellation'),
      },
      async ({ orderId, reason }, extra) => {
        const res = await apiRequest(`/orders/${safeSegment(orderId, RESERVED_ORDER_SEGMENTS)}/cancel`, {
          method: 'POST',
          body: { reason },
          sessionId: extra.sessionId,
          requiredRole: 'customer',
        });
        return formatToolResponse(res);
      },
    );

    // 6. Initiate return request
    server.tool(
      'velour_orders_create_return',
      'Initiate a return request for items in an order.',
      {
        orderId: z.string().min(1).max(128).describe('Order ID'),
        reason: z.string().min(1).max(500).describe('Reason for returning item'),
        items: z
          .array(
            z.object({
              orderItemId: z.string().min(1).max(128).describe('ID of the line item to return'),
              quantity: z.number().int().min(1).describe('Quantity returning'),
            }),
          )
          .min(1)
          .describe('List of items returning'),
      },
      async ({ orderId, ...body }, extra) => {
        const res = await apiRequest(`/orders/${safeSegment(orderId, RESERVED_ORDER_SEGMENTS)}/returns`, {
          method: 'POST',
          body,
          sessionId: extra.sessionId,
          requiredRole: 'customer',
        });
        return formatToolResponse(res);
      },
    );
  }

  // Admin Order Management Tools
  if (role === 'admin' || role === 'all') {
    // 7. [Admin] List all orders
    server.tool(
      'velour_orders_admin_list_all',
      '[ADMIN] Paginated overview of all customer orders across the platform with status filtering.',
      {
        status: z
          .enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
          .optional()
          .describe('Filter by order status'),
        limit: z.number().int().min(1).max(100).default(20).describe('Page size'),
        page: z.number().int().min(1).default(1).describe('Page number'),
      },
      async (params, extra) => {
        const res = await apiRequest('/orders/all', {
          params,
          sessionId: extra.sessionId,
          requiredRole: 'admin',
        });
        return formatToolResponse(res);
      },
    );

    // 8. [Admin] Update order status
    server.tool(
      'velour_orders_admin_update_status',
      '[ADMIN] Update the fulfillment status of an order (e.g. mark as SHIPPED, DELIVERED).',
      {
        orderId: z.string().min(1).max(128).describe('Order ID to update'),
        status: z
          .enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
          .describe('New status'),
      },
      async ({ orderId, status }, extra) => {
        const res = await apiRequest(`/orders/${safeSegment(orderId, RESERVED_ORDER_SEGMENTS)}/status`, {
          method: 'PATCH',
          body: { status },
          sessionId: extra.sessionId,
          requiredRole: 'admin',
        });
        return formatToolResponse(res);
      },
    );

    // 9. [Admin] List all returns
    server.tool(
      'velour_orders_admin_list_returns',
      '[ADMIN] List all return and exchange requests across all customers.',
      {
        status: z
          .enum(['PENDING', 'APPROVED', 'RECEIVED', 'REFUNDED', 'REJECTED'])
          .optional()
          .describe('Filter return status'),
      },
      async (params, extra) => {
        const res = await apiRequest('/orders/returns/all', {
          params,
          sessionId: extra.sessionId,
          requiredRole: 'admin',
        });
        return formatToolResponse(res);
      },
    );
  }
}
