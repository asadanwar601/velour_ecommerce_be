#!/usr/bin/env node

/**
 * ============================================================================
 * VELOUR LUXURY E-COMMERCE MODEL CONTEXT PROTOCOL (MCP) SERVER
 * ============================================================================
 * Exposes the complete REST API suite of https://velour-ecommerce-be.onrender.com
 * to AI agents, Claude Desktop, Antigravity, and other MCP clients.
 * ============================================================================
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { API_BASE_URL } from './client.js';
import { registerAuthTools } from './tools/auth.js';
import { registerProductTools } from './tools/products.js';
import { registerCategoryTools } from './tools/categories.js';
import { registerCartTools } from './tools/cart.js';
import { registerOrderTools } from './tools/orders.js';
import { registerInventoryTools } from './tools/inventory.js';
import { registerCouponTools } from './tools/coupons.js';
import { registerReviewTools } from './tools/reviews.js';
import { registerWishlistTools } from './tools/wishlist.js';
import { registerSettingsCmsTools } from './tools/settings-cms.js';
import { registerAdminTools } from './tools/admin.js';

async function main() {
  const server = new McpServer({
    name: 'velour-ecommerce-mcp',
    version: '1.0.0',
    description: `MCP Server interfacing with VELOUR Fashion eCommerce API (${API_BASE_URL})`,
  });

  // Register domain tools
  registerAuthTools(server);
  registerProductTools(server);
  registerCategoryTools(server);
  registerCartTools(server);
  registerOrderTools(server);
  registerInventoryTools(server);
  registerCouponTools(server);
  registerReviewTools(server);
  registerWishlistTools(server);
  registerSettingsCmsTools(server);
  registerAdminTools(server);

  // Connect stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[velour-mcp-server] Successfully started and connected via Stdio. Targeting: ${API_BASE_URL}`);
}

main().catch((error) => {
  console.error('[velour-mcp-server] Fatal startup error:', error);
  process.exit(1);
});
