/**
 * VELOUR API Client for MCP Server
 * Connects to https://velour-ecommerce-be.onrender.com
 */

import process from 'node:process';

export const API_BASE_URL =
  process.env.VELOUR_API_URL?.replace(/\/$/, '') || 'https://velour-ecommerce-be.onrender.com';


let dynamicToken: string | null =
  process.env.VELOUR_ADMIN_TOKEN || process.env.VELOUR_AUTH_TOKEN || null;

let dynamicDeviceId: string =
  process.env.VELOUR_DEVICE_ID || 'mcp-agent-device-session';

export function setClientToken(token: string | null): void {
  dynamicToken = token;
}

export function getClientToken(): string | null {
  return dynamicToken;
}

export function setClientDeviceId(deviceId: string): void {
  dynamicDeviceId = deviceId;
}

export function getClientDeviceId(): string {
  return dynamicDeviceId;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  token?: string;
  deviceId?: string;
  params?: Record<string, any>;
  body?: any;
}

export async function apiRequest(endpoint: string, options: RequestOptions = {}): Promise<any> {
  const method = options.method || 'GET';
  const token = options.token || dynamicToken;
  const deviceId = options.deviceId || dynamicDeviceId;

  let urlString = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

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

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  if (deviceId) {
    headers['x-device-id'] = deviceId;
  }

  try {
    const response = await fetch(urlString, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    let responseData: any;

    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMsg =
        typeof responseData === 'object' && responseData !== null
          ? responseData.message || responseData.error || JSON.stringify(responseData)
          : responseData;
      return {
        isError: true,
        status: response.status,
        message: `HTTP ${response.status}: ${errorMsg}`,
        details: responseData,
      };
    }

    return responseData;
  } catch (err: any) {
    return {
      isError: true,
      message: `Network request to ${urlString} failed: ${err.message}`,
    };
  }
}

export function formatToolResponse(data: any): { content: { type: 'text'; text: string }[] } {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: 'text', text }],
  };
}
