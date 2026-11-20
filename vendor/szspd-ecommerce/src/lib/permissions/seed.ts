// @ts-nocheck
/**
 * RBAC Seeding - Initialize default roles and permissions
 */

import { Role, Permission } from './types'
import { initializeRbacTables, getRoleById, assignPermissionsToRole } from './repository'
import { getRoleDefinition } from './rbac'
import { logger } from '../logger'

/**
 * Seed default roles and permissions into database
 */
export async function seedDefaultRolesAndPermissions(): Promise<{
  success: boolean
  message: string
  rolesSeeded: string[]
  permissionsSeeded: number
}> {
  try {
    await initializeRbacTables()

    const rolesSeeded: string[] = []
    let permissionsSeeded = 0

    // Iterate through all default role definitions
    for (const role of Object.values(Role)) {
      const roleDef = getRoleDefinition(role)

      if (!roleDef) {
        continue
      }

      // Check if role already exists in database
      const existingRole = await getRoleById(role)

      if (existingRole) {
        // Update existing role's permissions
        await assignPermissionsToRole(role, roleDef.permissions)
        rolesSeeded.push(`${role} (updated)`)
      } else {
        // Create new role in database
        const db = await import('../db').then(m => m.getDatabaseAsync())
        const dbInstance = await db

        const now = new Date().toISOString()
        const stmt = dbInstance.prepare(`
          INSERT INTO roles (id, name, description, permissions, is_system, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)

        stmt.run(
          roleDef.id,
          roleDef.name,
          roleDef.description,
          JSON.stringify(roleDef.permissions),
          roleDef.isSystem ? 1 : 0,
          now,
          now
        )

        // Assign permissions to role
        await assignPermissionsToRole(role, roleDef.permissions)
        rolesSeeded.push(`${role} (created)`)
      }

      permissionsSeeded += roleDef.permissions.length
    }

    return {
      success: true,
      message: 'Roles and permissions seeded successfully',
      rolesSeeded,
      permissionsSeeded,
    }
  } catch (error) {
    logger.error('Failed to seed roles and permissions:', { error })
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to seed roles and permissions',
      rolesSeeded: [],
      permissionsSeeded: 0,
    }
  }
}

/**
 * Check if roles and permissions need seeding
 */
export async function needsSeeding(): Promise<boolean> {
  try {
    const roles = await import('./repository').then(m => m.getAllRoles())

    // If no roles exist, seeding is needed
    if (roles.length === 0) {
      return true
    }

    // Check if any default roles are missing
    for (const role of Object.values(Role)) {
      const roleDef = await getRoleById(role)
      if (!roleDef) {
        return true
      }
    }

    return false
  } catch (error) {
    return true
  }
}

/**
 * Reset all roles and permissions to defaults
 * Warning: This will remove all custom roles and permissions
 */
export async function resetToDefaults(): Promise<{
  success: boolean
  message: string
}> {
  try {
    const db = await import('../db').then(m => m.getDatabaseAsync())
    const dbInstance = await db

    // Delete all role-permission mappings
    dbInstance.exec('DELETE FROM role_permissions')

    // Delete all user-role mappings
    dbInstance.exec('DELETE FROM user_roles')

    // Delete all roles
    dbInstance.exec('DELETE FROM roles')

    // Re-seed with defaults
    const result = await seedDefaultRolesAndPermissions()

    return {
      success: result.success,
      message: result.message,
    }
  } catch (error) {
    logger.error('Failed to reset roles and permissions:', { error })
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset roles and permissions',
    }
  }
}

/**
 * Get seeding statistics
 */
export async function getSeedingStats(): Promise<{
  rolesInDb: number
  permissionsInDb: number
  defaultRolesCount: number
  needsSeeding: boolean
}> {
  try {
    const { getAllRoles } = await import('./repository')
    const { getAllPermissions } = await import('./repository')

    const roles = await getAllRoles()
    const permissions = await getAllPermissions()

    return {
      rolesInDb: roles.length,
      permissionsInDb: permissions.length,
      defaultRolesCount: Object.values(Role).length,
      needsSeeding: await needsSeeding(),
    }
  } catch (error) {
    return {
      rolesInDb: 0,
      permissionsInDb: 0,
      defaultRolesCount: Object.values(Role).length,
      needsSeeding: true,
    }
  }
}
