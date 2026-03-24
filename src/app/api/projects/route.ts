import { NextRequest, NextResponse } from 'next/server';

/**
 * Projects API Route
 *
 * This is a stub file to satisfy TypeScript compilation.
 * Actual implementation should be added when needed.
 */

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: [],
    message: 'Projects API - GET endpoint'
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {},
    message: 'Projects API - POST endpoint'
  });
}

export async function getProject(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json({
    success: true,
    data: { id },
    message: 'Project API - GET by ID'
  });
}
