/**
 * GET /api/feedback/[id]
 * Get single feedback by ID
 */

import { NextRequest } from 'next/server'
import { GET_FEEDBACK } from '../route'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return GET_FEEDBACK(request, { params })
}

/**
 * PATCH /api/feedback/[id]
 * Update feedback (admin only)
 */

import { PATCH } from '../route'

export { PATCH }

/**
 * DELETE /api/feedback/[id]
 * Delete feedback (admin only)
 */

import { DELETE_FEEDBACK } from '../route'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return DELETE_FEEDBACK(request, { params })
}
