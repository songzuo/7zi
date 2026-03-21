/**
 * POST /api/ratings/[id]/helpful
 * Mark rating as helpful or not helpful
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseAsync } from '@/lib/db/index';
import { logger } from '@/lib/logger';
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundError,
} from '@/lib/api/error-handler';
import { logRequestStart, logRequestComplete, logRequestError } from '@/lib/api/api-logger';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now();
  const metadata = logRequestStart(request);

  try {
    const { id } = params;
    const body = await request.json();
    const { helpful } = body;

    // Validate input
    if (typeof helpful !== 'boolean') {
      return createErrorResponse(new Error('helpful must be a boolean'), 400);
    }

    const db = await getDatabaseAsync();

    // Check if rating exists
    const rating = db.queryRows(
      'SELECT * FROM ratings WHERE id = ?',
      [id]
    )[0] as { id: string; helpful_count: number; not_helpful_count: number } | undefined;

    if (!rating) {
      return createNotFoundError('Rating not found');
    }

    // Update helpful count
    if (helpful) {
      db.query(
        'UPDATE ratings SET helpful_count = helpful_count + 1 WHERE id = ?',
        [id]
      );
    } else {
      db.query(
        'UPDATE ratings SET not_helpful_count = not_helpful_count + 1 WHERE id = ?',
        [id]
      );
    }

    // Get updated rating
    const updatedRating = db.queryRows(
      'SELECT * FROM ratings WHERE id = ?',
      [id]
    )[0];

    const response = createSuccessResponse(updatedRating);
    logRequestComplete(metadata, response, startTime);
    return response;
  } catch (error) {
    logRequestError(metadata, error, startTime);
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
