/**
 * GET /api/ratings/[id]
 * Get single rating by ID
 */

import { NextRequest } from 'next/server';
import { GET_RATING } from '../route';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return GET_RATING(request, { params });
}

/**
 * DELETE /api/ratings/[id]
 * Delete rating
 */

import { DELETE_RATING } from '../route';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return DELETE_RATING(request, { params });
}
