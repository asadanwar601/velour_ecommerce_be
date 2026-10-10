#!/usr/bin/env node

/**
 * ============================================================================
 * VELOUR LUXURY E-COMMERCE MODEL CONTEXT PROTOCOL (MCP) SERVER
 * ============================================================================
 * Role-Based Access Control Architecture:
 * - Public / Guest (/mcp/public, /sse/public): FAQ, Store Policies, Product Discovery
 * - Customer (/mcp/customer, /sse/customer): Orders, Live Tracking, Cart, Checkout
 * - Admin (/mcp/admin, /sse/admin): Inventory, Catalog CRUD, Coupon & User Management
 * ============================================================================
 */
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import process from 'node:process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response } from 'express';
import { API_BASE_URL, setSessionContext, removeSessionContext } from './client.js';
import { McpRole } from './types.js';
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

export function createMcpServer(role: McpRole = 'all'): McpServer {
  const roleDisplay = role.toUpperCase();
  const server = new McpServer({
    name: `velour-ecommerce-mcp-${role}`,
    version: '1.1.0',
    description: `VELOUR eCommerce MCP Server [Role: ${roleDisplay}] targeting ${API_BASE_URL}`,
  });

  registerAuthTools(server, role);
  registerProductTools(server, role);
  registerCategoryTools(server, role);
  registerCartTools(server, role);
  registerOrderTools(server, role);
  registerInventoryTools(server, role);
  registerCouponTools(server, role);
  registerReviewTools(server, role);
  registerWishlistTools(server, role);
  registerSettingsCmsTools(server, role);
  registerAdminTools(server, role);

  return server;
}

async function startStdio(): Promise<void> {
  const defaultRole = (process.env.MCP_ROLE as McpRole) || 'all';
  const server = createMcpServer(defaultRole);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[velour-mcp-server] Running via Stdio transport. Role: ${defaultRole}, Target: ${API_BASE_URL}`);
}

async function startSse(port: number): Promise<void> {
  const app = express();
  const sseTransports: Record<string, SSEServerTransport> = {};
  const streamableTransports: Record<string, StreamableHTTPServerTransport> = {};

  app.use(express.json());

  // Helper to extract role from request path, query, or header
  function resolveRole(req: Request, explicitRole?: McpRole): McpRole {
    if (explicitRole) return explicitRole;
    const queryRole = req.query.role as string | undefined;
    const headerRole = (req.headers['x-mcp-role'] as string | undefined)?.toLowerCase();
    const candidate = (queryRole || headerRole || 'all').toLowerCase();

    if (candidate === 'public' || candidate === 'customer' || candidate === 'admin') {
      return candidate as McpRole;
    }
    return 'all';
  }

  // Helper to extract auth token and update session context
  function extractAuth(req: Request, sessionId: string, role: McpRole) {
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : undefined;
    const deviceId = req.headers['x-device-id'] as string | undefined;

    setSessionContext(sessionId, {
      role,
      token,
      deviceId,
    });
  }

  // 1. Root Service Info
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'velour-ecommerce-mcp',
      version: '1.1.0',
      apiTarget: API_BASE_URL,
      roles: {
        public: {
          description: 'FAQ, Store Policies & Catalog Browsing (Anonymous / Guest)',
          endpoints: { mcp: '/mcp/public', sse: '/sse/public' },
        },
        customer: {
          description: 'Customer Support, Orders, Live Tracking, Cart & Wishlist (Authenticated Customer)',
          endpoints: { mcp: '/mcp/customer', sse: '/sse/customer' },
        },
        admin: {
          description: 'Store Operations, Inventory Restock, Catalog CRUD & Maintenance (Administrator)',
          endpoints: { mcp: '/mcp/admin', sse: '/sse/admin' },
        },
        all: {
          description: 'Unified Endpoint (Role dynamically determined by query ?role= or header X-Mcp-Role)',
          endpoints: { mcp: '/mcp', sse: '/sse' },
        },
      },
      health: '/health',
    });
  });

  // 2. Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).send('OK');
  });

  // 3. SSE Stream Handler
  async function handleSseConnection(req: Request, res: Response, targetRole?: McpRole) {
    const role = resolveRole(req, targetRole);
    console.log(`[velour-mcp-server] Client connected to SSE [Role: ${role}]`);

    const transport = new SSEServerTransport('/messages', res);
    sseTransports[transport.sessionId] = transport;
    extractAuth(req, transport.sessionId, role);

    const sessionServer = createMcpServer(role);

    req.on('close', () => {
      console.log(`[velour-mcp-server] SSE disconnected: ${transport.sessionId}`);
      delete sseTransports[transport.sessionId];
      removeSessionContext(transport.sessionId);
    });

    await sessionServer.connect(transport);
  }

  app.get('/sse', (req, res) => handleSseConnection(req, res));
  app.get('/sse/public', (req, res) => handleSseConnection(req, res, 'public'));
  app.get('/sse/customer', (req, res) => handleSseConnection(req, res, 'customer'));
  app.get('/sse/admin', (req, res) => handleSseConnection(req, res, 'admin'));

  // 4. SSE Client messages POST endpoint
  app.post('/messages', async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = sseTransports[sessionId];

    if (!transport) {
      res.status(404).json({ error: `Session not found: ${sessionId}` });
      return;
    }

    await transport.handlePostMessage(req, res);
  });

  // 5. Streamable HTTP MCP Handler
  async function handleMcpRequest(req: Request, res: Response, targetRole?: McpRole) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    try {
      // Existing active MCP session
      if (sessionId && streamableTransports[sessionId]) {
        await streamableTransports[sessionId].handleRequest(req, res, req.body);
        return;
      }

      // Initialize new MCP session
      if (!sessionId && isInitializeRequest(req.body)) {
        const role = resolveRole(req, targetRole);
        let currentSessionId = '';

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            currentSessionId = id;
            streamableTransports[id] = transport;
            extractAuth(req, id, role);
            console.log(`[velour-mcp-server] New HTTP session initialized: ${id} [Role: ${role}]`);
          },
        });

        transport.onclose = () => {
          if (currentSessionId) {
            delete streamableTransports[currentSessionId];
            removeSessionContext(currentSessionId);
          }
        };

        const sessionServer = createMcpServer(role);
        await sessionServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // Unknown session ID
      if (sessionId) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Session not found',
          },
          id: null,
        });
        return;
      }

      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: Expected MCP initialize request',
        },
        id: null,
      });
    } catch (error) {
      console.error('[velour-mcp-server] MCP error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  }

  app.all('/mcp', (req, res) => handleMcpRequest(req, res));
  app.all('/mcp/public', (req, res) => handleMcpRequest(req, res, 'public'));
  app.all('/mcp/customer', (req, res) => handleMcpRequest(req, res, 'customer'));
  app.all('/mcp/admin', (req, res) => handleMcpRequest(req, res, 'admin'));

  app.listen(port, () => {
    console.log(`[velour-mcp-server] HTTP & SSE Server listening on port ${port}`);
    console.log(`[velour-mcp-server] Public:   http://localhost:${port}/mcp/public   | /sse/public`);
    console.log(`[velour-mcp-server] Customer: http://localhost:${port}/mcp/customer | /sse/customer`);
    console.log(`[velour-mcp-server] Admin:    http://localhost:${port}/mcp/admin    | /sse/admin`);
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
