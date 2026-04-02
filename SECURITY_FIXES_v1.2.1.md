# Security Fixes v1.2.1

**Date:** 2026-03-28
**Version:** v1.2.1
**Type:** Security Patch

## Summary

This security patch addresses 7 API security vulnerabilities identified in the v1.2.0 security audit. All issues have been fixed with proper authentication, authorization, and CORS controls.

## Vulnerabilities Fixed

### High Risk (1)

1. **`/api/notifications/preferences/[userId]`** - Unauthorized access to user preferences
   - **Issue:** No authentication - any user could access/modify any user's preferences
   - **Fix:** Added JWT authentication with user ownership verification
   - **Impact:** Users can now only access their own preferences (unless admin)

### Medium Risk (6)

2. **`/api/mcp/rpc`** - CORS open, no authentication
   - **Issue:** Open CORS policy (`*`), no API key validation
   - **Fix:**
     - Added API Key authentication via `X-API-Key` header or `api_key` query param
     - Restricted CORS origins to configurable whitelist (`ALLOWED_MCP_ORIGINS`)
     - Returns 401 for invalid/missing API keys
   - **Impact:** MCP endpoint now requires valid API keys and respects CORS whitelist

3. **`/api/notifications`** - No authentication
   - **Issue:** Anyone could create/view notifications
   - **Fix:** Added JWT authentication with user ownership enforcement
   - **Impact:** Only authenticated users can access notifications (limited to their own)

4. **`/api/notifications/[id]`** - Unauthorized access to notifications
   - **Issue:** No authentication or ownership verification
   - **Fix:** Added JWT authentication + ownership check on each request
   - **Impact:** Users can only access notifications they own (unless admin)

5. **`/api/notifications/stats`** - Exposes system statistics
   - **Issue:** No authentication - exposed sensitive system metrics
   - **Fix:** Added JWT authentication with admin role requirement
   - **Impact:** Only admins can view system-wide statistics

6. **`/api/notifications/socket`** - Unauthorized socket initialization
   - **Issue:** No authentication - could initialize/monitor socket server
   - **Fix:** Added JWT authentication with admin role requirement
   - **Impact:** Only admins can view socket status or initialize socket server

7. **`/api/notifications/enhanced`** - No authentication
   - **Issue:** Anyone could create/view enhanced notifications
   - **Fix:** Added JWT authentication with user ownership enforcement
   - **Impact:** Only authenticated users can access enhanced notifications (limited to their own)

## Implementation Details

### New Authentication Utility

Created `/src/lib/auth/api-auth.ts` - Unified authentication middleware:

- **`authenticateJWT(request)`** - Verify JWT token
- **`authenticateAPIKey(request)`** - Verify API key
- **`authenticateEither(request)`** - Try JWT first, fall back to API key
- **`withAuth(handler, options)`** - Higher-order function for protected routes
- **`verifyOwnership(authenticatedUserId, resourceUserId)`** - Check user ownership
- **`getMCPCORSHeaders(request)`** - Get CORS headers with origin validation

### Route Changes

All affected routes now:

1. **Require Authentication** - JWT or API Key verification
2. **Enforce Ownership** - Users can only access their own resources
3. **Role-Based Access** - Admins can bypass ownership restrictions
4. **CORS Control** - MCP route respects origin whitelist

### Environment Variables

Add these to your `.env` or `.env.local`:

```bash
# MCP API Keys (comma-separated, required for MCP endpoint)
MCP_API_KEYS=your-secret-api-key-1,your-secret-api-key-2

# Allowed CORS origins for MCP (comma-separated)
ALLOWED_MCP_ORIGINS=http://localhost:3000,https://yourdomain.com

# JWT Secret (should already be set)
JWT_SECRET=your-jwt-secret-change-in-production
```

## Testing

### Test Authentication

```bash
# Test protected route without token (should fail)
curl -X GET http://localhost:3000/api/notifications

# Test with JWT token (should succeed)
curl -X GET http://localhost:3000/api/notifications \
  -H "Authorization: Bearer <your-jwt-token>"

# Test ownership violation (should fail)
curl -X GET http://localhost:3000/api/notifications/preferences/other-user-id \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Test MCP API Key

```bash
# Test MCP without API key (should fail)
curl -X POST http://localhost:3000/api/mcp/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Test with valid API key (should succeed)
curl -X POST http://localhost:3000/api/mcp/rpc \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Backward Compatibility

⚠️ **Breaking Changes:**

1. **MCP Endpoint** - Now requires valid API key
   - Update MCP clients to include `X-API-Key` header
   - Configure `ALLOWED_MCP_ORIGINS` for CORS

2. **Notification Endpoints** - Now require JWT authentication
   - Update frontend to include JWT tokens in requests
   - Users can only access their own notifications

3. **Stats/Socket Endpoints** - Now require admin role
   - Ensure admin accounts have correct role assignment

## Migration Checklist

- [ ] Set `MCP_API_KEYS` environment variable
- [ ] Set `ALLOWED_MCP_ORIGINS` environment variable
- [ ] Update MCP clients to use API key authentication
- [ ] Update frontend notification calls to include JWT
- [ ] Test all notification endpoints
- [ ] Test MCP endpoint with API key
- [ ] Verify admin users can access stats/socket endpoints
- [ ] Verify regular users cannot access stats/socket endpoints
- [ ] Test ownership restrictions (user A cannot access user B's notifications)

## Security Best Practices

1. **Generate strong API keys** - Use cryptographically secure random strings
2. **Rotate API keys regularly** - Update `MCP_API_KEYS` periodically
3. **Limit CORS origins** - Only allow trusted domains in `ALLOWED_MCP_ORIGINS`
4. **Use HTTPS in production** - API keys sent over HTTP are vulnerable
5. **Monitor access logs** - Watch for failed authentication attempts
6. **Principle of least privilege** - Only give admin role when necessary

## Files Modified

### New Files

- `/src/lib/auth/api-auth.ts` - Unified authentication utilities

### Modified Files

- `/src/app/api/mcp/rpc/route.ts` - Added API key auth + CORS restrictions
- `/src/app/api/notifications/route.ts` - Added JWT auth + ownership checks
- `/src/app/api/notifications/[id]/route.ts` - Added JWT auth + ownership checks
- `/src/app/api/notifications/stats/route.ts` - Added JWT auth + admin-only
- `/src/app/api/notifications/socket/route.ts` - Added JWT auth + admin-only
- `/src/app/api/notifications/enhanced/route.ts` - Added JWT auth + ownership checks
- `/src/app/api/notifications/preferences/[userId]/route.ts` - Added JWT auth + ownership checks
- `/src/middleware.ts` - Updated public paths documentation
- `/src/middleware/auth.middleware.ts` - Updated public paths documentation

## Acknowledgments

Security audit conducted on 2026-03-26 as part of v1.2.0 release cycle.
All vulnerabilities have been addressed in this security patch.

## References

- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [API_PERMISSION_AUDIT_20260326.md](./docs/API_PERMISSION_AUDIT_20260326.md) - Original security audit
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment guide with environment variables
