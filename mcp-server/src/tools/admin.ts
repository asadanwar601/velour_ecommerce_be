import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse, safeSegment } from '../client.js';
import { McpRole } from '../types.js';

export function registerAdminTools(server: McpServer, role: McpRole = 'all'): void {
  // Administrative Operations & Maintenance — registered only on admin/all servers
  if (role !== 'admin' && role !== 'all') {
    return;
  }

  // 1. Executive KPI Stats
  server.tool(
    'velour_admin_get_stats',
    '[ADMIN] Retrieve executive KPI dashboard analytics: gross revenue, order volume, low stock count, and recent transactions.',
    {},
    async (_args, extra) => {
      const res = await apiRequest('/admin/stats', {
        sessionId: extra.sessionId,
        requiredRole: 'admin',
      });
      return formatToolResponse(res);
    },
  );

  // 2. List users with search and filtering
  server.tool(
    'velour_admin_list_users',
    '[ADMIN] Query interconnected user directory with role filter, email search, lifetime spend, and order metrics.',
    {
      role: z.enum(['ALL', 'CUSTOMER', 'ADMIN']).default('ALL').describe('Role filter'),
      search: z.string().max(128).optional().describe('Search keyword in name or email'),
      limit: z.number().int().min(1).max(100).default(20).describe('Page size'),
      page: z.number().int().min(1).default(1).describe('Page number'),
    },
    async (params, extra) => {
      const res = await apiRequest('/admin/users', {
        params,
        sessionId: extra.sessionId,
        requiredRole: 'admin',
      });
      return formatToolResponse(res);
    },
  );

  // 3. Get user details dossier
  server.tool(
    'velour_admin_get_user_details',
    '[ADMIN] Get complete dossier on a user: profile, past orders with tracking, saved addresses, reviews, and wishlist.',
    {
      userId: z.string().min(1).max(128).describe('User ID to look up'),
    },
    async ({ userId }, extra) => {
      const res = await apiRequest(`/admin/users/${safeSegment(userId)}`, {
        sessionId: extra.sessionId,
        requiredRole: 'admin',
      });
      return formatToolResponse(res);
    },
  );

  // 4. Update user details or role
  server.tool(
    'velour_admin_update_user',
    '[ADMIN] Update user details or elevate/demote role (CUSTOMER <-> ADMIN).',
    {
      userId: z.string().min(1).max(128).describe('User ID to update'),
      role: z.enum(['CUSTOMER', 'ADMIN']).optional().describe('User system role'),
      firstName: z.string().max(100).optional().describe('First name'),
      lastName: z.string().max(100).optional().describe('Last name'),
      phone: z.string().max(32).optional().describe('Phone number'),
      isActive: z.boolean().optional().describe('Account active status'),
    },
    async ({ userId, ...body }, extra) => {
      const res = await apiRequest(`/admin/users/${safeSegment(userId)}`, {
        method: 'PATCH',
        body,
        sessionId: extra.sessionId,
        requiredRole: 'admin',
      });
      return formatToolResponse(res);
    },
  );

  // 5. Create & invite admin user
  server.tool(
    'velour_admin_invite_admin',
    '[ADMIN] Create and provision a new Administrator account.',
    {
      email: z.string().email().max(254).describe('New admin email address'),
      password: z.string().min(8).max(128).describe('Initial secure password'),
      firstName: z.string().min(1).max(100).describe('First name'),
      lastName: z.string().min(1).max(100).describe('Last name'),
    },
    async (body, extra) => {
      const res = await apiRequest('/admin/invite', {
        method: 'POST',
        body,
        sessionId: extra.sessionId,
        requiredRole: 'admin',
      });
      return formatToolResponse(res);
    },
  );

  // 6. Archive user account
  server.tool(
    'velour_admin_archive_user',
    '[ADMIN] Soft-delete / deactivate a user account without deleting order history.',
    {
      userId: z.string().min(1).max(128).describe('User ID to archive'),
    },
    async ({ userId }, extra) => {
      const res = await apiRequest(`/admin/users/${safeSegment(userId)}/archive`, {
        method: 'POST',
        sessionId: extra.sessionId,
        requiredRole: 'admin',
      });
      return formatToolResponse(res);
    },
  );

  // 7. Unarchive user account
  server.tool(
    'velour_admin_unarchive_user',
    '[ADMIN] Reactivate a previously archived user account.',
    {
      userId: z.string().min(1).max(128).describe('User ID to unarchive'),
    },
    async ({ userId }, extra) => {
      const res = await apiRequest(`/admin/users/${safeSegment(userId)}/unarchive`, {
        method: 'POST',
        sessionId: extra.sessionId,
        requiredRole: 'admin',
      });
      return formatToolResponse(res);
    },
  );
}
