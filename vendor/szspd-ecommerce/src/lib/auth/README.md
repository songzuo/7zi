# Authentication Module

## Overview

The authentication module provides a complete user authentication and authorization system for the 7zi platform. It supports JWT-based authentication, role-based access control (RBAC), password management, and session management.

## Features

- ✅ User registration and login
- ✅ JWT token generation and validation
- ✅ Token refresh mechanism
- ✅ Role-based permissions (Admin, Manager, Member, Guest)
- ✅ Password hashing with PBKDF2
- ✅ Password strength validation
- ✅ Password reset via email tokens
- ✅ Session management with revocation
- ✅ Protected API routes with middleware
- ✅ TypeScript type safety
- ✅ SQLite database integration

## Installation

The module is already integrated into the project. Ensure you have the following dependencies:

```bash
npm install jose
```

## Configuration

### Environment Variables

Required environment variables in `.env`:

```env
# JWT secret key (REQUIRED - change in production)
JWT_SECRET=your-secret-key-here

# Alternative encryption key (fallback)
AGENT_ENCRYPTION_SECRET=your-encryption-key-here

# Database path (optional, defaults to /tmp/7zi-database.sqlite)
DATABASE_PATH=/path/to/database.sqlite
```

### Database Tables

The module creates the following SQLite tables:

- `users` - User accounts with credentials
- `user_tokens` - JWT access and refresh tokens
- `password_reset_tokens` - Temporary tokens for password reset

## Usage

### 1. User Registration

```typescript
import { registerUser } from '@/lib/auth'

const result = await registerUser({
  email: 'user@example.com',
  password: 'SecurePass123!',
  name: 'John Doe',
  role: 'member', // optional, defaults to 'member'
})

if (result.success) {
  console.log('User registered:', result.user)
} else {
  console.error('Registration failed:', result.error)
}
```

### 2. User Login

```typescript
import { loginUser } from '@/lib/auth'

const result = await loginUser({
  email: 'user@example.com',
  password: 'SecurePass123!',
  rememberMe: true, // optional, extends token expiration
})

if (result.success) {
  const { token, refreshToken, user } = result
  // Store token in localStorage/cookie
  localStorage.setItem('auth_token', token)
  localStorage.setItem('refresh_token', refreshToken)
}
```

### 3. Protecting API Routes

```typescript
import { withUserAuth, withPermissions } from '@/lib/auth/middleware'
import { NextRequest, NextResponse } from 'next/server'

// Require authentication
export async function GET(request: NextRequest) {
  return withUserAuth(request, async (req, context) => {
    // context contains userId, email, role, permissions
    return NextResponse.json({ message: 'Hello user!' })
  })
}

// Require specific permissions
export async function POST(request: NextRequest) {
  return withPermissions('write:tasks', 'delete:tasks')(request, async (req, context) => {
    // User has both write:tasks and delete:tasks permissions
    return NextResponse.json({ message: 'Authorized!' })
  })
}
```

### 4. Token Refresh

```typescript
import { refreshToken } from '@/lib/auth'

const result = await refreshToken({
  refreshToken: localStorage.getItem('refresh_token'),
})

if (result.success) {
  localStorage.setItem('auth_token', result.token)
  localStorage.setItem('refresh_token', result.refreshToken)
}
```

### 5. Password Change

```typescript
import { changePassword } from '@/lib/auth'

const result = await changePassword(userId, 'currentPassword', 'newPassword123!')

if (result.success) {
  console.log('Password changed successfully')
}
```

### 6. Password Reset

```typescript
import { initiatePasswordReset, resetPassword } from '@/lib/auth'

// Step 1: Send reset email
const initResult = await initiatePasswordReset('user@example.com')
if (initResult.success) {
  // Send initResult.token via email
}

// Step 2: Reset password with token
const resetResult = await resetPassword(token, 'NewPassword123!')
```

## User Roles and Permissions

### Roles

- **admin** - Full system access
- **manager** - Team management, task management
- **member** - Basic task access
- **guest** - Read-only profile access

### Default Permissions by Role

| Permission     | Admin | Manager | Member | Guest |
| -------------- | ----- | ------- | ------ | ----- |
| read:profile   | ✅    | ✅      | ✅     | ✅    |
| read:tasks     | ✅    | ✅      | ✅     | ❌    |
| write:tasks    | ✅    | ✅      | ✅     | ❌    |
| delete:tasks   | ✅    | ✅      | ❌     | ❌    |
| write:users    | ✅    | ❌      | ❌     | ❌    |
| delete:users   | ✅    | ❌      | ❌     | ❌    |
| manage:system  | ✅    | ❌      | ❌     | ❌    |
| manage:team    | ✅    | ✅      | ❌     | ❌    |
| access:logs    | ✅    | ❌      | ❌     | ❌    |
| access:reports | ✅    | ✅      | ❌     | ❌    |

### Permission Checking

```typescript
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/auth'

// Single permission
if (hasPermission(user.permissions, 'write:tasks')) {
  // Allow action
}

// Any permission
if (hasAnyPermission(user.permissions, ['write:tasks', 'delete:tasks'])) {
  // Allow if user has either permission
}

// All permissions
if (hasAllPermissions(user.permissions, ['write:tasks', 'manage:team'])) {
  // Allow only if user has both permissions
}
```

## API Endpoints

### POST `/api/auth/register`

Register a new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "role": "member" // optional
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "member",
    "status": "active",
    "permissions": ["read:profile", "read:tasks"],
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### POST `/api/auth/login`

Login with email and password.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "rememberMe": false
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    /* user object */
  },
  "token": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "expiresAt": "2024-01-01T01:00:00Z"
}
```

### POST `/api/auth/logout`

Logout and invalidate token.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST `/api/auth/refresh`

Refresh expired access token.

**Request:**

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response:**

```json
{
  "success": true,
  "token": "new-jwt-access-token",
  "refreshToken": "new-jwt-refresh-token",
  "expiresAt": "2024-01-01T02:00:00Z"
}
```

### GET `/api/auth/me`

Get current user information.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "user": {
    /* user object without password */
  }
}
```

## Security Features

### Password Hashing

- Uses PBKDF2 with SHA-512
- 10,000 iterations
- Random salt for each password
- No plain text storage

### JWT Security

- HS256 signing algorithm
- Token expiration (1 hour default, 7 days with remember me)
- Refresh token expiration (14 days)
- Token revocation support

### Password Strength

- Minimum 8 characters
- Requires uppercase letter
- Requires lowercase letter
- Requires number

### Session Management

- Token storage in database
- Last used tracking
- Bulk revocation support
- Password change invalidates all sessions

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  permissions TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);
```

### User Tokens Table

```sql
CREATE TABLE user_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  refresh_expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Password Reset Tokens Table

```sql
CREATE TABLE password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Testing

Run the test suite:

```bash
npm test src/lib/auth/__tests__/auth.test.ts
```

## Middleware Options

The module provides several middleware helpers:

- `withUserAuth` - Require authentication
- `withPermissions(...permissions)` - Require specific permissions (all)
- `withAnyPermission(...permissions)` - Require any of the permissions
- `withAdmin` - Require admin role
- `withManagerOrAdmin` - Require manager or admin role
- `withOptionalAuth` - Optional authentication (doesn't fail if no token)

## Error Handling

All API responses follow a consistent format:

**Success:**

```json
{
  "success": true,
  "data": {
    /* response data */
  }
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_123"
  }
}
```

## Common Error Codes

- `VALIDATION_ERROR` - Invalid input data
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `REGISTRATION_FAILED` - Email already registered
- `AUTH_FAILED` - Invalid credentials
- `INVALID_TOKEN` - Token is invalid or expired
- `FORBIDDEN` - Insufficient permissions
- `USER_NOT_FOUND` - User doesn't exist
- `INTERNAL_ERROR` - Server error

## Best Practices

1. **Always use HTTPS** in production
2. **Rotate JWT_SECRET** periodically
3. **Store tokens securely** (httpOnly cookies recommended)
4. **Implement rate limiting** on login endpoints
5. **Log authentication events** for security auditing
6. **Use strong passwords** (enforce via policy)
7. **Implement 2FA** for sensitive operations
8. **Regular security audits** of authentication flow

## Contributing

When extending the auth module:

1. Add comprehensive tests
2. Update this documentation
3. Follow TypeScript best practices
4. Ensure backward compatibility
5. Consider security implications

## License

Part of the 7zi AI Team Management Platform.
