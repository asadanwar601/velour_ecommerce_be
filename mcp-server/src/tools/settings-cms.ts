import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse } from '../client.js';
import { McpRole } from '../types.js';

export function registerSettingsCmsTools(server: McpServer, role: McpRole = 'all'): void {
  // Public Brand & FAQ Information
  if (role === 'public' || role === 'customer' || role === 'all') {
    // 1. Get brand settings
    server.tool(
      'velour_settings_get_brand',
      'Get brand name, logo, currency, shipping threshold, and announcement bar settings.',
      {},
      async (_args, extra) => {
        const res = await apiRequest('/settings/brand', {
          sessionId: extra.sessionId,
          requiredRole: 'public',
        });
        return formatToolResponse(res);
      },
    );

    // 2. Get About Us CMS page
    server.tool(
      'velour_cms_get_about',
      'Get public dynamic About Us page content, hero title, rich text story, and milestone timeline.',
      {},
      async (_args, extra) => {
        const res = await apiRequest('/cms/about', {
          sessionId: extra.sessionId,
          requiredRole: 'public',
        });
        return formatToolResponse(res);
      },
    );

    // 3. Get Contact Us CMS page
    server.tool(
      'velour_cms_get_contact',
      'Get Contact Us concierge details, support hours, steps protocol, and Google Map embed URL.',
      {},
      async (_args, extra) => {
        const res = await apiRequest('/cms/contact', {
          sessionId: extra.sessionId,
          requiredRole: 'public',
        });
        return formatToolResponse(res);
      },
    );
  }

  // Admin Brand & CMS Management
  if (role === 'admin' || role === 'all') {
    // 4. [Admin] Update brand settings
    server.tool(
      'velour_settings_update_brand',
      '[ADMIN] Update store branding, announcement bar text, currency, or free shipping threshold.',
      {
        brandName: z.string().max(100).optional().describe('Brand name'),
        tagline: z.string().max(250).optional().describe('Brand tagline'),
        freeShippingThreshold: z.number().min(0).optional().describe('Free shipping order value threshold in USD'),
        announcementBarText: z.string().max(300).optional().describe('Announcement bar message'),
        announcementBarActive: z.boolean().optional().describe('Show or hide announcement bar'),
        supportEmail: z.string().email().max(254).optional().describe('Care and support email'),
        supportPhone: z.string().max(32).optional().describe('Support phone number'),
      },
      async (body, extra) => {
        const res = await apiRequest('/settings/brand', {
          method: 'PATCH',
          body,
          sessionId: extra.sessionId,
          requiredRole: 'admin',
        });
        return formatToolResponse(res);
      },
    );

    // 5. [Admin] Update About Us CMS page
    server.tool(
      'velour_cms_update_about',
      '[ADMIN] Update About Us storytelling, hero title, and narrative HTML.',
      {
        heroTitle: z.string().max(200).optional().describe('Hero headline'),
        storyHtml: z.string().max(20000).optional().describe('Rich text story content in HTML format'),
      },
      async (body, extra) => {
        const res = await apiRequest('/cms/about', {
          method: 'PUT',
          body,
          sessionId: extra.sessionId,
          requiredRole: 'admin',
        });
        return formatToolResponse(res);
      },
    );

    // 6. [Admin] Update Contact Us CMS page
    server.tool(
      'velour_cms_update_contact',
      '[ADMIN] Update Contact Us concierge details, hours, and protocol instructions.',
      {
        title: z.string().max(200).optional().describe('Page title'),
        email: z.string().email().max(254).optional().describe('Support email address'),
        phone: z.string().max(32).optional().describe('Support phone number'),
        hours: z.string().max(200).optional().describe('Concierge operating hours'),
        address: z.string().max(300).optional().describe('Flagship atelier address'),
      },
      async (body, extra) => {
        const res = await apiRequest('/cms/contact', {
          method: 'PUT',
          body,
          sessionId: extra.sessionId,
          requiredRole: 'admin',
        });
        return formatToolResponse(res);
      },
    );
  }
}
