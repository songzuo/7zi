/**
 * RBAC Usage Examples
 * This file contains comprehensive examples of how to use the RBAC system
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Link from 'next/link';
import { useMemo } from 'react';

import {
  withPermissions,
  withAnyPermission,
  withRole,
  withAnyRole,
  addRolesToUser,
  removeRolesFromUser,
  assignPermissionsToRole
} from '@/lib/permissions';
import { Permission, Role } from '@/lib/permissions/types';
import { hasPermission, hasRole, isAdmin } from '@/lib/permissions/rbac';
import {
  PermissionProvider,
  usePermissions,
  PermissionGate,
  RoleGate,
  AnyRoleGate,
  withPermission,
  withRole as withRoleHOC
} from '@/contexts/PermissionContext';

// ============================================================================
// MOCK FUNCTIONS FOR EXAMPLES
// ============================================================================
// These are placeholder types for example functions that would be implemented elsewhere

interface MockPermissionContext {
  roles?: string[];
  userId?: string;
  permissions?: string[];
}

declare function getAllUsers(): Promise<unknown[]>;
declare function createUser(data: unknown): Promise<unknown>;
declare function updateUser(data: unknown): Promise<unknown>;
declare function deleteUser(id: string): Promise<void>;
declare function getUserById(id: string): Promise<MockPermissionContext | null>;
declare function updateUserRole(userId: string, newRole: string): Promise<void>;
declare const tasks: Array<{ id: string; title: string }>;
declare const userId: string;
declare const targetUserId: string;

// ============================================================================
// SERVER-SIDE EXAMPLES
// ============================================================================

// Example 1: Basic Permission Check
export async function getUserProfile(request: NextRequest) {
  return withPermissions(Permission.USER_READ)(request, async (_req, _context) => {
    // User has permission to read user profiles
    return NextResponse.json({ data: 'User profile data' });
  });
}

// Example 2: Multiple Permissions (ALL Required)
export async function createTeam(request: NextRequest) {
  return withPermissions(
    Permission.TEAM_CREATE,
    Permission.TEAM_ADD_MEMBER
  )(request, async (_req, _context) => {
    // User has both permissions
    return NextResponse.json({ success: true });
  });
}

// Example 3: Any Permission (ONE Required)
export async function viewDashboard(request: NextRequest) {
  return withAnyPermission(
    Permission.TEAM_READ,
    Permission.TASK_READ,
    Permission.APPROVAL_READ
  )(request, async (_req, _context) => {
    // User has at least one of these permissions
    return NextResponse.json({ data: 'Dashboard data' });
  });
}

// Example 4: Role Check
export async function getSystemLogs(request: NextRequest) {
  return withRole(Role.ADMIN)(request, async (_req, _context) => {
    // User is an admin
    return NextResponse.json({ data: 'System logs' });
  });
}

// Example 5: Multiple Roles (ANY Required)
export async function manageTeam(request: NextRequest) {
  return withAnyRole(Role.ADMIN, Role.MANAGER)(request, async (_req, _context) => {
    // User is either admin OR manager
    return NextResponse.json({ data: 'Team management data' });
  });
}

// Example 6: Admin or Manager (Convenience Function)
export async function approveRequest(request: NextRequest) {
  return withAnyRole(Role.ADMIN, Role.MANAGER)(request, async (_req, _context) => {
    // User is manager or admin
    return NextResponse.json({ success: true });
  });
}

// Example 7: Permission Context Access
export async function getMyPermissions(request: NextRequest) {
  return withAnyRole(Role.ADMIN, Role.MANAGER)(request, async (_req, context) => {
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      userId: context.userId,
      roles: context.roles,
      permissions: context.permissions,
    });
  });
}

// Example 8: Database Operations
async function manageUserRole() {
  // Add admin role to user
  await addRolesToUser('user123', [Role.ADMIN], 'admin456');

  // Remove manager role from user
  await removeRolesFromUser('user123', [Role.MANAGER]);

  // Assign custom permissions to manager role
  await assignPermissionsToRole(
    Role.MANAGER,
    [Permission.SETTINGS_READ, Permission.SETTINGS_UPDATE],
    'admin456'
  );
}

// Example 9: Complex Authorization Logic
export async function deleteUserAccount(request: NextRequest) {
  return withAnyRole(Role.ADMIN, Role.MANAGER)(request, async (_req, context) => {
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin can delete any user
    if (isAdmin(context)) {
      // Proceed with deletion
      return NextResponse.json({ success: true });
    }

    // Managers can delete users without admin role
    if (
      hasRole(context, Role.MANAGER) &&
      hasPermission(context, Permission.USER_DELETE)
    ) {
      // Check if target user is not admin
      const targetUser = await getUserById(userId);
      if (targetUser && !targetUser.roles?.includes(Role.ADMIN)) {
        // Proceed with deletion
        return NextResponse.json({ success: true });
      }
    }

    // User can delete their own account
    if (
      hasPermission(context, Permission.USER_UPDATE) &&
      context.userId === targetUserId
    ) {
      // Proceed with deletion
      return NextResponse.json({ success: true });
    }

    // Permission denied
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  });
}

// Example 10: API Route with Multiple Endpoints
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  return withPermissions(Permission.USER_READ)(request, async (_req, _context) => {
    // GET - list users
    const users = await getAllUsers();
    return NextResponse.json({ success: true, data: users });
  });
}

export async function POST(request: NextRequest) {
  return withPermissions(Permission.USER_CREATE)(request, async (_req, _context) => {
    // POST - create user
    const body = await request.json();
    const user = await createUser(body);
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  });
}

export async function PUT(request: NextRequest) {
  return withPermissions(Permission.USER_UPDATE)(request, async (_req, _context) => {
    // PUT - update user
    const body = await request.json();
    const user = await updateUser(body);
    return NextResponse.json({ success: true, data: user });
  });
}

export async function DELETE(request: NextRequest) {
  return withRole(Role.ADMIN)(request, async (_req, _context) => {
    // DELETE - admin only
    const { searchParams } = new URL(request.url);
    const userIdToDelete = searchParams.get('id');
    if (userIdToDelete) {
      await deleteUser(userIdToDelete);
    }
    return NextResponse.json({ success: true });
  });
}

// ============================================================================
// CLIENT-SIDE EXAMPLES
// ============================================================================

// Example 11: Using PermissionProvider
export function App({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <PermissionProvider>
          {children}
        </PermissionProvider>
      </body>
    </html>
  );
}

// Example 12: Using usePermissions Hook
export function UserProfile() {
  const {
    hasPermission,
    hasAllPermissions,
    isAdmin,
    isManagerOrAdmin,
    context,
    loading,
  } = usePermissions();

  if (loading) {
    return <div>Loading permissions...</div>;
  }

  return (
    <div>
      <h1>User Profile</h1>
      <p>Roles: {context?.roles.join(', ')}</p>
      <p>Permissions: {context?.permissions.length}</p>

      {hasPermission(Permission.USER_UPDATE) && (
        <button>Edit Profile</button>
      )}

      {isAdmin() && (
        <button>Admin Panel</button>
      )}

      {isManagerOrAdmin() && (
        <button>Team Management</button>
      )}

      {hasAllPermissions([Permission.TASK_READ, Permission.TASK_CREATE]) && (
        <div>Full task access</div>
      )}
    </div>
  );
}

// Example 13: Using Permission Gates
export function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <PermissionGate permission={Permission.USER_CREATE}>
        <button>Create User</button>
      </PermissionGate>

      <PermissionGate
        permission={Permission.SETTINGS_UPDATE}
        fallback={<div>You don&apos;t have system management access</div>}
      >
        <button>System Settings</button>
      </PermissionGate>

      <RoleGate role={Role.ADMIN}>
        <button>Admin Panel</button>
      </RoleGate>

      <AnyRoleGate roles={[Role.ADMIN, Role.MANAGER]}>
        <button>Manage Team</button>
      </AnyRoleGate>
    </div>
  );
}

// Example 14: Using Higher-Order Components
function AdminPanel() {
  return <div>Admin Panel Content</div>;
}

export const AdminPanelWithRole = withRoleHOC(Role.ADMIN)(AdminPanel);

function UserEditor() {
  return <div>User Editor Content</div>;
}

export const UserEditorWithPermission = withPermission(Permission.USER_UPDATE)(UserEditor);

// Example 15: Conditional Rendering
export function TaskList() {
  const { hasPermission, hasAnyPermission } = usePermissions();

  return (
    <div>
      <h2>Tasks</h2>

      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            {task.title}

            {hasPermission(Permission.TASK_UPDATE) && (
              <button>Edit</button>
            )}

            {hasPermission(Permission.TASK_DELETE) && (
              <button>Delete</button>
            )}

            {hasAnyPermission([
              Permission.TASK_READ,
              Permission.APPROVAL_APPROVE
            ]) && (
              <button>Approve</button>
            )}
          </li>
        ))}
      </ul>

      {hasPermission(Permission.TASK_CREATE) && (
        <button>Create New Task</button>
      )}
    </div>
  );
}

// Example 16: Dynamic Menu Based on Permissions
export function Navigation() {
  const { hasPermission, hasRole, hasAnyRole } = usePermissions();

  return (
    <nav>
      <ul>
        <li><Link href="/dashboard">Dashboard</Link></li>

        {hasPermission(Permission.USER_READ) && (
          <li><Link href="/users">Users</Link></li>
        )}

        {hasPermission(Permission.TASK_READ) && (
          <li><Link href="/tasks">Tasks</Link></li>
        )}

        {hasAnyRole([Role.ADMIN, Role.MANAGER]) && (
          <li><Link href="/team">Team Management</Link></li>
        )}

        {hasRole(Role.ADMIN) && (
          <li><Link href="/admin">Admin Panel</Link></li>
        )}
      </ul>
    </nav>
  );
}

// ============================================================================
// ADVANCED EXAMPLES
// ============================================================================

// Example 17: Permission Checker Hook (Custom Hook)
export function usePermissionChecker() {
  const { hasPermission, hasRole } = usePermissions();

  const can = useMemo(() => ({
    // Users
    readUsers: hasPermission(Permission.USER_READ),
    createUser: hasPermission(Permission.USER_CREATE),
    updateUser: hasPermission(Permission.USER_UPDATE),
    deleteUser: hasPermission(Permission.USER_DELETE),
    manageUserRoles: hasPermission(Permission.USER_MANAGE_ROLE),

    // Teams
    readTeam: hasPermission(Permission.TEAM_READ),
    createTeam: hasPermission(Permission.TEAM_CREATE),
    updateTeam: hasPermission(Permission.TEAM_UPDATE),
    deleteTeam: hasPermission(Permission.TEAM_DELETE),
    addTeamMember: hasPermission(Permission.TEAM_ADD_MEMBER),
    removeTeamMember: hasPermission(Permission.TEAM_REMOVE_MEMBER),

    // Tasks
    readTask: hasPermission(Permission.TASK_READ),
    createTask: hasPermission(Permission.TASK_CREATE),
    updateTask: hasPermission(Permission.TASK_UPDATE),
    deleteTask: hasPermission(Permission.TASK_DELETE),
    assignTask: hasPermission(Permission.TASK_BATCH),

    // System
    isAdmin: hasRole(Role.ADMIN),
    isManager: hasRole(Role.MANAGER),
    isMember: hasRole(Role.MEMBER),
    isViewer: hasRole(Role.VIEWER),
  }), [hasPermission, hasRole]);

  return can;
}

// Usage:
// function MyComponent() {
//   const can = usePermissionChecker();
//
//   return (
//     <div>
//       {can.readUsers && <UsersList />}
//       {can.createUser && <CreateUserButton />}
//     </div>
//   );
// }

// Example 18: Permission Matrix Display
export function PermissionMatrix() {
  const { context } = usePermissions();

  const allPermissions = [
    { name: 'Read Users', permission: Permission.USER_READ },
    { name: 'Create Users', permission: Permission.USER_CREATE },
    { name: 'Update Users', permission: Permission.USER_UPDATE },
    { name: 'Delete Users', permission: Permission.USER_DELETE },
    { name: 'Manage Teams', permission: Permission.TEAM_MANAGE },
    { name: 'Read Tasks', permission: Permission.TASK_READ },
    { name: 'Create Tasks', permission: Permission.TASK_CREATE },
  ];

  return (
    <table>
      <thead>
        <tr>
          <th>Permission</th>
          <th>Access</th>
        </tr>
      </thead>
      <tbody>
        {allPermissions.map(({ name, permission }) => (
          <tr key={permission}>
            <td>{name}</td>
            <td>
              {context?.permissions.includes(permission) ? '✅' : '❌'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Example 19: Refresh Permissions
export function ProfilePage() {
  const { refresh, loading, context } = usePermissions();

  const handleRoleChange = async () => {
    // After changing roles
    await updateUserRole(userId, 'MEMBER');
    // Refresh permissions
    await refresh();
  };

  return (
    <div>
      {loading ? <div>Loading...</div> : (
        <>
          <p>Current roles: {context?.roles.join(', ')}</p>
          <button onClick={handleRoleChange}>
            Change Role
          </button>
        </>
      )}
    </div>
  );
}

// Example 20: Error Handling with Permissions
export function ProtectedComponent() {
  const { hasPermission, loading, error } = usePermissions();

  if (loading) {
    return <div>Loading permissions...</div>;
  }

  if (error) {
    return <div>Error loading permissions: {error}</div>;
  }

  if (!hasPermission(Permission.USER_UPDATE)) {
    return (
      <div className="error">
        You don&apos;t have permission to access this feature.
      </div>
    );
  }

  return <div>Protected content here</div>;
}
