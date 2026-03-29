/**
 * Mock middleware for compatibility
 * Placeholder for authentication middleware
 */

import { NextRequest, NextResponse } from 'next/server';

export function authMiddleware(request: NextRequest) {
  // Placeholder implementation
  return NextResponse.next();
}

export function checkPermissions(requiredRoles: string[]) {
  // Placeholder implementation
  return (request: NextRequest) => NextResponse.next();
}
