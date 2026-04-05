/**
 * CSRF Token API Route
 *
 * GET /api/csrf/token - Get a new CSRF token
 *
 * This endpoint provides CSRF tokens to the client.
 * The token is set as a cookie and also returned in the response body.
 *
 * @version 1.13.0
 */

import { NextRequest } from 'next/server'
import { getCSRFToken } from '@/lib/middleware/csrf'

/**
 * GET /api/csrf/token
 *
 * Returns a new CSRF token to the client.
 * The token is automatically set as a secure cookie.
 */
export async function GET(request: NextRequest) {
  return getCSRFToken(request)
}