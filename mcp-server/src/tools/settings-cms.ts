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
      async () => {
        const res = await apiRequest('/settings/brand');
        return formatToolResponse(res);
      },
    );

    // 2. Get About Us CMS page
    server.tool(
      'velour_cms_get_about',
      'Get public dynamic About Us page content, hero title, rich text story, and milestone timeline.',
      {},
      async () => {
        const res = await apiRequest('/cms/about');
        return formatToolResponse(res);
      },
    );

    // 3. Get Contact Us CMS page
    server.tool(
      'velour_cms_get_contact',
      'Get Contact Us concierge details, support hours, steps protocol, and Google Map embed URL.',
      {},
      async () => {
        const res = await apiRequest('/cms/contact');
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
        brandName: z.string().optional().describe('Brand name'),
        tagline: z.string().optional().describe('Brand tagline'),
        freeShippingThreshold: z.number().optional().describe('Free shipping order value threshold in USD'),
        announcementBarText: z.string().optional().describe('Announcement bar message'),
        announcementBarActive: z.boolean().optional().describe('Show or hide announcement bar'),
        supportEmail: z.string().email().optional().describe('Care and support email'),
        supportPhone: z.string().optional().describe('Support phone number'),
      },
      async (body) => {
        const res = await apiRequest('/settings/brand', {
          method: 'PATCH',
          body,
        });
        return formatToolResponse(res);
      },
    );

    // 5. [Admin] Update About Us CMS page
    server.tool(
      'velour_cms_update_about',
      '[ADMIN] Update About Us storytelling, hero title, and narrative HTML.',
      {
        heroTitle: z.string().optional().describe('Hero headline'),
        storyHtml: z.string().optional().describe('Rich text story content in HTML format'),
      },
      async (body) => {
        const res = await apiRequest('/cms/about', {
          method: 'PUT',
          body,
        });
        return formatToolResponse(res);
      },
    );

    // 6. [Admin] Update Contact Us CMS page
    server.tool(
      'velour_cms_update_contact',
      '[ADMIN] Update Contact Us concierge details, hours, and protocol instructions.',
      {
        title: z.string().optional().describe('Page title'),
        email: z.string().email().optional().describe('Support email address'),
        phone: z.string().optional().describe('Support phone number'),
        hours: z.string().optional().describe('Concierge operating hours'),
        address: z.string().optional().describe('Flagship atelier address'),
      },
      async (body) => {
        const res = await apiRequest('/cms/contact', {
          method: 'PUT',
          body,
        });
        return formatToolResponse(res);
      },
    );
  }
}
