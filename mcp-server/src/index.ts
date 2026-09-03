#!/usr/bin/env node

/**
 * ============================================================================
 * VELOUR LUXURY E-COMMERCE MODEL CONTEXT PROTOCOL (MCP) SERVER
 * ============================================================================
 * Supports dual transports:
 * 1. Stdio Transport: For local clients (Antigravity, Claude Desktop, Cursor)
 * 2. SSE HTTP Transport: For cloud deployments (Render, Railway, Fly.io)
 * ============================================================================
 */

import process from 'node:process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response } from 'express';
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

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'velour-ecommerce-mcp',
    version: '1.0.0',
    description: `MCP Server interfacing with VELOUR Fashion eCommerce API (${API_BASE_URL})`,
  });

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

  return server;
}

async function startStdio(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[velour-mcp-server] Running via Stdio transport. Targeting: ${API_BASE_URL}`);
}

async function startSse(port: number): Promise<void> {
  const app = express();
  const server = createMcpServer();
  const transports: Record<string, SSEServerTransport> = {};

  app.use(express.json());

  // Health check
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'velour-ecommerce-mcp',
      version: '1.0.0',
      apiTarget: API_BASE_URL,
      endpoints: {
        sse: '/sse',
        messages: '/messages',
        health: '/health',
      },
    });
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).send('OK');
  });

  // SSE Stream endpoint
  app.get('/sse', async (req: Request, res: Response) => {
    console.log(`[velour-mcp-server] Client connected to /sse`);
    const transport = new SSEServerTransport('/messages', res);
    transports[transport.sessionId] = transport;

    req.on('close', () => {
      console.log(`[velour-mcp-server] Client disconnected: ${transport.sessionId}`);
      delete transports[transport.sessionId];
    });

    await server.connect(transport);
  });

  // Client messages POST endpoint
  app.post('/messages', async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports[sessionId];

    if (!transport) {
      res.status(404).json({ error: `Session not found: ${sessionId}` });
      return;
    }

    await transport.handlePostMessage(req, res);
  });

  app.listen(port, () => {
    console.log(`[velour-mcp-server] SSE HTTP Server listening on port ${port}`);
    console.log(`[velour-mcp-server] SSE Endpoint: http://localhost:${port}/sse`);
    console.log(`[velour-mcp-server] Targeting API: ${API_BASE_URL}`);
  });
}

async function main() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
  const forceSse = process.env.MCP_TRANSPORT === 'sse';

  if (port || forceSse) {
    await startSse(port || 3001);
  } else {
    await startStdio();
  }
}

main().catch((error) => {
  console.error('[velour-mcp-server] Fatal startup error:', error);
  process.exit(1);
});
