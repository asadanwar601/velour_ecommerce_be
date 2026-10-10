import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse } from '../client.js';
import { McpRole } from '../types.js';

export function registerCouponTools(server: McpServer, role: McpRole = 'all'): void {
  // Public & Customer Promotional Validation
  if (role === 'public' || role === 'customer' || role === 'all') {
    // 1. Validate coupon code
    server.tool(
      'velour_coupons_validate',
      'Validate a promotional discount code and calculate the exact dollar discount on an order total.',
      {
        code: z.string().min(1).max(64).describe('Coupon code (e.g. "WELCOME10")'),
        orderTotal: z.number().positive().describe('Cart subtotal in USD before discount'),
      },
      async (body, extra) => {
        const res = await apiRequest('/coupons/validate', {
          method: 'POST',
          body,
          sessionId: extra.sessionId,
          requiredRole: 'public',
        });
        return formatToolResponse(res);
      },
    );

    // 2. List public promotions
    server.tool(
      'velour_coupons_list',
      'List active promotional offers and public banner codes.',
      {},
      async (_args, extra) => {
        const res = await apiRequest('/coupons', {
          sessionId: extra.sessionId,
          requiredRole: 'public',
        });
        return formatToolResponse(res);
      },
    );
  }

  // Admin Coupon & Campaign Management
  if (role === 'admin' || role === 'all') {
    // 3. [Admin] Create new coupon
    server.tool(
      'velour_coupons_admin_create',
      '[ADMIN] Create a new promotional discount coupon.',
      {
        code: z.string().min(1).max(64).describe('Unique uppercase coupon code (e.g. "VIP25")'),
        discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).describe('Discount computation model'),
        discountValue: z.number().positive().describe('Discount percentage (e.g. 15 for 15%) or fixed dollar amount'),
        minOrderValue: z.number().min(0).optional().default(0).describe('Minimum order subtotal required to apply'),
        maxUses: z.number().int().positive().optional().describe('Maximum number of total redemptions allowed'),
        description: z.string().max(500).optional().describe('Campaign description'),
        expiresAt: z.string().optional().describe('Expiration ISO timestamp (e.g. "2026-12-31T23:59:59Z")'),
      },
      async (body, extra) => {
        const res = await apiRequest('/coupons/admin', {
          method: 'POST',
          body,
          sessionId: extra.sessionId,
          requiredRole: 'admin',
        });
        return formatToolResponse(res);
      },
    );

    // 4. [Admin] List all coupons
    server.tool(
      'velour_coupons_admin_list_all',
      '[ADMIN] List all coupons with redemption statistics, usage counts, and status.',
      {},
      async (_args, extra) => {
        const res = await apiRequest('/coupons/admin/all', {
          sessionId: extra.sessionId,
          requiredRole: 'admin',
        });
        return formatToolResponse(res);
      },
    );
  }
}
