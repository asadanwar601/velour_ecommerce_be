/**
 * VELOUR MCP Server Types & Role Definitions
 */

export type McpRole = 'public' | 'customer' | 'admin' | 'all';

export interface SessionContext {
  role: McpRole;
  token?: string | null;
  deviceId?: string;
  createdAt: number;
}
