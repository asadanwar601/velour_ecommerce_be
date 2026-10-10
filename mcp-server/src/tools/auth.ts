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
      'Authenticate with email and password to receive a JWT access token and user profile. Automatically stores token for subsequent calls.',
      {
        email: z.string().email().describe('User account email address (e.g. admin@velour.com)'),
        password: z.string().min(6).describe('Account password'),
        deviceId: z.string().optional().describe('Optional device ID for cart merging'),
      },
      async ({ email, password, deviceId }) => {
        const res = await apiRequest('/auth/login', {
          method: 'POST',
          body: { email, password, deviceId },
        });

        if (!res.isError && (res.data?.accessToken || res.accessToken)) {
          const token = res.data?.accessToken || res.accessToken;
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
        email: z.string().email().describe('Email address'),
        password: z.string().min(8).describe('Strong password'),
        firstName: z.string().min(1).describe('First name'),
        lastName: z.string().min(1).describe('Last name'),
        phone: z.string().optional().describe('Contact phone number'),
      },
      async (body) => {
        const res = await apiRequest('/auth/signup', {
          method: 'POST',
          body,
        });
        return formatToolResponse(res);
      },
    );

    // 3. Request OTP code
    server.tool(
      'velour_auth_request_otp',
      'Request a 6-digit OTP verification code dispatched via EMAIL or WHATSAPP.',
      {
        identifier: z.string().describe('Email address or phone number'),
        channel: z.enum(['EMAIL', 'WHATSAPP']).default('EMAIL').describe('Delivery channel'),
      },
      async (body) => {
        const res = await apiRequest('/auth/otp/request', {
          method: 'POST',
          body,
        });
        return formatToolResponse(res);
      },
    );

    // 4. Verify OTP code
    server.tool(
      'velour_auth_verify_otp',
      'Verify a 6-digit OTP code to complete authentication or verify email.',
      {
        identifier: z.string().describe('Email address or phone number'),
        code: z.string().length(6).describe('6-digit numeric OTP code'),
      },
      async (body) => {
        const res = await apiRequest('/auth/otp/verify', {
          method: 'POST',
          body,
        });

        if (!res.isError && (res.data?.accessToken || res.accessToken)) {
          const token = res.data?.accessToken || res.accessToken;
          setClientToken(token);
        }

        return formatToolResponse(res);
      },
    );

    // 5. Set client token manually
    server.tool(
      'velour_auth_set_token',
      'Manually set the Bearer JWT token to use for all subsequent authenticated tool calls.',
      {
        token: z.string().describe('JWT access token (with or without "Bearer " prefix)'),
      },
      async ({ token }) => {
        setClientToken(token);
        return formatToolResponse({
          success: true,
          message: 'Active client authentication token updated successfully.',
        });
      },
    );
  }

  // Customer Profile (requires logged-in user)
  if (role === 'customer' || role === 'all') {
    // 6. Get current authenticated user profile
    server.tool(
      'velour_auth_get_me',
      'Retrieve the profile, addresses, and status of the currently authenticated user.',
      {
        token: z.string().optional().describe('Optional override JWT Bearer token'),
      },
      async ({ token }) => {
        const res = await apiRequest('/auth/me', {
          method: 'GET',
          token,
        });
        return formatToolResponse(res);
      },
    );
  }
}
