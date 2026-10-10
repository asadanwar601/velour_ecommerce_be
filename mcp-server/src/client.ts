/**
 * ============================================================================
 * VELOUR API Client for MCP Server
 * ============================================================================
 * Security invariants:
 * 1. In HTTP/SSE mode, every tool request is strictly isolated to its MCP
 *    session (`sessionId`). Global environment tokens (`VELOUR_ADMIN_TOKEN`,
 *    `VELOUR_AUTH_TOKEN`) are ONLY used in local single-user stdio mode and are
 *    never inherited by HTTP/SSE sessions.
 * 2. Tools cannot override or mutate a session's Bearer token in HTTP mode;
 *    tokens are bound exclusively by `index.ts` after upstream `/auth/me`
 *    verification.
 * 3. Defense-in-depth: `apiRequest` normalizes the URL path and enforces both
 *    explicit `requiredRole` and endpoint/method classification before making
 *    any upstream request, ensuring a `customer` or `public` session can never
 *    reach an `admin` endpoint (even via path traversal or reserved slugs).
 * 4. Upstream base URLs and credentials are never leaked in error responses.
 * ============================================================================
 */

import process from 'node:process';
import { McpRole, SessionContext } from './types.js';

export const API_BASE_URL =
  process.env.VELOUR_API_URL?.replace(/\/+$/, '') || 'https://velour-ecommerce-be.onrender.com';

const HTTP_MODE = Boolean(process.env.PORT) || process.env.MCP_TRANSPORT === 'sse';
const CUSTOMER_REQUIRES_AUTH =
  process.env.MCP_CUSTOMER_REQUIRE_AUTH === undefined
    ? true
    : ['1', 'true', 'yes', 'on'].includes(process.env.MCP_CUSTOMER_REQUIRE_AUTH.toLowerCase());

// Stdio-only fallback credentials (never used in HTTP_MODE)
let stdioToken: string | null = HTTP_MODE
  ? null
  : process.env.VELOUR_ADMIN_TOKEN || process.env.VELOUR_AUTH_TOKEN || null;

const stdioDeviceId: string =
  process.env.VELOUR_DEVICE_ID || 'mcp-stdio-session';

const stdioRole = (): McpRole => {
  const r = (process.env.MCP_ROLE ?? 'all').toLowerCase();
  return r === 'public' || r === 'customer' || r === 'admin' || r === 'all' ? r : 'all';
};

// Session-isolated storage for verified tokens, roles, and device IDs
const sessionContextMap = new Map<string, SessionContext>();

export function setSessionContext(sessionId: string, ctx: Partial<SessionContext>): void {
  const existing = sessionContextMap.get(sessionId);
  sessionContextMap.set(sessionId, {
    role: ctx.role ?? existing?.role ?? 'public',
    token: ctx.token !== undefined ? ctx.token : existing?.token,
    deviceId: ctx.deviceId !== undefined ? ctx.deviceId : existing?.deviceId,
    createdAt: existing?.createdAt ?? Date.now(),
  });
}

export function getSessionContext(sessionId?: string): SessionContext | null {
  if (sessionId) {
    return sessionContextMap.get(sessionId) ?? null;
  }
  if (!HTTP_MODE) {
    return {
      role: stdioRole(),
      token: stdioToken,
      deviceId: stdioDeviceId,
      createdAt: Date.now(),
    };
  }
  return null;
}

export function removeSessionContext(sessionId: string): void {
  sessionContextMap.delete(sessionId);
}

/**
 * Updates the active token in local stdio mode only.
 * In HTTP/SSE mode, session tokens are verified and bound by `index.ts`.
 */
export function setClientToken(token: string | null): boolean {
  if (HTTP_MODE) return false;
  stdioToken = token;
  return true;
}

/**
 * Safely encodes a single URL path segment and blocks path traversal or reserved words.
 */
export function safeSegment(value: string, disallowReserved: string[] = []): string {
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed === '.' ||
    trimmed === '..' ||
    /[\/\\]/.test(trimmed) ||
    disallowReserved.includes(trimmed.toLowerCase())
  ) {
    throw new Error('Invalid resource identifier');
  }
  return encodeURIComponent(trimmed);
}

export type RequiredRole = 'public' | 'customer' | 'admin';

const ROLE_RANK: Record<RequiredRole, number> = {
  public: 0,
  customer: 1,
  admin: 2,
};

/**
 * Defense-in-depth classification of backend endpoints by minimum required role.
 * Normalizes the path first so `..` segments cannot bypass prefix checks.
 */
function classifyEndpointRole(endpoint: string, method: string): RequiredRole {
  const rawPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const path = new URL(rawPath, 'http://localhost').pathname.toLowerCase();
  const upperMethod = method.toUpperCase();

  // Strictly Admin routes & mutating operations
  if (
    path.startsWith('/admin') ||
    path.startsWith('/inventory') ||
    path.startsWith('/coupons/admin') ||
    path.startsWith('/categories/admin') ||
    path === '/orders/all' ||
    path.startsWith('/orders/returns/all') ||
    /^\/orders\/[^/]+\/status$/.test(path) ||
    (path.startsWith('/products') && upperMethod !== 'GET') ||
    (path.startsWith('/categories') && upperMethod !== 'GET') ||
    (path.startsWith('/settings') && upperMethod !== 'GET') ||
    (path.startsWith('/cms') && upperMethod !== 'GET')
  ) {
    return 'admin';
  }

  // Strictly Customer routes
  if (
    path.startsWith('/orders') ||
    path.startsWith('/checkout') ||
    path.startsWith('/cart') ||
    path.startsWith('/wishlist') ||
    path === '/auth/me' ||
    (path.startsWith('/reviews') && upperMethod !== 'GET')
  ) {
    return 'customer';
  }

  return 'public';
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  sessionId?: string;
  requiredRole?: RequiredRole;
  deviceId?: string;
  params?: Record<string, unknown>;
  body?: unknown;
}

export async function apiRequest(endpoint: string, options: RequestOptions = {}): Promise<any> {
  const method = options.method || 'GET';
  const inferredRole = classifyEndpointRole(endpoint, method);
  const explicitRole = options.requiredRole || 'public';
  const requiredRole: RequiredRole =
    ROLE_RANK[inferredRole] >= ROLE_RANK[explicitRole] ? inferredRole : explicitRole;

  const sessionCtx = getSessionContext(options.sessionId);

  // In HTTP mode, every non-public call must match an active session
  if (HTTP_MODE && !sessionCtx && requiredRole !== 'public') {
    return {
      isError: true,
      status: 401,
      message: 'Unauthorized: Active authenticated MCP session is required.',
    };
  }

  const sessionRole: McpRole = sessionCtx?.role ?? 'public';
  const token = sessionRole === 'public' ? null : (sessionCtx?.token ?? null);
  const deviceId = options.deviceId || sessionCtx?.deviceId;

  // Enforce Admin role boundary
  if (requiredRole === 'admin') {
    if (sessionRole !== 'admin' && sessionRole !== 'all') {
      return {
        isError: true,
        status: 403,
        message: 'Forbidden: Administrator privileges are required for this operation.',
      };
    }
    if (!token) {
      return {
        isError: true,
        status: 401,
        message: 'Unauthorized: Administrator Bearer token is required.',
      };
    }
  }

  // Enforce Customer role boundary
  if (requiredRole === 'customer') {
    if (sessionRole === 'public') {
      return {
        isError: true,
        status: 403,
        message: 'Forbidden: Logged-in customer session is required for this operation.',
      };
    }
    if (CUSTOMER_REQUIRES_AUTH && !token) {
      return {
        isError: true,
        status: 401,
        message: 'Unauthorized: Customer Bearer token is required.',
      };
    }
  }

  const normalizedPath = new URL(
    endpoint.startsWith('/') ? endpoint : `/${endpoint}`,
    'http://localhost',
  ).pathname;
  let urlString = `${API_BASE_URL}${normalizedPath}`;

  if (options.params && Object.keys(options.params).length > 0) {
    const url = new URL(urlString);
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    }
    urlString = url.toString();
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  if (deviceId && /^[\w.:-]{1,128}$/.test(deviceId)) {
    headers['x-device-id'] = deviceId;
  }

  try {
    const response = await fetch(urlString, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });

    const contentType = response.headers.get('content-type') || '';
    const responseData: any = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const errorMsg =
        typeof responseData === 'object' && responseData !== null
          ? responseData.message || responseData.error || 'Upstream request rejected'
          : String(responseData || 'Upstream request rejected');
      return {
        isError: true,
        status: response.status,
        message: `HTTP ${response.status}: ${errorMsg}`,
      };
    }

    return responseData;
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    return {
      isError: true,
      status: isTimeout ? 504 : 502,
      message: isTimeout ? 'Upstream API request timed out' : 'Upstream API request failed',
    };
  }
}

export function formatToolResponse(data: any): {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
} {
  const isError = Boolean(data && typeof data === 'object' && data.isError === true);
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: 'text', text }],
    ...(isError ? { isError: true } : {}),
  };
}
