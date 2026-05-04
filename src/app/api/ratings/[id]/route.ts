/**
 * GET /api/ratings/[id]
 * Get single rating by ID
 */

import { NextRequest } from 'next/server'
import { GET_RATING } from '../route'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return GET_RATING(request, { params })
}

/**
 * DELETE /api/ratings/[id]
 * Delete rating
 */

import { DELETE_RATING } from '../route'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return DELETE_RATING(request, { params })
}

/**
 * PATCH /api/ratings/[id]
 * Update rating - delegating to POST /api/ratings with id in body
 */
import { POST } from '../route'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Extract and merge id into the request body for the parent handler
  const body = await request.json()
  const updatedRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ ...body, id }),
    headers: request.headers,
  })
  return POST(updatedRequest)
}
