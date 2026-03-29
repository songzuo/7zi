/**
 * SQL Injection Protection Module
 *
 * Enhanced SQL injection detection and prevention utilities
 * Complements Prisma's built-in parameterized queries
 */

import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface SQLInjectionCheckResult {
  safe: boolean;
  detectedPatterns: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  sanitizedValue?: string;
}

export interface SQLInjectionConfig {
  logDetections?: boolean;
  throwOnDetection?: boolean;
  sanitizeInput?: boolean;
}

// ============================================================================
// SQL Injection Patterns
// ============================================================================

/**
 * Known SQL injection patterns
 */
const SQL_INJECTION_PATTERNS = [
  // SQL keywords
  {
    pattern: /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|UNION)\b/gi,
    severity: 'high' as const,
    description: 'SQL keyword detected',
  },
  // SQL comments
  {
    pattern: /(--|#|\/\*|\*\/)/g,
    severity: 'medium' as const,
    description: 'SQL comment detected',
  },
  // Union-based injection
  {
    pattern: /UNION\s+(ALL\s+)?SELECT/gi,
    severity: 'critical' as const,
    description: 'UNION-based injection pattern',
  },
  // Boolean-based injection
  {
    pattern: /OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/gi,
    severity: 'critical' as const,
    description: 'Boolean-based injection pattern',
  },
  // Time-based injection
  {
    pattern: /(WAITFOR\s+DELAY|SLEEP\s*\(|BENCHMARK\s*\()/gi,
    severity: 'critical' as const,
    description: 'Time-based injection pattern',
  },
  // Stacked queries
  {
    pattern: /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)/gi,
    severity: 'critical' as const,
    description: 'Stacked query pattern',
  },
  // Quote breaking
  {
    pattern: /(['"])\s*(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/gi,
    severity: 'critical' as const,
    description: 'Quote breaking pattern',
  },
  // Escape sequence injection
  {
    pattern: /\\['"]|\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}/g,
    severity: 'medium' as const,
    description: 'Escape sequence detected',
  },
  // Comment-based bypass
  {
    pattern: /\/\*.*\*\//gs,
    severity: 'medium' as const,
    description: 'Block comment detected',
  },
  // Hex encoding
  {
    pattern: /0x[0-9a-fA-F]+/g,
    severity: 'low' as const,
    description: 'Hex encoding detected',
  },
  // Quote combinations
  {
    pattern: /['"]{2,}/g,
    severity: 'medium' as const,
    description: 'Multiple quotes detected',
  },
  // Case manipulation bypass
  {
    pattern: /['"]\s*(OR|AND)\s+['"][^'"]+['"]\s*=\s*['"][^'"]+['"]/gi,
    severity: 'critical' as const,
    description: 'Case manipulation bypass pattern',
  },
];

/**
 * Dangerous SQL functions
 */
const DANGEROUS_FUNCTIONS = [
  'EXEC', 'EXECUTE', 'xp_cmdshell', 'sp_', 'fn_',
  'LOAD_FILE', 'INTO OUTFILE', 'INTO DUMPFILE',
  'PG_READ_FILE', 'PG_WRITE_FILE', 'COPY',
  'SYS', 'INFORMATION_SCHEMA', 'MYSQL', 'PG_',
];

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Check string for SQL injection patterns
 *
 * @param input - Input string to check
 * @param config - Detection configuration
 * @returns Check result
 */
export function checkSQLInjection(
  input: string,
  config: SQLInjectionConfig = {}
): SQLInjectionCheckResult {
  const { logDetections = true } = config;
  const detectedPatterns: string[] = [];
  let maxSeverity: SQLInjectionCheckResult['severity'] = 'low';

  for (const { pattern, severity, description } of SQL_INJECTION_PATTERNS) {
    const matches = input.match(pattern);

    if (matches) {
      detectedPatterns.push(`${description}: ${matches.join(', ')}`);

      if (severity === 'critical') {
        maxSeverity = 'critical';
      } else if (severity === 'high' && maxSeverity !== 'critical') {
        maxSeverity = 'high';
      } else if (severity === 'medium' && maxSeverity !== 'critical' && maxSeverity !== 'high') {
        maxSeverity = 'medium';
      }
    }
  }

  // Check for dangerous function calls
  const upperInput = input.toUpperCase();
  for (const func of DANGEROUS_FUNCTIONS) {
    if (upperInput.includes(func)) {
      detectedPatterns.push(`Dangerous function: ${func}`);

      if (maxSeverity === 'low') {
        maxSeverity = 'medium';
      }
    }
  }

  const safe = detectedPatterns.length === 0;

  if (!safe && logDetections) {
    logger.warn('SQL injection pattern detected', {
      patterns: detectedPatterns,
      severity: maxSeverity,
      input: input.substring(0, 100),
    });
  }

  return {
    safe,
    detectedPatterns,
    severity: maxSeverity,
  };
}

/**
 * Check object for SQL injection patterns
 *
 * @param obj - Object to check
 * @param config - Detection configuration
 * @returns Check result
 */
export function checkObjectForSQLInjection(
  obj: unknown,
  config: SQLInjectionConfig = {}
): SQLInjectionCheckResult {
  const allDetected: string[] = [];
  let maxSeverity: SQLInjectionCheckResult['severity'] = 'low';

  const checkValue = (value: unknown, path: string): void => {
    if (typeof value === 'string') {
      const result = checkSQLInjection(value, { ...config, logDetections: false });

      if (!result.safe) {
        allDetected.push(`${path}: ${result.detectedPatterns.join(', ')}`);

        if (result.severity === 'critical') {
          maxSeverity = 'critical';
        } else if (result.severity === 'high' && maxSeverity !== 'critical') {
          maxSeverity = 'high';
        } else if (result.severity === 'medium' && maxSeverity !== 'critical' && maxSeverity !== 'high') {
          maxSeverity = 'medium';
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => checkValue(item, `${path}[${index}]`));
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([key, val]) => checkValue(val, `${path}.${key}`));
    }
  };

  checkValue(obj, 'root');

  if (allDetected.length > 0 && config.logDetections !== false) {
    logger.warn('SQL injection patterns detected in object', {
      patterns: allDetected,
      severity: maxSeverity,
    });
  }

  return {
    safe: allDetected.length === 0,
    detectedPatterns: allDetected,
    severity: maxSeverity,
  };
}

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Escape single quotes for SQL
 *
 * @param input - Input string
 * @returns Escaped string
 */
export function escapeSQLString(input: string): string {
  return input.replace(/'/g, "''");
}

/**
 * Remove SQL comments
 *
 * @param input - Input string
 * @returns String without comments
 */
export function removeSQLComments(input: string): string {
  return input
    .replace(/--[^\n]*/g, '')
    .replace(/#[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Sanitize input by escaping special characters
 *
 * @param input - Input string
 * @returns Sanitized string
 */
export function sanitizeSQLInput(input: string): string {
  let sanitized = input;

  // Escape single quotes
  sanitized = escapeSQLString(sanitized);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove backslash escapes
  sanitized = sanitized.replace(/\\([%_])/g, '$1');

  return sanitized;
}

/**
 * Validate and sanitize input
 *
 * @param input - Input string
 * @param config - Validation configuration
 * @returns Validation result with sanitized value
 */
export function validateAndSanitizeSQLInput(
  input: string,
  config: SQLInjectionConfig = {}
): SQLInjectionCheckResult & { sanitizedValue: string } {
  const checkResult = checkSQLInjection(input, config);

  let sanitizedValue = input;

  if (!checkResult.safe && config.sanitizeInput) {
    sanitizedValue = sanitizeSQLInput(input);
  }

  if (!checkResult.safe && config.throwOnDetection) {
    throw new Error(`SQL injection detected: ${checkResult.detectedPatterns.join(', ')}`);
  }

  return {
    ...checkResult,
    sanitizedValue,
  };
}

// ============================================================================
// Parameter Validation
// ============================================================================

/**
 * Validate table/column name (identifier)
 *
 * @param identifier - Identifier to validate
 * @returns True if valid
 */
export function isValidIdentifier(identifier: string): boolean {
  // Only allow alphanumeric and underscore
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
}

/**
 * Validate sort direction
 *
 * @param direction - Sort direction
 * @returns True if valid
 */
export function isValidSortDirection(direction: string): boolean {
  return ['asc', 'ASC', 'desc', 'DESC'].includes(direction);
}

/**
 * Validate limit value
 *
 * @param limit - Limit value
 * @param maxLimit - Maximum allowed limit
 * @returns Validated limit or default
 */
export function validateLimit(limit: unknown, maxLimit: number = 100): number {
  const parsed = parseInt(String(limit), 10);

  if (isNaN(parsed) || parsed < 1) {
    return 10; // Default
  }

  return Math.min(parsed, maxLimit);
}

/**
 * Validate offset value
 *
 * @param offset - Offset value
 * @returns Validated offset or default
 */
export function validateOffset(offset: unknown): number {
  const parsed = parseInt(String(offset), 10);

  if (isNaN(parsed) || parsed < 0) {
    return 0; // Default
  }

  return parsed;
}

// ============================================================================
// Query Builder Helpers
// ============================================================================

/**
 * Build safe WHERE clause condition
 *
 * @param field - Field name
 * @param operator - Operator (=, !=, >, <, etc.)
 * @param value - Value
 * @returns Safe condition object
 */
export function buildSafeCondition(
  field: string,
  operator: string,
  value: unknown
): { field: string; operator: string; value: unknown } | null {
  // Validate field name
  if (!isValidIdentifier(field)) {
    logger.warn(`Invalid field name: ${field}`);
    return null;
  }

  // Validate operator
  const validOperators = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL'];

  if (!validOperators.includes(operator.toUpperCase())) {
    logger.warn(`Invalid operator: ${operator}`);
    return null;
  }

  // Check value for injection
  if (typeof value === 'string') {
    const check = checkSQLInjection(value);

    if (!check.safe) {
      logger.warn('SQL injection detected in value', { field, patterns: check.detectedPatterns });
      return null;
    }
  }

  return { field, operator: operator.toUpperCase(), value };
}

/**
 * Build safe ORDER BY clause
 *
 * @param field - Field name
 * @param direction - Sort direction
 * @returns Safe order clause or null
 */
export function buildSafeOrder(
  field: string,
  direction: string = 'ASC'
): { field: string; direction: string } | null {
  if (!isValidIdentifier(field)) {
    logger.warn(`Invalid field name for ORDER BY: ${field}`);
    return null;
  }

  if (!isValidSortDirection(direction)) {
    logger.warn(`Invalid sort direction: ${direction}`);
    return null;
  }

  return { field, direction: direction.toUpperCase() };
}

// ============================================================================
// Middleware Helpers
// ============================================================================

/**
 * Create SQL injection protection middleware
 *
 * @param config - Configuration
 * @returns Middleware function
 */
export function createSQLInjectionMiddleware(config: SQLInjectionConfig = {}) {
  return async function sqlInjectionMiddleware(
    req: Request,
    next: () => Promise<Response>
  ): Promise<Response> {
    // Check URL parameters
    const url = new URL(req.url);
    for (const [key, value] of url.searchParams) {
      const result = checkSQLInjection(value, config);

      if (!result.safe) {
        return Response.json(
          {
            success: false,
            error: {
              type: 'SECURITY_ERROR',
              message: 'Potential SQL injection detected in query parameters',
            },
          },
          { status: 400 }
        );
      }
    }

    // Check body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        const body = await req.json();
        const result = checkObjectForSQLInjection(body, config);

        if (!result.safe) {
          return Response.json(
            {
              success: false,
              error: {
                type: 'SECURITY_ERROR',
                message: 'Potential SQL injection detected in request body',
              },
            },
            { status: 400 }
          );
        }
      } catch {
        // Not JSON, skip body check
      }
    }

    return next();
  };
}

/**
 * Check request for SQL injection
 *
 * @param request - Request to check
 * @returns True if safe
 */
export function isRequestSafe(request: Request): boolean {
  // Check URL parameters
  const url = new URL(request.url);

  for (const [key, value] of url.searchParams) {
    const result = checkSQLInjection(value, { logDetections: false });

    if (!result.safe) {
      logger.warn('SQL injection detected in URL param', { key, value: value.substring(0, 50) });
      return false;
    }
  }

  return true;
}
