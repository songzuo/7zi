# RBAC System Implementation - Complete Guide

## Overview

This document describes the complete implementation of a fine-grained Role-Based Access Control (RBAC) system for the 7zi AI Team Management Platform.

## Features

- **Multi-role support**: Users can have multiple roles simultaneously
- **Flexible permissions**: Centralized role-permission mapping
- **Type-safe**: Full TypeScript support with enums
- **Database-backed**: Persistent storage of roles, permissions, and mappings
- **Frontend integration**: React context for client-side permission checks
- **Middleware support**: Easy-to-use middleware for API route protection
- **Backward compatible**: Maintains legacy single-role support

## Architecture

### Database Schema

```sql
-- Roles table
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- User-roles mapping (many-to-many)
CREATE TABLE user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  assigned_by TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, role)
);

-- Role-permissions mapping (many-to-many)
CREATE TABLE role_permissions (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  FOREIGN KEY (role) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE(role, permission)
);
```

### Core Modules

1. **types.ts** - Type definitions for permissions, roles, and contexts
2. **rbac.ts** - Core RBAC functions (permission checking, role helpers)
3. **repository.ts** - Database operations for roles and permissions
4. **middleware.ts** - API route protection middleware
5. **seed.ts** - Default roles and permissions initialization
6. **migrations.ts** - Database migration scripts

## Permission Categories

### Users

- `user:read` - View user profiles
- `user:create` - Create new users
- `user:update` - Update user information
- `user:delete` - Delete users
- `user:manage_role` - Manage user roles

### Teams

- `team:read` - View teams
- `team:create` - Create teams
- `team:update` - Update team information
- `team:delete` - Delete teams
- `team:add_member` - Add members to teams
- `team:remove_member` - Remove members from teams
- `team:manage` - Full team management

### Tasks

- `task:read` - View tasks
- `task:create` - Create tasks
- `task:update` - Update tasks
- `task:delete` - Delete tasks
- `task:batch` - Batch operations on tasks
- `task:assign` - Assign tasks to users

### Settings

- `settings:read` - View settings
- `settings:update` - Update settings
- `settings:manage` - Full settings management

### Approvals

- `approval:read` - View approvals
- `approval:create` - Create approval requests
- `approval:update` - Update approval requests
- `approval:delete` - Delete approval requests
- `approval:approve` - Approve requests
- `approval:reject` - Reject requests
- `approval:manage` - Full approval management

### Reports

- `reports:export` - Export reports
- `reports:view` - View reports
- `reports:manage` - Full report management

### System

- `system:read` - Read system information
- `system:manage` - System management
- `system:config` - System configuration

### Logs

- `logs:read` - Read logs
- `logs:export` - Export logs

### AI Agents

- `agent:read` - View agents
- `agent:create` - Create agents
- `agent:update` - Update agents
- `agent:delete` - Delete agents
- `agent:manage` - Full agent management
- `agent:execute` - Execute agent actions

### Wallets

- `wallet:read` - View wallets
- `wallet:manage` - Manage wallets
- `wallet:transfer` - Transfer funds

## Role Definitions

### Admin

Full system access with all permissions.

### Manager

Managerial access to:

- Teams (full management)
- Tasks (full management)
- Reports (view and export)
- Approvals (read, create, update, approve, reject)
- AI Agents (create, update, delete, execute)
- Settings (read and update)

### Member

Standard team member access to:

- Tasks (read, create, update, assign)
- Teams (read-only)
- Approvals (read, create, update)
- Reports (view only)
- AI Agents (read, execute)

### Viewer

Read-only access to:

- Users (self only)
- Teams (read-only)
- Tasks (read-only)
- Approvals (read-only)
- Reports (view only)
- AI Agents (read-only)

## Usage Examples

### Server-side (API Routes)

#### Basic Permission Check

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withPermissions } from '@/lib/permissions'
import { Permission } from '@/lib/permissions/types'

export async function GET(request: NextRequest) {
  return withPermissions(Permission.USER_READ)(request, async (req, context) => {
    // User has permission, proceed
    return NextResponse.json({ data: '...' })
  })
}
```

#### Multiple Permissions (ALL required)

```typescript
export async function POST(request: NextRequest) {
  return withPermissions(Permission.USER_CREATE, Permission.TEAM_ADD_MEMBER)(
    request,
    async (req, context) => {
      // User has both permissions
      return NextResponse.json({ success: true })
    }
  )
}
```

#### Any Permission (ONE required)

```typescript
import { withAnyPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  return withAnyPermission(Permission.TEAM_READ, Permission.TASK_READ)(
    request,
    async (req, context) => {
      // User has at least one permission
      return NextResponse.json({ data: '...' })
    }
  )
}
```

#### Role Check

```typescript
import { withRole } from '@/lib/permissions'
import { Role } from '@/lib/permissions/types'

export async function GET(request: NextRequest) {
  return withRole(Role.ADMIN)(request, async (req, context) => {
    // User is admin
    return NextResponse.json({ data: '...' })
  })
}
```

#### Multiple Roles (ANY required)

```typescript
import { withAnyRole } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  return withAnyRole(Role.ADMIN, Role.MANAGER)(request, async (req, context) => {
    // User is admin OR manager
    return NextResponse.json({ data: '...' })
  })
}
```

#### Permission Context Access

```typescript
import { withPermissionContext } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  return withPermissionContext(request, async (req, context) => {
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('User roles:', context.roles)
    console.log('User permissions:', context.permissions)

    return NextResponse.json({ roles: context.roles })
  })
}
```

### Client-side (React Components)

#### Using PermissionProvider

```typescript
import { PermissionProvider } from '@/contexts/PermissionContext';

export default function App({ children }) {
  return <PermissionProvider>{children}</PermissionProvider>;
}
```

#### Using usePermissions Hook

```typescript
import { usePermissions } from '@/contexts/PermissionContext';
import { Permission, Role } from '@/lib/permissions/types';

export function UserProfile() {
  const { hasPermission, hasRole, loading, context } = usePermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <p>Roles: {context?.roles.join(', ')}</p>
      {hasPermission(Permission.USER_UPDATE) && (
        <button>Edit Profile</button>
      )}
      {hasRole(Role.ADMIN) && (
        <button>Admin Panel</button>
      )}
    </div>
  );
}
```

#### Using Permission Gates

```typescript
import { PermissionGate, RoleGate, AnyRoleGate } from '@/contexts/PermissionContext';
import { Permission, Role } from '@/lib/permissions/types';

export function Dashboard() {
  return (
    <div>
      <PermissionGate permission={Permission.USER_CREATE}>
        <button>Create User</button>
      </PermissionGate>

      <RoleGate role={Role.ADMIN}>
        <button>Admin Settings</button>
      </RoleGate>

      <AnyRoleGate roles={[Role.ADMIN, Role.MANAGER]}>
        <button>Manage Team</button>
      </AnyRoleGate>
    </div>
  );
}
```

#### Using HOCs

```typescript
import { withPermission, withRole } from '@/contexts/PermissionContext';
import { Permission, Role } from '@/lib/permissions/types';

function AdminPanel() {
  return <div>Admin Content</div>;
}

export default withRole(Role.ADMIN)(AdminPanel);

function UserEditor() {
  return <div>Edit User</div>;
}

export default withPermission(Permission.USER_UPDATE)(UserEditor);
```

### Database Operations

#### Assign Roles to User

```typescript
import { addRolesToUser } from '@/lib/permissions'
import { Role } from '@/lib/permissions/types'

await addRolesToUser('user123', [Role.ADMIN, Role.MANAGER], 'admin456')
```

#### Remove Roles from User

```typescript
import { removeRolesFromUser } from '@/lib/permissions'
import { Role } from '@/lib/permissions/types'

await removeRolesFromUser('user123', [Role.MANAGER])
```

#### Assign Permissions to Role

```typescript
import { assignPermissionsToRole } from '@/lib/permissions'
import { Role, Permission } from '@/lib/permissions/types'

await assignPermissionsToRole(
  Role.MANAGER,
  [Permission.SYSTEM_READ, Permission.LOGS_READ],
  'admin456'
)
```

#### Get User Permission Context

```typescript
import { getUserPermissionContext } from '@/lib/permissions'

const context = await getUserPermissionContext('user123')
console.log(context?.roles) // ['admin', 'manager']
console.log(context?.permissions) // ['user:read', 'team:create', ...]
```

## Migration

### Applying RBAC Migration

```typescript
import { migrate } from '@/lib/permissions/migrations'

await migrate()
```

This will:

1. Add `roles` column to users table
2. Create roles, user_roles, and role_permissions tables
3. Seed default roles and permissions

### Checking Migration Status

```typescript
import { getMigrationStatus } from '@/lib/permissions/migrations'

const status = await getMigrationStatus()
console.log(status.applied) // true/false
console.log(status.version) // '1'
```

### Rolling Back Migration

```typescript
import { rollback } from '@/lib/permissions/migrations'

await rollback()
```

## Seeding Default Roles and Permissions

```typescript
import { seedDefaultRolesAndPermissions } from '@/lib/permissions'

const result = await seedDefaultRolesAndPermissions()
console.log(result.success)
console.log(result.rolesSeeded)
console.log(result.permissionsSeeded)
```

## Testing

Run the RBAC tests:

```bash
npm test -- src/lib/permissions/__tests__/rbac.test.ts
```

## Best Practices

1. **Use permissions over roles**: Prefer granular permission checks over role checks
2. **Create custom roles**: For specialized access patterns, create custom roles
3. **Minimize custom permissions**: Use role-permission mappings instead
4. **Cache permission context**: Avoid repeated database queries
5. **Audit role changes**: Track who assigned/removed roles and when
6. **Use middleware**: Apply middleware at the route level for consistent protection
7. **Frontend validation**: Use Permission Gates for UI elements, but always validate server-side

## Security Considerations

- **Never trust frontend permissions**: Always validate on the server
- **Use HTTPS**: All API calls should be over HTTPS
- **Secure JWT tokens**: Use strong secrets and short expiration times
- **Audit sensitive actions**: Log permission changes and administrative actions
- **Regular reviews**: Periodically review role-permission mappings
- **Principle of least privilege**: Grant only necessary permissions

## Troubleshooting

### Permissions not updating

1. Check if migration has been applied
2. Verify roles are seeded in database
3. Clear browser cache and re-authenticate
4. Check JWT token expiration

### Role assignments not working

1. Verify user_roles table has correct entries
2. Check role-permission mappings
3. Ensure user is using fresh JWT token
4. Review database logs for errors

### Frontend permission checks failing

1. Verify PermissionProvider is in component tree
2. Check token is stored in localStorage
3. Ensure token is sent in Authorization header
4. Check browser console for errors

## Future Enhancements

- Permission groups for easier management
- Role hierarchies and inheritance
- Time-based permissions (temporary access)
- IP-based restrictions
- Rate limiting per permission
- Permission revocation workflows
- Advanced audit logging
- Permission templates for common patterns

## Support

For issues or questions, please refer to:

- API Documentation: `/docs/API.md`
- Code Comments: Each module is fully documented
- Test Cases: `/src/lib/permissions/__tests__/`
