/**
 * OpenAPI JSON 规范
 * GET: 返回 OpenAPI 3.0 规范的 JSON
 */

import { NextResponse } from 'next/server';
import { swaggerOptions } from '@/lib/swagger';

export async function GET() {
  return NextResponse.json(swaggerOptions.definition);
}