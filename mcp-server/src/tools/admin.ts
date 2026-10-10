import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse } from '../client.js';
import { McpRole } from '../types.js';

export function registerAdminTools(server: McpServer, role: McpRole = 'all'): void {
  // Administrative Operations & Maintenance
  if (role !== 'admin' && role !== 'all') {
    return;
  }

  // 1. Executive KPI Stats
  server.tool(
    'velour_admin_get_stats',
    '[ADMIN] Retrieve executive KPI dashboard analytics: gross revenue, order volume, low stock count, and recent transactions.',
    {},
    async () => {
      const res = await apiRequest('/admin/stats');
      return formatToolResponse(res);
    },
  );

  // 2. List users with search and filtering
  server.tool(
    'velour_admin_list_users',
    '[ADMIN] Query interconnected user directory with role filter, email search, lifetime spend, and order metrics.',
    {
      role: z.enum(['ALL', 'CUSTOMER', 'ADMIN']).default('ALL').describe('Role filter'),
      search: z.string().optional().describe('Search keyword in name or email'),
      limit: z.number().default(20).describe('Page size'),
      page: z.number().default(1).describe('Page number'),
    },
    async (params) => {
      const res = await apiRequest('/admin/users', { params });
      return formatToolResponse(res);
    },
  );

  // 3. Get user details dossier
  server.tool(
    'velour_admin_get_user_details',
    '[ADMIN] Get complete dossier on a user: profile, past orders with tracking, saved addresses, reviews, and wishlist.',
    {
      userId: z.string().describe('User ID to look up'),
    },
    async ({ userId }) => {
      const res = await apiRequest(`/admin/users/${userId}`);
      return formatToolResponse(res);
    },
  );

  // 4. Update user details or role
  server.tool(
    'velour_admin_update_user',
    '[ADMIN] Update user details or elevate/demote role (CUSTOMER <-> ADMIN).',
    {
      userId: z.string().describe('User ID to update'),
      role: z.enum(['CUSTOMER', 'ADMIN']).optional().describe('User system role'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.string().optional().describe('Phone number'),
      isActive: z.boolean().optional().describe('Account active status'),
    },
    async ({ userId, ...body }) => {
      const res = await apiRequest(`/admin/users/${userId}`, {
        method: 'PATCH',
        body,
      });
      return formatToolResponse(res);
    },
  );

  // 5. Create & invite admin user
  server.tool(
    'velour_admin_invite_admin',
    '[ADMIN] Create and provision a new Administrator account.',
    {
      email: z.string().email().describe('New admin email address'),
      password: z.string().min(8).describe('Initial secure password'),
      firstName: z.string().min(1).describe('First name'),
      lastName: z.string().min(1).describe('Last name'),
    },
    async (body) => {
      const res = await apiRequest('/admin/invite', {
        method: 'POST',
        body,
      });
      return formatToolResponse(res);
    },
  );

  // 6. Archive user account
  server.tool(
    'velour_admin_archive_user',
    '[ADMIN] Soft-delete / deactivate a user account without deleting order history.',
    {
      userId: z.string().describe('User ID to archive'),
    },
    async ({ userId }) => {
      const res = await apiRequest(`/admin/users/${userId}/archive`, {
        method: 'POST',
      });
      return formatToolResponse(res);
    },
  );

  // 7. Unarchive user account
  server.tool(
    'velour_admin_unarchive_user',
    '[ADMIN] Reactivate a previously archived user account.',
    {
      userId: z.string().describe('User ID to unarchive'),
    },
    async ({ userId }) => {
      const res = await apiRequest(`/admin/users/${userId}/unarchive`, {
        method: 'POST',
      });
      return formatToolResponse(res);
    },
  );
}
