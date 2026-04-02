/**
 * Tests for Permission Migration Helper
 */

import { describe, it, expect } from 'vitest'
import { Permission } from '@/lib/permissions/types'
import {
  convertLegacyPermissions,
  convertPermissionsToLegacy,
  normalizePermissions,
  isLegacyPermissionFormat,
  permissionsAreEquivalent,
  mergePermissions,
} from '../permission-migration'

describe('Permission Migration Helper', () => {
  describe('convertLegacyPermissions', () => {
    it('should convert legacy read:tasks to TASK_READ', () => {
      const result = convertLegacyPermissions(['read:tasks'])
      expect(result).toEqual([Permission.TASK_READ])
    })

    it('should convert multiple legacy permissions', () => {
      const result = convertLegacyPermissions(['read:tasks', 'write:tasks', 'manage:team'])
      expect(result).toEqual([Permission.TASK_READ, Permission.TASK_CREATE, Permission.TEAM_MANAGE])
    })

    it('should filter out unmapped legacy permissions', () => {
      const result = convertLegacyPermissions(['read:tasks', 'unknown:permission', 'write:tasks'])
      expect(result).toEqual([Permission.TASK_READ, Permission.TASK_CREATE])
    })

    it('should handle empty array', () => {
      const result = convertLegacyPermissions([])
      expect(result).toEqual([])
    })
  })

  describe('convertPermissionsToLegacy', () => {
    it('should convert TASK_READ to read:tasks', () => {
      const result = convertPermissionsToLegacy([Permission.TASK_READ])
      expect(result).toEqual(['read:tasks'])
    })

    it('should convert multiple permissions', () => {
      const result = convertPermissionsToLegacy([
        Permission.TASK_READ,
        Permission.TASK_CREATE,
        Permission.TEAM_MANAGE,
      ])
      expect(result).toEqual(['read:tasks', 'write:tasks', 'manage:team'])
    })

    it('should handle empty array', () => {
      const result = convertPermissionsToLegacy([])
      expect(result).toEqual([])
    })
  })

  describe('normalizePermissions', () => {
    it('should normalize legacy string permissions', () => {
      const result = normalizePermissions(['read:tasks', 'write:tasks'])
      expect(result).toEqual([Permission.TASK_READ, Permission.TASK_CREATE])
    })

    it('should normalize Permission enum values', () => {
      const result = normalizePermissions([Permission.TASK_READ, Permission.TASK_CREATE])
      expect(result).toEqual([Permission.TASK_READ, Permission.TASK_CREATE])
    })

    it('should handle mixed legacy and new permissions', () => {
      const result = normalizePermissions(['read:tasks', Permission.TASK_CREATE, 'manage:team'])
      expect(result).toEqual([Permission.TASK_READ, Permission.TASK_CREATE, Permission.TEAM_MANAGE])
    })

    it('should filter out invalid legacy permissions', () => {
      const result = normalizePermissions(['read:tasks', 'unknown:permission'])
      expect(result).toEqual([Permission.TASK_READ])
    })

    it('should handle Permission enum as string', () => {
      const result = normalizePermissions(['task:read'])
      expect(result).toEqual([Permission.TASK_READ])
    })
  })

  describe('isLegacyPermissionFormat', () => {
    it('should return true for legacy format', () => {
      expect(isLegacyPermissionFormat('read:tasks')).toBe(true)
      expect(isLegacyPermissionFormat('manage:team')).toBe(true)
    })

    it('should return false for new format', () => {
      expect(isLegacyPermissionFormat('task:read')).toBe(false)
      expect(isLegacyPermissionFormat('team:manage')).toBe(false)
    })
  })

  describe('permissionsAreEquivalent', () => {
    it('should detect equivalent permissions (legacy vs new)', () => {
      expect(permissionsAreEquivalent('read:tasks', Permission.TASK_READ)).toBe(true)
      expect(permissionsAreEquivalent(Permission.TASK_CREATE, 'write:tasks')).toBe(true)
    })

    it('should detect non-equivalent permissions', () => {
      expect(permissionsAreEquivalent('read:tasks', Permission.TASK_CREATE)).toBe(false)
    })

    it('should handle both legacy strings', () => {
      expect(permissionsAreEquivalent('read:tasks', 'read:tasks')).toBe(true)
      expect(permissionsAreEquivalent('read:tasks', 'write:tasks')).toBe(false)
    })

    it('should handle both new permissions', () => {
      expect(permissionsAreEquivalent(Permission.TASK_READ, Permission.TASK_READ)).toBe(true)
      expect(permissionsAreEquivalent(Permission.TASK_READ, Permission.TASK_CREATE)).toBe(false)
    })
  })

  describe('mergePermissions', () => {
    it('should merge legacy and new permissions', () => {
      const result = mergePermissions(['read:tasks', 'write:tasks'], [Permission.TASK_UPDATE])
      expect(result).toEqual([Permission.TASK_READ, Permission.TASK_CREATE, Permission.TASK_UPDATE])
    })

    it('should deduplicate equivalent permissions', () => {
      const result = mergePermissions(['read:tasks', 'write:tasks'], [Permission.TASK_READ])
      expect(result).toEqual([Permission.TASK_READ, Permission.TASK_CREATE])
    })

    it('should handle empty arrays', () => {
      expect(mergePermissions([], [])).toEqual([])
      expect(mergePermissions(['read:tasks'], [])).toEqual([Permission.TASK_READ])
      expect(mergePermissions([], [Permission.TASK_READ])).toEqual([Permission.TASK_READ])
    })
  })
})
