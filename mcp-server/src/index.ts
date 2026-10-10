#!/usr/bin/env node

/**
 * ============================================================================
 * VELOUR LUXURY E-COMMERCE MCP SERVER (production build)
 * ============================================================================
 * Roles / endpoints:
 *   public   (/mcp/public,   /sse/public)   FAQ, policies, product discovery (no auth)
 *   customer (/mcp/customer, /sse/customer) orders, tracking, cart, checkout (Bearer token)
 *   admin    (/mcp/admin,    /sse/admin)    inventory, catalog, coupons, users (admin Bearer token)
 *   unified  (/mcp, /sse)                   DISABLED unless MCP_ENABLE_ALL_ROLE=true
 *
 * Security model: the role an endpoint grants is never taken on trust. For
 * customer/admin the Bearer token is verified against the backend API before a
 * session is created, and the verified identity is bound to the session.
 * ============================================================================
 */
import { createHash, randomUUID } from 'node:crypto';
import process from 'node:process';
import type { Server as HttpServer } from 'node:http';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
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

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------
const env = process.env;
const num = (v: string | undefined, d: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};
const flag = (v: string | undefined, d: boolean): boolean =>
  v === undefined ? d : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
const list = (v: string | undefined, d: string[] = []): string[] => {
  const items = (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return items.length ? items : d;
};

const VERSION = '1.2.0';
const HTTP_MODE = Boolean(env.PORT) || env.MCP_TRANSPORT === 'sse';

const config = {
  port: num(env.PORT, 3001),
  // Browser origins allowed to call the server. Non-browser clients send no Origin and are unaffected.
  allowedOrigins: list(env.MCP_ALLOWED_ORIGINS),
  // Number of reverse proxies in front of this server (for correct client IPs). 0 = none.
  trustProxyHops: Number(env.MCP_TRUST_PROXY ?? 0) || 0,
  enableAllRole: flag(env.MCP_ENABLE_ALL_ROLE, false),
  customerRequiresAuth: flag(env.MCP_CUSTOMER_REQUIRE_AUTH, true),
  // Backend endpoint that returns the current user for a Bearer token.
  authVerifyPath: env.MCP_AUTH_VERIFY_PATH ?? '/auth/me',
  authCacheTtlMs: num(env.MCP_AUTH_CACHE_TTL_MS, 60_000),
  adminRoles: list(env.MCP_ADMIN_ROLES, ['admin', 'superadmin']).map((r) => r.toLowerCase()),
  customerRoles: list(env.MCP_CUSTOMER_ROLES, ['customer', 'user']).map((r) => r.toLowerCase()),
  maxSessions: num(env.MCP_MAX_SESSIONS, 1000),
  sessionIdleMs: num(env.MCP_SESSION_IDLE_MS, 30 * 60_000),
  rateLimitPerMin: num(env.MCP_RATE_LIMIT_PER_MIN, 120),
  sseHeartbeatMs: 25_000,
  shutdownGraceMs: 10_000,
};

// ----------------------------------------------------------------------------
// Logging: JSON lines. stdout is reserved for the protocol in stdio mode.
// Tokens and message bodies are never logged.
// ----------------------------------------------------------------------------
type Level = 'info' | 'warn' | 'error';
function log(level: Level, msg: string, extra: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra });
  (HTTP_MODE && level !== 'error' ? process.stdout : process.stderr).write(`${line}\n`);
}
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

// ----------------------------------------------------------------------------
// MCP server factory
// ----------------------------------------------------------------------------
export function createMcpServer(role: McpRole = 'all'): McpServer {
  // Do not put the backend URL in anything that is sent to clients.
  const server = new McpServer({
    name: `velour-ecommerce-mcp-${role}`,
    version: VERSION,
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

const ROLES: readonly McpRole[] = ['public', 'customer', 'admin', 'all'];
const parseRole = (v: unknown): McpRole | null => {
  const c = typeof v === 'string' ? v.toLowerCase() : '';
  return ROLES.find((r) => r === c) ?? null;
};

// ----------------------------------------------------------------------------
// Stdio (local use)
// ----------------------------------------------------------------------------
async function startStdio(): Promise<void> {
  const role = parseRole(env.MCP_ROLE) ?? 'all';
  const server = createMcpServer(role);
  await server.connect(new StdioServerTransport());
  log('info', 'stdio_started', { role });
}

// ----------------------------------------------------------------------------
// Auth: verify Bearer tokens against the backend, cache briefly
// ----------------------------------------------------------------------------
interface Identity {
  role: string;
  userId: string;
}
const authCache = new Map<string, { identity: Identity | null; exp: number }>();
const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

/** Returns the identity, null if the token is invalid, throws if the backend is unreachable. */
async function verifyToken(token: string): Promise<Identity | null> {
  const key = sha256(token);
  const hit = authCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.identity;

  const url = `${API_BASE_URL.replace(/\/+$/, '')}${config.authVerifyPath}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });

  let identity: Identity | null = null;
  if (res.ok) {
    // Tolerant parsing: adjust to your backend's /auth/me response shape if needed.
    const body = (await res.json()) as any;
    const u = body?.data?.user ?? body?.data ?? body?.user ?? body;
    const role = String(u?.role ?? '').toLowerCase();
    const userId = String(u?.id ?? u?._id ?? u?.userId ?? u?.email ?? '');
    if (role && userId) identity = { role, userId };
  } else if (res.status !== 401 && res.status !== 403) {
    throw new Error(`auth verify returned ${res.status}`);
  }

  if (authCache.size > 5000) authCache.clear();
  authCache.set(key, {
    identity,
    exp: Date.now() + (identity ? config.authCacheTtlMs : 10_000),
  });
  return identity;
}

type AuthOk = { ok: true; token?: string; userId?: string };
type AuthFail = { ok: false; status: number; code: number; message: string };

const bearerToken = (req: Request): string | undefined => {
  const m = req.headers.authorization?.match(/^Bearer\s+(.+)$/i);
  const q = typeof req.query.token === 'string' ? req.query.token : undefined;
  const t = (m?.[1] ?? q)?.trim();
  return t && t.length <= 4096 ? t : undefined;
};

const headerValue = (req: Request, name: string): string | undefined => {
  const v = req.headers[name];
  return typeof v === 'string' ? v : undefined;
};

const deviceIdOf = (req: Request): string | undefined => {
  const q = typeof req.query.deviceId === 'string' ? req.query.deviceId : undefined;
  const v = (headerValue(req, 'x-device-id') ?? q)?.trim();
  return v && /^[\w.:-]{1,128}$/.test(v) ? v : undefined;
};

async function authorize(req: Request, role: McpRole, existingSession: boolean): Promise<AuthOk | AuthFail> {
  if (role === 'public') return { ok: true };

  const privileged = role === 'admin' || role === 'all';
  const required = privileged || (!existingSession && config.customerRequiresAuth);
  const token = bearerToken(req);

  if (!token) {
    return required
      ? { ok: false, status: 401, code: -32001, message: 'Authentication required' }
      : { ok: true };
  }

  let identity: Identity | null;
  try {
    identity = await verifyToken(token);
  } catch (e) {
    log('error', 'auth_upstream_failed', { error: errMsg(e) });
    return { ok: false, status: 503, code: -32603, message: 'Authentication service unavailable' };
  }
  if (!identity) return { ok: false, status: 401, code: -32001, message: 'Invalid or expired token' };

  const allowed = privileged ? config.adminRoles : [...config.customerRoles, ...config.adminRoles];
  if (!allowed.includes(identity.role)) {
    return { ok: false, status: 403, code: -32003, message: 'Insufficient permissions' };
  }
  return { ok: true, token, userId: identity.userId };
}

// ----------------------------------------------------------------------------
// Sessions (both transports share one registry)
// ----------------------------------------------------------------------------
interface Session {
  kind: 'http' | 'sse';
  transport: StreamableHTTPServerTransport | SSEServerTransport;
  server: McpServer;
  role: McpRole;
  userId?: string;
  lastSeen: number;
  heartbeat?: NodeJS.Timeout;
}
const sessions = new Map<string, Session>();

async function disposeSession(id: string): Promise<void> {
  const s = sessions.get(id);
  if (!s) return;
  sessions.delete(id); // first, so re-entrant onclose calls are no-ops
  if (s.heartbeat) clearInterval(s.heartbeat);
  removeSessionContext(id);
  try {
    await s.server.close();
  } catch (e) {
    log('warn', 'session_close_failed', { sessionId: id, error: errMsg(e) });
  }
  log('info', 'session_closed', { sessionId: id, role: s.role, kind: s.kind });
}

/** Keeps the session bound to one user; refreshes the stored token when the client sends a new one. */
function refreshSession(id: string, s: Session, auth: AuthOk, req: Request): boolean {
  if (auth.userId && s.userId && auth.userId !== s.userId) return false;
  if (!s.userId && auth.userId) s.userId = auth.userId;
  s.lastSeen = Date.now();
  if (auth.token) setSessionContext(id, { role: s.role, token: auth.token, deviceId: deviceIdOf(req) });
  return true;
}

// ----------------------------------------------------------------------------
// HTTP / SSE server
// ----------------------------------------------------------------------------
function rpcError(res: Response, status: number, code: number, message: string): void {
  res.status(status).json({ jsonrpc: '2.0', error: { code, message }, id: null });
}
function sendAuthError(res: Response, f: AuthFail): void {
  if (f.status === 401) res.setHeader('WWW-Authenticate', 'Bearer');
  rpcError(res, f.status, f.code, f.message);
}
const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };

let shuttingDown = false;

async function startHttp(port: number): Promise<HttpServer> {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxyHops > 0) app.set('trust proxy', config.trustProxyHops);

  app.use(helmet());

  // Health endpoints first: no origin check, no rate limit, no body parsing.
  app.get('/health', (_req, res) => void res.status(200).json({ status: 'ok' }));
  app.get('/ready', (_req, res) =>
    void res.status(shuttingDown ? 503 : 200).json({ status: shuttingDown ? 'shutting_down' : 'ready' }),
  );
  app.get('/', (_req, res) => void res.json({ status: 'ok', service: 'velour-ecommerce-mcp' }));

  // Refuse new work while draining.
  app.use((_req, res, next) => {
    if (shuttingDown) {
      res.setHeader('Connection', 'close');
      rpcError(res, 503, -32603, 'Server is shutting down');
      return;
    }
    next();
  });

  // Origin allowlist (blocks DNS-rebinding / hostile browser pages). Requests without Origin pass.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !config.allowedOrigins.includes('*') && !config.allowedOrigins.includes(origin)) {
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }
    next();
  });
  app.use(
    cors({
      origin: config.allowedOrigins.includes('*') ? true : config.allowedOrigins,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Accept',
        'Authorization',
        'Mcp-Session-Id',
        'Mcp-Protocol-Version',
        'Last-Event-ID',
        'X-Device-Id',
        'X-Mcp-Role',
      ],
      exposedHeaders: ['Mcp-Session-Id'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));

  const limiter = rateLimit({
    windowMs: 60_000,
    limit: config.rateLimitPerMin,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { jsonrpc: '2.0', error: { code: -32029, message: 'Too many requests' }, id: null },
  });

  // Unified endpoints only: choose a role from ?role= or X-Mcp-Role. Defaults to least privilege.
  const resolveUnifiedRole = (req: Request): McpRole =>
    parseRole(req.query.role) ?? parseRole(headerValue(req, 'x-mcp-role')) ?? 'public';

  // ---- Streamable HTTP ------------------------------------------------------
  async function handleMcp(req: Request, res: Response, targetRole?: McpRole): Promise<void> {
    const sessionId = headerValue(req, 'mcp-session-id');

    // Existing session
    if (sessionId) {
      const s = sessions.get(sessionId);
      if (!s || s.kind !== 'http' || (targetRole && s.role !== targetRole)) {
        return rpcError(res, 404, -32001, 'Session not found');
      }
      const auth = await authorize(req, s.role, true);
      if (!auth.ok) return sendAuthError(res, auth);
      if (!refreshSession(sessionId, s, auth, req)) {
        return rpcError(res, 403, -32003, 'Session belongs to a different user');
      }
      await (s.transport as StreamableHTTPServerTransport).handleRequest(req, res, req.body);
      return;
    }

    // New session
    if (req.method !== 'POST' || !isInitializeRequest(req.body)) {
      return rpcError(res, 400, -32000, 'Bad Request: Expected MCP initialize request');
    }
    if (sessions.size >= config.maxSessions) {
      res.setHeader('Retry-After', '30');
      return rpcError(res, 503, -32603, 'Server at capacity');
    }

    const role = targetRole ?? resolveUnifiedRole(req);
    const auth = await authorize(req, role, false);
    if (!auth.ok) return sendAuthError(res, auth);

    const server = createMcpServer(role);
    let sid: string | undefined;
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sid = id;
        sessions.set(id, { kind: 'http', transport, server, role, userId: auth.userId, lastSeen: Date.now() });
        setSessionContext(id, { role, token: auth.token, deviceId: deviceIdOf(req) });
        log('info', 'session_started', { sessionId: id, role, kind: 'http' });
      },
    });
    transport.onclose = () => {
      if (sid) void disposeSession(sid);
    };

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      if (sid) await disposeSession(sid);
      else await server.close().catch(() => undefined);
      throw e;
    }
  }

  // ---- Legacy SSE -----------------------------------------------------------
  async function handleSse(req: Request, res: Response, targetRole?: McpRole): Promise<void> {
    if (sessions.size >= config.maxSessions) {
      res.setHeader('Retry-After', '30');
      return rpcError(res, 503, -32603, 'Server at capacity');
    }
    const role = targetRole ?? resolveUnifiedRole(req);
    const auth = await authorize(req, role, false);
    if (!auth.ok) return sendAuthError(res, auth);

    const transport = new SSEServerTransport('/messages', res);
    const id = transport.sessionId;
    const server = createMcpServer(role);

    // Proxies and load balancers drop idle streams; send a comment line to keep it alive.
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) res.write(': ping\n\n');
    }, config.sseHeartbeatMs);
    heartbeat.unref();

    sessions.set(id, { kind: 'sse', transport, server, role, userId: auth.userId, lastSeen: Date.now(), heartbeat });
    setSessionContext(id, { role, token: auth.token, deviceId: deviceIdOf(req) });
    res.on('close', () => void disposeSession(id));
    log('info', 'session_started', { sessionId: id, role, kind: 'sse' });

    try {
      await server.connect(transport);
    } catch (e) {
      await disposeSession(id);
      throw e;
    }
  }

  async function handleMessages(req: Request, res: Response): Promise<void> {
    const id = typeof req.query.sessionId === 'string' ? req.query.sessionId : '';
    const s = sessions.get(id);
    if (!s || s.kind !== 'sse') return rpcError(res, 404, -32001, 'Session not found');

    const auth = await authorize(req, s.role, true);
    if (!auth.ok) return sendAuthError(res, auth);
    if (!refreshSession(id, s, auth, req)) {
      return rpcError(res, 403, -32003, 'Session belongs to a different user');
    }
    // express.json() already consumed the stream, so the parsed body must be passed explicitly.
    await (s.transport as SSEServerTransport).handlePostMessage(req, res, req.body);
  }

  const endpoints: Array<[string, McpRole | undefined]> = [
    ['/public', 'public'],
    ['/customer', 'customer'],
    ['/admin', 'admin'],
  ];
  if (config.enableAllRole) endpoints.push(['', undefined]);

  for (const [suffix, role] of endpoints) {
    app.all(`/mcp${suffix}`, limiter, wrap((req, res) => handleMcp(req, res, role)));
    app.get(`/sse${suffix}`, limiter, wrap((req, res) => handleSse(req, res, role)));
  }
  app.post('/messages', limiter, wrap(handleMessages));

  // 404 + error handling (async errors from wrap() land here)
  app.use((_req, res) => void res.status(404).json({ error: 'Not found' }));
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const type = (err as { type?: string } | null)?.type;
    if (type === 'entity.too.large') return rpcError(res, 413, -32600, 'Request too large');
    if (type === 'entity.parse.failed') return rpcError(res, 400, -32700, 'Parse error');
    log('error', 'request_failed', { path: req.path, error: errMsg(err) });
    if (!res.headersSent) rpcError(res, 500, -32603, 'Internal server error');
    else res.end();
  });

  // Drop sessions whose clients vanished without closing (streamable HTTP only; SSE is cleaned on socket close).
  setInterval(() => {
    const cutoff = Date.now() - config.sessionIdleMs;
    for (const [id, s] of sessions) {
      if (s.kind === 'http' && s.lastSeen < cutoff) {
        log('info', 'session_idle_expired', { sessionId: id });
        void disposeSession(id);
      }
    }
  }, 60_000).unref();

  return new Promise<HttpServer>((resolve, reject) => {
    const httpServer = app.listen(port, () => {
      // Must exceed typical load-balancer idle timeouts (ALB default: 60s).
      httpServer.keepAliveTimeout = 65_000;
      httpServer.headersTimeout = 66_000;
      log('info', 'http_started', {
        port,
        roles: endpoints.map(([s]) => s || 'unified'),
        originAllowlist: config.allowedOrigins.length,
      });
      resolve(httpServer);
    });
    httpServer.on('error', reject);
  });
}

// ----------------------------------------------------------------------------
// Lifecycle
// ----------------------------------------------------------------------------
async function shutdown(signal: string, httpServer?: HttpServer, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log('info', 'shutdown_started', { signal, openSessions: sessions.size });

  const force = setTimeout(() => {
    log('error', 'shutdown_forced');
    process.exit(1);
  }, config.shutdownGraceMs);
  force.unref();

  httpServer?.close();
  await Promise.allSettled([...sessions.keys()].map(disposeSession));
  httpServer?.closeAllConnections?.();
  clearTimeout(force);
  process.exit(exitCode);
}

async function main(): Promise<void> {
  if (!HTTP_MODE) return startStdio();

  const httpServer = await startHttp(config.port);
  process.on('SIGTERM', () => void shutdown('SIGTERM', httpServer));
  process.on('SIGINT', () => void shutdown('SIGINT', httpServer));
  process.on('unhandledRejection', (reason) => log('error', 'unhandled_rejection', { error: errMsg(reason) }));
  process.on('uncaughtException', (err) => {
    log('error', 'uncaught_exception', { error: errMsg(err) });
    void shutdown('uncaughtException', httpServer, 1);
  });
}

main().catch((error) => {
  log('error', 'fatal_startup_error', { error: errMsg(error) });
  process.exit(1);
});
