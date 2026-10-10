import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse, setClientToken } from '../client.js';
import { McpRole } from '../types.js';

export function registerAuthTools(server: McpServer, role: McpRole = 'all'): void {
  // Public & Customer Authentication Tools
  if (role === 'public' || role === 'customer' || role === 'all') {
    // 1. Login with email and password
    server.tool(
      'velour_auth_login',
      'Authenticate with email and password to receive a JWT access token and user profile.',
      {
        email: z.string().email().max(254).describe('User account email address'),
        password: z.string().min(6).max(128).describe('Account password'),
        deviceId: z.string().max(128).optional().describe('Optional device ID for cart merging'),
      },
      async ({ email, password, deviceId }, extra) => {
        const res = await apiRequest('/auth/login', {
          method: 'POST',
          body: { email, password, deviceId },
          sessionId: extra.sessionId,
          requiredRole: 'public',
        });

        if (!res.isError && (res.data?.accessToken || res.accessToken)) {
          const token = res.data?.accessToken || res.accessToken;
          // No-op in HTTP mode; only updates local stdio token
          setClientToken(token);
        }

        return formatToolResponse(res);
      },
    );

    // 2. Sign up new customer account
    server.tool(
      'velour_auth_signup',
      'Register a new customer account with email, password, and personal details.',
      {
        email: z.string().email().max(254).describe('Email address'),
        password: z.string().min(8).max(128).describe('Strong password'),
        firstName: z.string().min(1).max(100).describe('First name'),
        lastName: z.string().min(1).max(100).describe('Last name'),
        phone: z.string().max(32).optional().describe('Contact phone number'),
      },
      async (body, extra) => {
        const res = await apiRequest('/auth/signup', {
          method: 'POST',
          body,
          sessionId: extra.sessionId,
          requiredRole: 'public',
        });
        return formatToolResponse(res);
      },
    );

    // 3. Request OTP code
    server.tool(
      'velour_auth_request_otp',
      'Request a 6-digit OTP verification code dispatched via EMAIL or WHATSAPP.',
      {
        identifier: z.string().min(3).max(254).describe('Email address or phone number'),
        channel: z.enum(['EMAIL', 'WHATSAPP']).default('EMAIL').describe('Delivery channel'),
      },
      async (body, extra) => {
        const res = await apiRequest('/auth/otp/request', {
          method: 'POST',
          body,
          sessionId: extra.sessionId,
          requiredRole: 'public',
        });
        return formatToolResponse(res);
      },
    );

    // 4. Verify OTP code
    server.tool(
      'velour_auth_verify_otp',
      'Verify a 6-digit OTP code to complete authentication or verify email.',
      {
        identifier: z.string().min(3).max(254).describe('Email address or phone number'),
        code: z.string().length(6).describe('6-digit numeric OTP code'),
      },
      async (body, extra) => {
        const res = await apiRequest('/auth/otp/verify', {
          method: 'POST',
          body,
          sessionId: extra.sessionId,
          requiredRole: 'public',
        });

        if (!res.isError && (res.data?.accessToken || res.accessToken)) {
          const token = res.data?.accessToken || res.accessToken;
          setClientToken(token);
        }

        return formatToolResponse(res);
      },
    );
  }

  // Customer Profile (requires logged-in user bound to the session)
  if (role === 'customer' || role === 'admin' || role === 'all') {
    // 5. Get current authenticated user profile
    server.tool(
      'velour_auth_get_me',
      'Retrieve the profile, addresses, and status of the currently authenticated session user.',
      {},
      async (_args, extra) => {
        const res = await apiRequest('/auth/me', {
          method: 'GET',
          sessionId: extra.sessionId,
          requiredRole: 'customer',
        });
        return formatToolResponse(res);
      },
    );
  }
}
