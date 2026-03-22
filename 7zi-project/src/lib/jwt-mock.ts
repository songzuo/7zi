/**
 * JWT Library Mock
 * JWT 库的简单实现，用于构建
 */

import { createHash } from 'crypto';

export interface JWTPayload {
  userId: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export function sign(payload: string | Record<string, unknown> | JWTPayload, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload)).toString('base64url');
  const signature = createHash('sha256')
    .update(`${encodedHeader}.${encodedPayload}${secret}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verify(token: string, secret: string): Record<string, unknown> | null {
  try {
    const [header, payload, signature] = token.split('.');
    const expectedSignature = createHash('sha256')
      .update(`${header}.${payload}${secret}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    const decodedPayload = Buffer.from(payload, 'base64url').toString();
    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
}

export function decode(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.');
    const decodedPayload = Buffer.from(payload, 'base64url').toString();
    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
}

export function decodeToken(token: string): Record<string, unknown> | null {
  const decoded = decode(token);
  if (!decoded || !('userId' in decoded)) {
    return null;
  }
  return decoded as Record<string, unknown>;
}

export function isTokenExpired(token: string): boolean {
  const payload = decode(token) as Record<string, unknown> | JWTPayload | null;
  if (!payload || !('exp' in payload)) {
    return true;
  }
  const now = Math.floor(Date.now() / 1000);
  return (payload.exp as number) < now;
}
