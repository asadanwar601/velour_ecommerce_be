import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, formatToolResponse } from '../client.js';

export function registerReviewTools(server: McpServer): void {
  // 1. Get reviews for a product
  server.tool(
    'velour_reviews_get_product_reviews',
    'Get buyer reviews, rating distribution, and sizing fit feedback for a product.',
    {
      productId: z.string().describe('Product SKU ID'),
    },
    async ({ productId }) => {
      const res = await apiRequest(`/reviews/product/${productId}`);
      return formatToolResponse(res);
    },
  );

  // 2. Submit product review
  server.tool(
    'velour_reviews_create',
    'Submit a buyer rating, title, fit review, and commentary for a product.',
    {
      productId: z.string().describe('Product SKU ID'),
      userName: z.string().describe('Reviewer display name'),
      rating: z.number().int().min(1).max(5).describe('Star rating from 1 to 5'),
      title: z.string().describe('Review headline'),
      comment: z.string().describe('Detailed review commentary'),
      fitRating: z.enum(['RUNS_SMALL', 'TRUE_TO_SIZE', 'RUNS_LARGE']).default('TRUE_TO_SIZE').describe('Garment fit evaluation'),
    },
    async (body) => {
      const res = await apiRequest('/reviews', {
        method: 'POST',
        body,
      });
      return formatToolResponse(res);
    },
  );
}
