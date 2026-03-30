/**
 * HMAC Signature Verification Module
 *
 * Provides request signing and verification using HMAC (Hash-based Message Authentication Code)
 * Prevents request tampering and ensures authenticity
 */

import { createHmac, timingSafeEqual } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface SignatureConfig {
  secret: string;
  algorithm?: 'sha256' | 'sha384' | 'sha512';
  headerName?: string;
  timestampHeader?: string;
  maxAge?: number; // milliseconds
}

export interface SignedRequestData {
  method: string;
  path: string;
  body?: string;
  timestamp?: number;
}

export interface SignatureResult {
  signature: string;
  timestamp: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Omit<SignatureConfig, 'secret'> = {
  algorithm: 'sha256',
  headerName: 'X-Signature',
  timestampHeader: 'X-Timestamp',
  maxAge: 5 * 60 * 1000, // 5 minutes
};

// ============================================================================
// Signature Generation
// ============================================================================

/**
 * Generate HMAC signature for request
 *
 * @param data - Request data to sign
 * @param secret - Secret key
 * @param algorithm - Hash algorithm (default: sha256)
 * @returns HMAC signature as hex string
 */
export function generateSignature(
  data: SignedRequestData,
  secret: string,
  algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256'
): string {
  const payload = buildPayload(data);
  const hmac = createHmac(algorithm, secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Build payload string for signing
 */
function buildPayload(data: SignedRequestData): string {
  const parts = [
    data.method.toUpperCase(),
    data.path,
  ];

  if (data.body !== undefined) {
    parts.push(data.body);
  }

  if (data.timestamp !== undefined) {
    parts.push(String(data.timestamp));
  }

  return parts.join('|');
}

/**
 * Generate signature with timestamp
 *
 * @param data - Request data
 * @param config - Signature configuration
 * @returns Signature result
 */
export function generateSignatureWithTimestamp(
  data: SignedRequestData,
  config: SignatureConfig
): SignatureResult {
  const timestamp = Date.now();
  const signature = generateSignature(
    { ...data, timestamp },
    config.secret,
    config.algorithm
  );

  return { signature, timestamp };
}

// ============================================================================
// Signature Validation
// ============================================================================

/**
 * Validate HMAC signature
 *
 * @param data - Request data
 * @param signature - Signature to validate
 * @param secret - Secret key
 * @param algorithm - Hash algorithm (default: sha256)
 * @returns True if valid
 */
export function validateSignature(
  data: SignedRequestData,
  signature: string,
  secret: string,
  algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256'
): boolean {
  try {
    const expectedSignature = generateSignature(data, secret, algorithm);

    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    return false;
  }
}

/**
 * Validate signature with timestamp
 *
 * @param data - Request data
 * @param signature - Signature to validate
 * @param timestamp - Request timestamp
 * @param config - Signature configuration
 * @returns Object with valid flag and reason if invalid
 */
export function validateSignatureWithTimestamp(
  data: SignedRequestData,
  signature: string,
  timestamp: number,
  config: SignatureConfig
): { valid: boolean; reason?: string } {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Check timestamp age
  if (finalConfig.maxAge) {
    const age = Date.now() - timestamp;

    if (age < 0) {
      return {
        valid: false,
        reason: 'Timestamp is in the future',
      };
    }

    if (age > finalConfig.maxAge) {
      return {
        valid: false,
        reason: `Request too old (${age}ms > ${finalConfig.maxAge}ms)`,
      };
    }
  }

  // Include timestamp in validation
  const dataWithTimestamp = { ...data, timestamp };

  if (!validateSignature(dataWithTimestamp, signature, config.secret, config.algorithm)) {
    return {
      valid: false,
      reason: 'Invalid signature',
    };
  }

  return { valid: true };
}

// ============================================================================
// HTTP Request Helpers
// ============================================================================

/**
 * Sign HTTP request
 *
 * @param method - HTTP method
 * @param path - Request path
 * @param body - Request body (optional)
 * @param config - Signature configuration
 * @returns Object with signature and timestamp
 */
export function signHTTPRequest(
  method: string,
  path: string,
  body: unknown,
  config: SignatureConfig
): SignatureResult {
  const bodyString = body ? JSON.stringify(body) : undefined;

  return generateSignatureWithTimestamp(
    {
      method,
      path,
      body: bodyString,
    },
    config
  );
}

/**
 * Validate HTTP request signature
 *
 * @param method - HTTP method
 * @param path - Request path
 * @param body - Request body
 * @param headers - Request headers
 * @param config - Signature configuration
 * @returns Object with valid flag and reason if invalid
 */
export function validateHTTPRequestSignature(
  method: string,
  path: string,
  body: unknown,
  headers: Headers | Record<string, string>,
  config: SignatureConfig
): { valid: boolean; reason?: string } {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Get signature from headers
  let signature: string | undefined;
  if (headers instanceof Headers) {
    signature = headers.get(finalConfig.headerName!.toLowerCase()) ?? undefined;
  } else {
    signature = headers[finalConfig.headerName!.toLowerCase()] as string;
  }
  if (!signature) {
    return {
      valid: false,
      reason: `Missing ${finalConfig.headerName} header`,
    };
  }

  // Get timestamp from headers
  let timestampHeader: string | undefined;
  if (headers instanceof Headers) {
    timestampHeader = headers.get(finalConfig.timestampHeader!.toLowerCase()) ?? undefined;
  } else {
    timestampHeader = headers[finalConfig.timestampHeader!.toLowerCase()] as string;
  }
  if (!timestampHeader) {
    return {
      valid: false,
      reason: `Missing ${finalConfig.timestampHeader} header`,
    };
  }

  const timestamp = parseInt(timestampHeader, 10);
  if (isNaN(timestamp)) {
    return {
      valid: false,
      reason: `Invalid ${finalConfig.timestampHeader} header`,
    };
  }

  const bodyString = body ? JSON.stringify(body) : undefined;

  return validateSignatureWithTimestamp(
    {
      method,
      path,
      body: bodyString,
    },
    signature,
    timestamp,
    config
  );
}

/**
 * Add signature to request headers
 *
 * @param headers - Headers object
 * @param method - HTTP method
 * @param path - Request path
 * @param body - Request body
 * @param config - Signature configuration
 */
export function addSignatureToHeaders(
  headers: Record<string, string>,
  method: string,
  path: string,
  body: unknown,
  config: SignatureConfig
): void {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { signature, timestamp } = signHTTPRequest(method, path, body, config);

  headers[finalConfig.headerName!] = signature;
  headers[finalConfig.timestampHeader!] = String(timestamp);
}

// ============================================================================
// Next.js Middleware Helpers
// ============================================================================

/**
 * Extract signature data from Next.js request
 */
export function extractSignatureData(
  headers: Headers,
  config?: Partial<SignatureConfig>
): {
  signature?: string;
  timestamp?: number;
  config: Required<Omit<SignatureConfig, 'secret'>>;
} {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const signature = headers.get(finalConfig.headerName!);
  const timestampHeader = headers.get(finalConfig.timestampHeader!);
  const timestamp = timestampHeader ? parseInt(timestampHeader, 10) : undefined;

  return {
    signature: signature || undefined,
    timestamp,
    config: finalConfig as Required<Omit<SignatureConfig, 'secret'>>,
  };
}

/**
 * Validate Next.js request
 */
export function validateNextRequest(
  request: Request,
  secret: string,
  config?: Partial<SignatureConfig>
): { valid: boolean; reason?: string } {
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname + url.search;

  let body: unknown;
  try {
    body = request.method !== 'GET' && request.method !== 'HEAD'
      ? request.json()
      : undefined;
  } catch {
    // Failed to parse body, use undefined
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return validateHTTPRequestSignature(
    method,
    path,
    body,
    headers,
    { secret, ...config }
  );
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get signature secret from environment
 *
 * @returns Signature secret
 */
export function getSignatureSecret(): string {
  const secret = process.env.SIGNATURE_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('SIGNATURE_SECRET or JWT_SECRET environment variable is required');
  }
  return secret;
}

/**
 * Generate signature using environment secret
 */
export function signWithEnvSecret(
  method: string,
  path: string,
  body: unknown,
  config?: Partial<SignatureConfig>
): SignatureResult {
  return signHTTPRequest(
    method,
    path,
    body,
    { secret: getSignatureSecret(), ...config }
  );
}

/**
 * Validate signature using environment secret
 */
export function validateWithEnvSecret(
  method: string,
  path: string,
  body: unknown,
  headers: Headers | Record<string, string>,
  config?: Partial<SignatureConfig>
): { valid: boolean; reason?: string } {
  return validateHTTPRequestSignature(
    method,
    path,
    body,
    headers,
    { secret: getSignatureSecret(), ...config }
  );
}

/**
 * Check if request requires signature validation
 *
 * @param method - HTTP method
 * @param path - Request path
 * @param options - Options
 * @returns True if should validate
 */
export function requiresSignatureValidation(
  method: string,
  path: string,
  options: {
    protectedPaths?: string[];
    protectedMethods?: string[];
    excludePaths?: string[];
  } = {}
): boolean {
  const {
    protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'],
    protectedPaths = [],
    excludePaths = [],
  } = options;

  // Check if method is protected
  if (!protectedMethods.includes(method.toUpperCase())) {
    return false;
  }

  // Check if path is excluded
  for (const excludePath of excludePaths) {
    if (path.startsWith(excludePath)) {
      return false;
    }
  }

  // Check if path is explicitly protected
  if (protectedPaths.length > 0) {
    return protectedPaths.some(p => path.startsWith(p));
  }

  // Default: protect all POST/PUT/PATCH/DELETE requests
  return true;
}
