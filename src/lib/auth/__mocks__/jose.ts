/**
 * Mock for jose library - simplifies JWT testing by avoiding WebCrypto API requirements
 */

let globalCounter = 0;
const currentTimestamp = Math.floor(Date.now() / 1000);
const lastSecret = '';

// JWT Payload interface
interface JWTPayload {
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  [key: string]: unknown;
}

// Simple JWT implementation for testing
const mockSign = async (payload?: JWTPayload, expiresIn: number = 3600) => {
  // Increment counter for each sign to make tokens unique
  globalCounter++;
  
  // Use real time for expiration, but vary it slightly for uniqueness
  const now = Math.floor(Date.now() / 1000);
  
  // Create a mock JWT token (not a real JWT, but functional for testing)
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
    iss: '7zi-api',
    aud: '7zi-users',
    _counter: globalCounter, // Make tokens unique even with same payload
  };

  // Simple base64 encoding for mock (not secure, only for testing)
  const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64');
  const payloadEncoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64');
  const signature = Buffer.from(`mock-signature-${globalCounter}`).toString('base64');

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
};

const mockVerify = async (token: string, secretKey?: string, options?: Record<string, unknown>) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const now = Math.floor(Date.now() / 1000);

    // Check expiration
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }

    return { payload };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Token verification failed';
    // Map to jose error format
    if (msg.includes('exp')) {
      throw new Error('Token expired');
    }
    throw new Error(msg);
  }
};

const mockDecode = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
  } catch (error) {
    throw new Error('Token decoding failed');
  }
};

export const SignJWT = class {
  private payload: JWTPayload = {};
  private expiration: number = 3600;

  constructor(payload: JWTPayload) {
    this.payload = payload;
  }
  setProtectedHeader() { return this; }
  setIssuedAt() { return this; }
  setExpirationTime(exp: string | number) {
    if (typeof exp === 'number') {
      this.expiration = exp;
    }
    return this;
  }
  setIssuer() { return this; }
  setAudience() { return this; }
  async sign(_secretKey?: string) {
    return await mockSign(this.payload, this.expiration);
  }
};

export const jwtVerify = mockVerify;
export const decodeJwt = mockDecode;
export const jwtSign = mockSign;
