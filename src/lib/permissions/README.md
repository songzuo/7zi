# RBAC System for 7zi Project

Complete Role-Based Access Control (RBAC) system with fine-grained permissions, multi-role support, and full frontend/backend integration.

## 🎯 Features

- ✅ **Multi-role support**: Users can have multiple roles simultaneously
- ✅ **40 granular permissions**: Across 10 categories (users, teams, tasks, approvals, reports, system, logs, agents, wallets, settings)
- ✅ **4 predefined roles**: Admin, Manager, Member, Viewer
- ✅ **Database-backed**: Persistent storage with proper relationships
- ✅ **Type-safe**: Full TypeScript support with enums
- ✅ **Frontend integration**: React context with hooks and gates
- ✅ **13 middleware functions**: Easy-to-use API route protection
- ✅ **Backward compatible**: Maintains legacy single-role support
- ✅ **Fully tested**: Comprehensive test suite

## 📦 Installation

### 1. Apply Database Migration

```bash
node scripts/migrate-rbac.js
```

Or programmatically:

```typescript
import { migrate } from '@/lib/permissions/migrations';
await migrate();
```

### 2. Seed Default Roles & Permissions

```typescript
import { seedDefaultRolesAndPermissions } from '@/lib/permissions';
await seedDefaultRolesAndPermissions();
```

### 3. Wrap App with PermissionProvider (Frontend)

```typescript
// app/layout.tsx
import { PermissionProvider } from '@/contexts/PermissionContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PermissionProvider>{children}</PermissionProvider>
      </body>
    </html>
  );
}
```

## 🚀 Quick Start

### Server-side (API Routes)

```typescript
import { withPermissions, withRole } from '@/lib/permissions';
import { Permission, Role } from '@/lib/permissions/types';

export async function DELETE(request: NextRequest) {
  return withPermissions(Permission.USER_DELETE)(request, async (req, context) => {
    // User has permission, proceed
    return NextResponse.json({ success: true });
  });
}

export async function GET(request: NextRequest) {
  return withRole(Role.ADMIN)(request, async (req, context) => {
    // User is admin, proceed
    return NextResponse.json({ data: '...' });
  });
}
```

### Client-side (React Components)

```typescript
import { usePermissions, PermissionGate, RoleGate } from '@/contexts/PermissionContext';
import { Permission, Role } from '@/lib/permissions/types';

export function MyComponent() {
  const { hasPermission, hasRole } = usePermissions();

  return (
    <div>
      {hasPermission(Permission.USER_UPDATE) && (
        <button>Edit User</button>
      )}

      <PermissionGate permission={Permission.USER_CREATE}>
        <button>Create User</button>
      </PermissionGate>

      <RoleGate role={Role.ADMIN}>
        <button>Admin Panel</button>
      </RoleGate>
    </div>
  );
}
```

## 📚 Documentation

- **[Full Implementation Guide](./docs/RBAC_IMPLEMENTATION.md)** - Complete documentation
- **[Quick Reference](./docs/RBAC_QUICK_REFERENCE.md)** - TL;DR and cheat sheet
- **[Implementation Summary](./RBAC_IMPLEMENTATION_SUMMARY.md)** - Project summary
- **[Usage Examples](./src/lib/permissions/examples.ts)** - Code examples

## 📁 File Structure

```
src/
├── lib/permissions/
│   ├── index.ts                    # Main export (1.3 KB)
│   ├── types.ts                    # Type definitions (3.9 KB)
│   ├── rbac.ts                     # Core RBAC functions (9.9 KB)
│   ├── repository.ts                # Database operations (11.3 KB)
│   ├── middleware.ts               # API middleware (9.2 KB)
│   ├── seed.ts                     # Default roles seeding (4.6 KB)
│   ├── migrations.ts               # Database migrations (4.2 KB)
│   ├── examples.ts                 # Usage examples (14.6 KB)
│   └── __tests__/
│       └── rbac.test.ts            # Test suite (11.4 KB)
├── contexts/
│   └── PermissionContext.tsx       # React context (6.5 KB)
└── lib/auth/
    ├── types-rbac.ts              # Enhanced types (4.0 KB)
    └── middleware-rbac.ts         # Enhanced middleware (9.5 KB)

scripts/
└── migrate-rbac.js                 # Migration script (0.9 KB)

docs/
├── RBAC_IMPLEMENTATION.md          # Full guide (12.8 KB)
└── RBAC_QUICK_REFERENCE.md         # Quick reference (9.7 KB)

RBAC_IMPLEMENTATION_SUMMARY.md      # Summary (12.9 KB)
```

**Total**: ~2,200+ lines, ~85 KB

## 🔐 Roles & Permissions

### Roles

| Role | Description | Permissions |
|------|-------------|--------------|
| **Admin** | Full system access | All 40 permissions |
| **Manager** | Team management | ~30 permissions |
| **Member** | Standard team member | ~15 permissions |
| **Viewer** | Read-only access | ~6 permissions |

### Permission Categories

- **Users**: read, create, update, delete, manage_role
- **Teams**: read, create, update, delete, add_member, remove_member, manage
- **Tasks**: read, create, update, delete, batch, assign
- **Settings**: read, update, manage
- **Approvals**: read, create, update, delete, approve, reject, manage
- **Reports**: export, view, manage
- **System**: read, manage, config
- **Logs**: read, export
- **AI Agents**: read, create, update, delete, manage, execute
- **Wallets**: read, manage, transfer

## 🛠️ Available Middleware

```typescript
// Permission checks
withPermissions(...permissions)              // ALL permissions required
withAnyPermission(...permissions)             // ANY permission required

// Role checks
withRole(role)                                // Specific role required
withAnyRole(...roles)                        // ANY role required
withAllRoles(...roles)                        // ALL roles required

// Convenience functions
withAdmin()                                   // Admin only
withManagerOrAdmin()                          // Manager or admin
withMemberOrHigher()                          // Member or higher

// Advanced
withPermissionOrRole(permission, role)         // Permission OR role
withPermissionAndRole(permission, role)        // Permission AND role

// Context access
withPermissionContext()                        // Provides context
requirePermissionContext()                     // Requires auth
withOptionalPermissionContext()               // Optional auth
```

## 🎨 Frontend Components

```typescript
// Hooks
const { hasPermission, hasRole, context, loading } = usePermissions();

// Gates
<PermissionGate permission={Permission.USER_CREATE}>
  <button>Create User</button>
</PermissionGate>

<RoleGate role={Role.ADMIN}>
  <button>Admin Panel</button>
</RoleGate>

<AnyRoleGate roles={[Role.ADMIN, Role.MANAGER]}>
  <button>Manage Team</button>
</AnyRoleGate>

// HOCs
withPermission(Permission.USER_UPDATE)(MyComponent);
withRole(Role.ADMIN)(MyComponent);
```

## 💾 Database Operations

```typescript
import {
  addRolesToUser,
  removeRolesFromUser,
  getUserRoles,
  assignPermissionsToRole,
  getAllRoles,
} from '@/lib/permissions';

// Manage user roles
await addRolesToUser('user123', [Role.ADMIN], 'admin456');
await removeRolesFromUser('user123', [Role.MANAGER]);
const roles = await getUserRoles('user123');

// Manage role permissions
await assignPermissionsToRole(
  Role.MANAGER,
  [Permission.SYSTEM_READ],
  'admin456'
);
const allRoles = await getAllRoles();
```

## 🧪 Testing

```bash
npm test -- src/lib/permissions/__tests__/rbac.test.ts
```

Test coverage includes:
- ✅ Role definitions
- ✅ Permission checks
- ✅ Multi-role support
- ✅ Database operations
- ✅ Permission context
- ✅ Helper functions

## 🔒 Security

- ✅ All permission checks happen server-side
- ✅ JWT tokens include permissions for quick validation
- ✅ Database queries are parameterized (SQL injection safe)
- ✅ Permission context built from database (not just JWT)
- ✅ Sensitive operations require admin role
- ✅ Audit trail for role assignments

## ⚡ Performance

- ✅ Indexes on foreign keys for fast lookups
- ✅ Computed permissions in role table (avoid JOINs)
- ✅ Cached permission context in JWT token
- ✅ Database connection pooling
- ✅ Prepared statements for repeated queries

## 🔄 Migration & Rollback

### Apply Migration

```typescript
import { migrate } from '@/lib/permissions/migrations';
await migrate();
```

### Check Status

```typescript
import { getMigrationStatus } from '@/lib/permissions/migrations';
const status = await getMigrationStatus();
console.log(status.applied); // true/false
```

### Rollback

```typescript
import { rollback } from '@/lib/permissions/migrations';
await rollback();
```

## 📊 Migration Checklist

- [x] Design RBAC model (4 roles, 40 permissions)
- [x] Create database schema (3 new tables, 1 column)
- [x] Implement core RBAC functions
- [x] Create permission middleware (13 functions)
- [x] Build React context for frontend
- [x] Write comprehensive tests
- [x] Create migration scripts
- [x] Write documentation
- [x] Provide usage examples

## 🎯 Next Steps

1. **Apply Migration**: Run `node scripts/migrate-rbac.js`
2. **Seed Default Roles**: Call `seedDefaultRolesAndPermissions()`
3. **Update Existing Users**: Migrate to multi-role system
4. **Apply to API Routes**: Add RBAC middleware to routes
5. **Update Frontend**: Wrap app with PermissionProvider
6. **Add Permission Gates**: Use in UI components
7. **Test Thoroughly**: Test all permission scenarios
8. **Monitor Usage**: Track which permissions are used

## 🔗 Related Files

- [Full Documentation](./docs/RBAC_IMPLEMENTATION.md)
- [Quick Reference](./docs/RBAC_QUICK_REFERENCE.md)
- [Implementation Summary](./RBAC_IMPLEMENTATION_SUMMARY.md)
- [Usage Examples](./src/lib/permissions/examples.ts)

## 📄 License

Part of 7zi AI Team Management Platform

## 🤝 Contributing

When modifying RBAC system:

1. Update type definitions in `types.ts`
2. Add tests for new functionality
3. Update documentation
4. Run tests to ensure nothing breaks
5. Test migration rollback capability

## ⚠️ Important Notes

- Never trust frontend permissions - always validate server-side
- Use HTTPS for all API calls
- Secure JWT tokens with strong secrets
- Log all permission changes
- Regularly review role-permission mappings
- Follow principle of least privilege

## 🆘 Troubleshooting

See [Quick Reference](./docs/RBAC_QUICK_REFERENCE.md#troubleshooting) for common issues and solutions.

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: 2026-03-19
