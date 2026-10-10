import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse, safeSegment } from '../client.js';
import { McpRole } from '../types.js';

export function registerReviewTools(server: McpServer, role: McpRole = 'all'): void {
  // Public Review Reading
  if (role === 'public' || role === 'customer' || role === 'all') {
    // 1. Get reviews for a product
    server.tool(
      'velour_reviews_get_product_reviews',
      'Get buyer reviews, rating distribution, and sizing fit feedback for a product.',
      {
        productId: z.string().min(1).max(128).describe('Product SKU ID'),
      },
      async ({ productId }, extra) => {
        const res = await apiRequest(`/reviews/product/${safeSegment(productId)}`, {
          sessionId: extra.sessionId,
          requiredRole: 'public',
        });
        return formatToolResponse(res);
      },
    );
  }

  // Customer Review Submission
  if (role === 'customer' || role === 'all') {
    // 2. Submit product review
    server.tool(
      'velour_reviews_create',
      'Submit a buyer rating, title, fit review, and commentary for a product.',
      {
        productId: z.string().min(1).max(128).describe('Product SKU ID'),
        userName: z.string().min(1).max(100).describe('Reviewer display name'),
        rating: z.number().int().min(1).max(5).describe('Star rating from 1 to 5'),
        title: z.string().min(1).max(200).describe('Review headline'),
        comment: z.string().min(1).max(2000).describe('Detailed review commentary'),
        fitRating: z.enum(['RUNS_SMALL', 'TRUE_TO_SIZE', 'RUNS_LARGE']).default('TRUE_TO_SIZE').describe('Garment fit evaluation'),
      },
      async (body, extra) => {
        const res = await apiRequest('/reviews', {
          method: 'POST',
          body,
          sessionId: extra.sessionId,
          requiredRole: 'customer',
        });
        return formatToolResponse(res);
      },
    );
  }
}
