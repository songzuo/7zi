# Security Documentation

This document outlines the security measures implemented in the 7zi application.

## Table of Contents

1. [Overview](#overview)
2. [Security Architecture](#security-architecture)
3. [Implemented Security Features](#implemented-security-features)
4. [Configuration](#configuration)
5. [Best Practices](#best-practices)
6. [Security Checklist](#security-checklist)
7. [Incident Response](#incident-response)
8. [Dependencies Security](#dependencies-security)

---

## Overview

7zi implements defense-in-depth security measures across multiple layers:

- **Transport Layer**: HTTPS enforcement, HSTS
- **Application Layer**: Input validation, authentication, authorization
- **Data Layer**: Encryption at rest, parameterized queries
- **Infrastructure Layer**: Security headers, rate limiting

### Security Version

- **Current Version**: 1.4.0
- **Last Security Audit**: 2026-03-29
- **Security Level**: P1 (Production Ready)

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Request                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Middleware Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Rate Limit  │  │   CORS      │  │  Security Headers   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ CSRF Token  │  │   Signature │  │  SQL Injection      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Authentication Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ JWT Tokens  │  │  Sessions   │  │  OAuth Providers    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Authorization Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    RBAC     │  │ Permissions │  │   Role Hierarchy    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Encryption  │  │  Sanitization│ │  Prisma ORM         │  │
│  │ AES-256-GCM │  │             │  │  (Parameterized)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Implemented Security Features

### 1. WebSocket Security (`src/lib/security/websocket-security.ts`)

- **Rate Limiting**
  - Max connections per IP: 5
  - Max messages per minute: 100
  - Max messages per second: 10
  - Configurable rate limit windows

- **Message Size Validation**
  - Max text message size: 1 MB
  - Max binary message size: 10 MB
  - Prevents DoS via large payloads

- **Malicious User Detection**
  - Automatic pattern detection (XSS, SQL injection patterns)
  - Warning system (3 warnings before ban)
  - Auto-ban for 15 minutes (configurable)
  - IP-based tracking

```typescript
import { getWSSecurityManager } from '@/lib/security'

const wsSecurity = getWSSecurityManager({
  maxConnectionsPerIP: 5,
  maxMessagesPerMinute: 100,
  maxWarningsBeforeBan: 3,
})

// Check connection
const { allowed, reason } = wsSecurity.canConnect(ip)
if (!allowed) {
  // Reject connection
}
```

### 2. API Security (`src/lib/middleware/security.ts`)

- **CSRF Protection** (`src/lib/security/csrf.ts`)
  - HMAC-SHA256 based token generation
  - Token expiry (24 hours default)
  - Session-bound tokens
  - Timing-safe comparison

```typescript
import { generateCSRFToken, validateCSRFToken } from '@/lib/security'

// Generate token
const token = generateCSRFToken({ secret: process.env.CSRF_SECRET })

// Validate token
if (validateCSRFToken(token.token, process.env.CSRF_SECRET)) {
  // Token is valid
}
```

- **Request Signature Verification** (`src/lib/security/signature.ts`)
  - HMAC-SHA256/384/512 signatures
  - Timestamp-based request expiration
  - Protection against replay attacks
  - Configurable max age (default: 5 minutes)

```typescript
import { signHTTPRequest, validateHTTPRequestSignature } from '@/lib/security'

// Sign request
const { signature, timestamp } = signHTTPRequest('POST', '/api/data', body, {
  secret: process.env.SIGNATURE_SECRET,
})

// Validate request
const { valid, reason } = validateHTTPRequestSignature(method, path, body, headers, {
  secret: process.env.SIGNATURE_SECRET,
})
```

- **SQL Injection Protection** (`src/lib/security/sql-injection.ts`)
  - Pattern-based detection
  - Severity classification (low/medium/high/critical)
  - Input sanitization
  - Safe query builder helpers

```typescript
import { checkSQLInjection, validateAndSanitizeSQLInput } from '@/lib/security'

// Check input
const result = checkSQLInjection(userInput)
if (!result.safe) {
  // Handle potential injection
}

// Sanitize input
const { sanitizedValue } = validateAndSanitizeSQLInput(input, {
  sanitizeInput: true,
})
```

### 3. Data Security (`src/lib/security/encryption.ts`)

- **AES-256-GCM Encryption**
  - Authenticated encryption (AEAD)
  - Random IV per encryption
  - Key derivation using scrypt
  - Authentication tags for integrity

```typescript
import { encryptGCM, decryptGCM, encryptApiKeyGCM } from '@/lib/security'

// Encrypt data
const encrypted = await encryptGCM(sensitiveData, password)

// Decrypt data
const decrypted = await decryptGCM(encrypted, password)

// Encrypt API key
const encryptedKey = await encryptApiKeyGCM(apiKey, password)
```

- **Log Sanitization** (`src/lib/security/log-sanitizer.ts`)
  - Automatic PII detection
  - Sensitive field masking
  - Value pattern detection (email, phone, credit card, SSN)
  - Configurable masking strategies

```typescript
import { sanitizeObject, sanitizeLogEntry, maskEmail } from '@/lib/security'

// Mask email
const masked = maskEmail('user@example.com') // u***r@example.com

// Sanitize object
const sanitized = sanitizeObject(userData)

// Sanitize log entry
const safeLog = sanitizeLogEntry(logData)
```

- **API Key Storage**
  - Encrypted at rest using AES-256-GCM
  - Environment-based key derivation
  - Secure key validation

### 4. Security Headers (`src/lib/security/headers.ts`)

| Header                    | Development                     | Production                      |
| ------------------------- | ------------------------------- | ------------------------------- |
| Content-Security-Policy   | Lenient                         | Strict                          |
| Strict-Transport-Security | Disabled                        | 2 years + preload               |
| X-Frame-Options           | SAMEORIGIN                      | DENY                            |
| X-Content-Type-Options    | nosniff                         | nosniff                         |
| X-XSS-Protection          | 1; mode=block                   | 1; mode=block                   |
| Referrer-Policy           | strict-origin-when-cross-origin | strict-origin-when-cross-origin |
| Permissions-Policy        | Restrictive                     | Restrictive                     |

### 5. Rate Limiting (`src/lib/security/rate-limit/`)

- Token bucket algorithm
- Redis-backed for distributed systems
- Configurable per-route limits
- IP and user-based identification

---

## Configuration

### Environment Variables

```bash
# Required Security Variables
JWT_SECRET=your-256-bit-secret-key
CSRF_SECRET=your-csrf-secret-key
SIGNATURE_SECRET=your-signature-secret-key

# Encryption
AGENT_ENCRYPTION_SECRET=your-encryption-secret

# Optional
ENABLE_HSTS=true
SECURITY_LOG_LEVEL=warn
```

### Security Configuration Object

```typescript
import { SecurityConfigs } from '@/lib/security'

// Pre-configured security profiles
const publicConfig = SecurityConfigs.public // Public endpoints
const authConfig = SecurityConfigs.auth // Authentication endpoints
const protectedConfig = SecurityConfigs.protected // Protected endpoints
const adminConfig = SecurityConfigs.admin // Admin endpoints
```

---

## Best Practices

### 1. Input Handling

```typescript
// ✅ Good: Use validation schemas
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
})

// ❌ Bad: Trust user input directly
const email = req.body.email
```

### 2. Database Queries

```typescript
// ✅ Good: Use Prisma parameterized queries
await prisma.user.findUnique({
  where: { email: validatedEmail },
})

// ❌ Bad: Raw SQL with string interpolation
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`
```

### 3. Error Handling

```typescript
// ✅ Good: Generic error messages
catch (error) {
  res.status(500).json({ error: 'Internal server error' });
}

// ❌ Bad: Exposing internal errors
catch (error) {
  res.status(500).json({ error: error.message, stack: error.stack });
}
```

### 4. Logging

```typescript
// ✅ Good: Sanitized logging
import { sanitizeObject } from '@/lib/security'
logger.info('User action', sanitizeObject(userData))

// ❌ Bad: Logging sensitive data
logger.info('User data', userData)
```

---

## Security Checklist

### Pre-Deployment

- [ ] All environment variables set
- [ ] HTTPS enabled in production
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CSRF protection enabled for state-changing operations
- [ ] SQL injection checks in place
- [ ] Input validation schemas defined
- [ ] Error messages sanitized
- [ ] Log sanitization enabled
- [ ] Dependencies audited

### Monthly Review

- [ ] Run `npm audit` and address vulnerabilities
- [ ] Review failed authentication attempts
- [ ] Check rate limit violations
- [ ] Review banned IPs
- [ ] Update dependencies with security patches

### After Updates

- [ ] Re-run security tests
- [ ] Check for new vulnerability patterns
- [ ] Update security documentation
- [ ] Review CSP configuration

---

## Incident Response

### Security Breach Response Plan

1. **Immediate Actions (0-1 hour)**
   - Identify affected systems
   - Isolate compromised components
   - Revoke affected tokens/keys
   - Enable enhanced logging

2. **Investigation (1-24 hours)**
   - Analyze logs and patterns
   - Identify attack vectors
   - Assess data exposure
   - Document findings

3. **Remediation (24-72 hours)**
   - Patch vulnerabilities
   - Update security rules
   - Rotate credentials
   - Deploy fixes

4. **Post-Incident (1 week)**
   - Post-mortem analysis
   - Update security documentation
   - Implement additional safeguards
   - User notification if required

### Emergency Contacts

- Security Team: [configured internally]
- On-Call Engineer: [configured internally]
- Infrastructure: [configured internally]

---

## Dependencies Security

### Running Security Audits

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check for known issues
npm audit --json > audit-report.json
```

### Dependency Versions

Critical dependencies and their security status:

| Package   | Version | Status    |
| --------- | ------- | --------- |
| next      | 16.2.1  | ✅ Secure |
| react     | 19.2.4  | ✅ Secure |
| jose      | 6.2.1   | ✅ Secure |
| socket.io | 4.8.3   | ✅ Secure |

### Secret Detection

Run secret detection before commits:

```bash
# Using git-secrets (install first)
git secrets --scan

# Or using trufflehog
trufflehog git file://. --fail
```

---

## Security Testing

### Running Security Tests

```bash
# Run all security tests
npm run test:security

# Run specific security test suites
npm run test -- src/lib/security/
```

### Test Coverage

- Unit tests for all security modules
- Integration tests for middleware
- E2E tests for authentication flows
- Penetration testing checklist

---

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do not** create a public GitHub issue
2. Email security@7zi.com with details
3. Include steps to reproduce
4. Allow 72 hours for initial response

We follow responsible disclosure and will credit researchers who report valid vulnerabilities.

---

## Changelog

### v1.4.0 (2026-03-29)

- Added AES-256-GCM encryption module
- Added WebSocket security (rate limiting, message validation, auto-ban)
- Added CSRF token protection
- Added HMAC request signature verification
- Added SQL injection pattern detection
- Added log sanitization utilities
- Updated security headers configuration
- Created comprehensive SECURITY.md documentation

### v1.3.0 (2026-03-28)

- Enhanced rate limiting with Redis support
- Added RBAC system
- Security headers improvements

### v1.2.0 (2026-03-26)

- Initial security audit implementation
- Basic rate limiting
- Input validation enhancements

---

_Last updated: 2026-03-29_
_Security Level: P1 (Production Ready)_
