import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse } from '../client.js';
import { McpRole } from '../types.js';

export function registerOrderTools(server: McpServer, role: McpRole = 'all'): void {
  // Customer Orders, Tracking, and Checkout Tools
  if (role === 'customer' || role === 'all') {
    // 1. Process checkout & create order
    server.tool(
      'velour_checkout',
      'Process a checkout transaction, deduct inventory atomically, and create an order.',
      {
        contactName: z.string().describe('Recipient full name'),
        contactEmail: z.string().email().describe('Recipient email address'),
        contactPhone: z.string().optional().describe('Recipient phone'),
        shippingAddress: z.object({
          line1: z.string().describe('Street address line 1'),
          line2: z.string().optional().describe('Apartment, suite, unit'),
          city: z.string().describe('City'),
          state: z.string().describe('State or province'),
          zip: z.string().describe('Postal / ZIP code'),
          country: z.string().default('US').describe('Country code'),
        }).describe('Delivery destination address'),
        items: z.array(z.object({
          productId: z.string().describe('Product SKU ID'),
          size: z.string().describe('Selected size'),
          quantity: z.number().int().min(1).describe('Quantity'),
          price: z.number().positive().describe('Price in USD'),
        })).describe('Order line items'),
        promoCode: z.string().optional().describe('Discount promotional code'),
        giftPackaging: z.boolean().optional().default(false).describe('Atelier signature gift packaging'),
        giftNote: z.string().optional().describe('Custom gift note message'),
      },
      async (body) => {
        const res = await apiRequest('/checkout', {
          method: 'POST',
          body,
        });
        return formatToolResponse(res);
      },
    );

    // 2. List user orders
    server.tool(
      'velour_orders_list',
      'Get order history for the currently authenticated user.',
      {},
      async () => {
        const res = await apiRequest('/orders');
        return formatToolResponse(res);
      },
    );

    // 3. Get single order details
    server.tool(
      'velour_orders_get',
      'Get detailed information for an order by its ID or order number.',
      {
        orderId: z.string().describe('Order ID or order number (e.g. "VEL-88219")'),
      },
      async ({ orderId }) => {
        const res = await apiRequest(`/orders/${orderId}`);
        return formatToolResponse(res);
      },
    );

    // 4. Live shipment tracking
    server.tool(
      'velour_orders_track',
      'Track shipment timeline progress, active transit milestone, carrier, and ETA.',
      {
        orderId: z.string().describe('Order ID or order number to track'),
      },
      async ({ orderId }) => {
        const res = await apiRequest(`/orders/tracking/${orderId}`);
        return formatToolResponse(res);
      },
    );

    // 5. Cancel order
    server.tool(
      'velour_orders_cancel',
      'Cancel an order before dispatch and automatically restock inventory.',
      {
        orderId: z.string().describe('Order ID to cancel'),
        reason: z.string().optional().describe('Reason for cancellation'),
      },
      async ({ orderId, reason }) => {
        const res = await apiRequest(`/orders/${orderId}/cancel`, {
          method: 'POST',
          body: { reason },
        });
        return formatToolResponse(res);
      },
    );

    // 6. Initiate return request
    server.tool(
      'velour_orders_create_return',
      'Initiate a return request for items in an order.',
      {
        orderId: z.string().describe('Order ID'),
        reason: z.string().describe('Reason for returning item'),
        items: z.array(z.object({
          orderItemId: z.string().describe('ID of the line item to return'),
          quantity: z.number().int().min(1).describe('Quantity returning'),
        })).describe('List of items returning'),
      },
      async ({ orderId, ...body }) => {
        const res = await apiRequest(`/orders/${orderId}/returns`, {
          method: 'POST',
          body,
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
        status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional().describe('Filter by order status'),
        limit: z.number().default(20).describe('Page size'),
        page: z.number().default(1).describe('Page number'),
      },
      async (params) => {
        const res = await apiRequest('/orders/all', { params });
        return formatToolResponse(res);
      },
    );

    // 8. [Admin] Update order status
    server.tool(
      'velour_orders_admin_update_status',
      '[ADMIN] Update the fulfillment status of an order (e.g. mark as SHIPPED, DELIVERED).',
      {
        orderId: z.string().describe('Order ID to update'),
        status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).describe('New status'),
      },
      async ({ orderId, status }) => {
        const res = await apiRequest(`/orders/${orderId}/status`, {
          method: 'PATCH',
          body: { status },
        });
        return formatToolResponse(res);
      },
    );

    // 9. [Admin] List all returns
    server.tool(
      'velour_orders_admin_list_returns',
      '[ADMIN] List all return and exchange requests across all customers.',
      {
        status: z.enum(['PENDING', 'APPROVED', 'RECEIVED', 'REFUNDED', 'REJECTED']).optional().describe('Filter return status'),
      },
      async (params) => {
        const res = await apiRequest('/orders/returns/all', { params });
        return formatToolResponse(res);
      },
    );
  }
}
