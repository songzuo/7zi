/**
 * Multi-Tenant Tests
 * 多租户系统测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TenantService } from '../service'
import { BillingService } from '../../billing/service'
import { EncryptionService } from '../../security/encryption'
import { AuditService } from '../../security/audit'
import { DataMaskingService } from '../../security/masking'
import {
  TenantPlan,
  TenantIsolationMode,
  TenantMemberRole,
  TenantStatus,
} from '../types'

describe('Multi-Tenant System', () => {
  let tenantService: TenantService
  let billingService: BillingService
  let encryptionService: EncryptionService
  let auditService: AuditService
  let maskingService: DataMaskingService

  beforeEach(() => {
    tenantService = new TenantService()
    billingService = new BillingService()
    encryptionService = new EncryptionService()
    auditService = new AuditService()
    maskingService = new DataMaskingService()
  })

  describe('TenantService', () => {
    describe('createTenant', () => {
      it('should create a new tenant', async () => {
        const tenant = await tenantService.createTenant('user-123', {
          name: 'Test Company',
          plan: TenantPlan.PROFESSIONAL,
        })

        expect(tenant).toBeDefined()
        expect(tenant.name).toBe('Test Company')
        expect(tenant.plan).toBe(TenantPlan.PROFESSIONAL)
        expect(tenant.status).toBe(TenantStatus.ACTIVE)
      })

      it('should generate slug from name', async () => {
        const tenant = await tenantService.createTenant('user-456', {
          name: 'My Test Company',
        })

        expect(tenant.slug).toBe('my-test-company')
      })

      it('should reject duplicate slugs', async () => {
        await tenantService.createTenant('user-789', {
          name: 'Duplicate',
          slug: 'duplicate-slug',
        })

        await expect(
          tenantService.createTenant('user-000', {
            name: 'Another Duplicate',
            slug: 'duplicate-slug',
          })
        ).rejects.toThrow('already exists')
      })
    })

    describe('getTenant', () => {
      it('should return null for non-existent tenant', async () => {
        const tenant = await tenantService.getTenant('non-existent')
        expect(tenant).toBeNull()
      })

      it('should return tenant by id', async () => {
        const created = await tenantService.createTenant('user-111', {
          name: 'Get Test',
        })

        const tenant = await tenantService.getTenant(created.id)
        expect(tenant).toBeDefined()
        expect(tenant?.name).toBe('Get Test')
      })
    })

    describe('updateTenant', () => {
      it('should update tenant name', async () => {
        const created = await tenantService.createTenant('user-222', {
          name: 'Original Name',
        })

        const updated = await tenantService.updateTenant(created.id, {
          name: 'Updated Name',
        })

        expect(updated.name).toBe('Updated Name')
      })

      it('should update tenant plan', async () => {
        const created = await tenantService.createTenant('user-333', {
          name: 'Plan Test',
          plan: TenantPlan.STARTER,
        })

        const updated = await tenantService.updateTenant(created.id, {
          plan: TenantPlan.ENTERPRISE,
        })

        expect(updated.plan).toBe(TenantPlan.ENTERPRISE)
      })
    })

    describe('memberManagement', () => {
      let tenantId: string

      beforeEach(async () => {
        const tenant = await tenantService.createTenant('owner-1', {
          name: 'Member Test',
        })
        tenantId = tenant.id
      })

      it('should add member to tenant', async () => {
        const member = await tenantService.addMember(
          tenantId,
          'user-member-1',
          TenantMemberRole.MEMBER
        )

        expect(member).toBeDefined()
        expect(member.role).toBe(TenantMemberRole.MEMBER)
      })

      it('should list tenant members', async () => {
        await tenantService.addMember(tenantId, 'user-list-1', TenantMemberRole.MEMBER)
        await tenantService.addMember(tenantId, 'user-list-2', TenantMemberRole.ADMIN)

        const members = await tenantService.listMembers(tenantId)

        // Including owner
        expect(members.length).toBeGreaterThanOrEqual(2)
      })

      it('should update member role', async () => {
        await tenantService.addMember(tenantId, 'user-update-1', TenantMemberRole.MEMBER)

        await tenantService.updateMemberRole(tenantId, 'user-update-1', {
          role: TenantMemberRole.ADMIN,
        })

        const members = await tenantService.listMembers(tenantId)
        const member = members.find(m => m.userId === 'user-update-1')
        expect(member?.role).toBe(TenantMemberRole.ADMIN)
      })

      it('should remove member', async () => {
        await tenantService.addMember(tenantId, 'user-remove-1', TenantMemberRole.MEMBER)

        await tenantService.removeMember(tenantId, 'user-remove-1')

        const members = await tenantService.listMembers(tenantId)
        const member = members.find(m => m.userId === 'user-remove-1')
        expect(member).toBeUndefined()
      })
    })
  })

  describe('BillingService', () => {
    let tenantId: string

    beforeEach(async () => {
      const tenant = await tenantService.createTenant('billing-user', {
        name: 'Billing Test',
        plan: TenantPlan.PROFESSIONAL,
      })
      tenantId = tenant.id
    })

    describe('subscription', () => {
      it('should get subscription', async () => {
        const subscription = await billingService.getSubscription(tenantId)
        expect(subscription).toBeDefined()
        expect(subscription?.status).toBe('active')
      })

      it('should update subscription plan', async () => {
        const subscription = await billingService.createOrUpdateSubscription(
          tenantId,
          'plan_enterprise'
        )

        expect(subscription.planId).toBe('plan_enterprise')
      })
    })

    describe('usage', () => {
      it('should record usage', async () => {
        await billingService.recordUsage(tenantId, 'ai_calls', 100)

        const usage = await billingService.getMonthlyUsage(tenantId)
        const aiCallsUsage = usage.find(u => u.resourceType === 'ai_calls')

        expect(aiCallsUsage).toBeDefined()
        expect(aiCallsUsage?.totalQuantity).toBe(100)
      })

      it('should check usage limit', async () => {
        // Professional plan: 10000 AI calls
        await billingService.recordUsage(tenantId, 'ai_calls', 5000)

        const limit = await billingService.checkUsageLimit(tenantId, 'ai_calls')

        expect(limit.exceeded).toBe(false)
        expect(limit.used).toBe(5000)
      })
    })
  })

  describe('EncryptionService', () => {
    it('should encrypt and decrypt data', () => {
      const plaintext = 'sensitive-data-123'
      const encrypted = encryptionService.encrypt(plaintext)
      const decrypted = encryptionService.decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
      expect(encrypted).not.toBe(plaintext)
    })

    it('should generate tenant encryption key', async () => {
      const key1 = await encryptionService.getTenantEncryptionKey('tenant-1')
      const key2 = await encryptionService.getTenantEncryptionKey('tenant-1')

      expect(key1).toBe(key2)
      expect(key1).toHaveLength(64) // 32 bytes hex
    })

    it('should encrypt field with tenant key', async () => {
      const data = { name: 'John', email: 'john@example.com' }
      const encrypted = await encryptionService.encryptField(
        data,
        ['email'],
        'tenant-test'
      )

      expect(encrypted.email).not.toBe('john@example.com')
      expect(encrypted.email_encrypted).toBe(true)
    })
  })

  describe('AuditService', () => {
    let tenantId: string

    beforeEach(async () => {
      const tenant = await tenantService.createTenant('audit-user', {
        name: 'Audit Test',
      })
      tenantId = tenant.id
    })

    it('should log audit event', async () => {
      const log = await auditService.log({
        tenantId,
        userId: 'user-1',
        action: 'test_action',
        resourceType: 'test_resource',
        resourceId: 'resource-1',
      })

      expect(log).toBeDefined()
      expect(log.action).toBe('test_action')
    })

    it('should query audit logs', async () => {
      await auditService.log({
        tenantId,
        userId: 'user-1',
        action: 'query_test',
        resourceType: 'test',
      })

      const logs = await auditService.query({
        tenantId,
        action: 'query_test',
      })

      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].action).toBe('query_test')
    })

    it('should export audit logs as JSON', async () => {
      await auditService.log({
        tenantId,
        userId: 'user-1',
        action: 'export_test',
        resourceType: 'test',
      })

      const exported = await auditService.export(tenantId, 'json')
      const parsed = JSON.parse(exported)

      expect(Array.isArray(parsed)).toBe(true)
    })
  })

  describe('DataMaskingService', () => {
    it('should mask phone number', () => {
      const masked = maskingService.maskPhone('13812345678')
      expect(masked).toBe('138****5678')
    })

    it('should mask email', () => {
      const masked = maskingService.maskEmail('example@domain.com')
      expect(masked).toBe('e***@domain.com')
    })

    it('should mask ID card', () => {
      const masked = maskingService.maskIdCard('110101199001011234')
      expect(masked).toContain('110')
      expect(masked).toContain('1234')
    })

    it('should mask bank card', () => {
      const masked = maskingService.maskBankCard('6222021234567890')
      expect(masked).toBe('************7890')
    })

    it('should mask object fields', () => {
      const data = {
        name: '张三',
        phone: '13812345678',
        email: 'test@example.com',
        idCard: '110101199001011234',
      }

      const masked = maskingService.maskObject(data, {
        name: 'name',
        phone: 'phone',
        email: 'email',
        idCard: 'idCard',
      })

      expect(masked.name).toBe('张*')
      expect(masked.phone).toBe('138****5678')
      expect(masked.email).toBe('t***@example.com')
      expect(masked.idCard).toContain('***')
    })

    it('should auto-detect data type', () => {
      expect(maskingService.autoMask('13812345678')).toBe('138****5678')
      expect(maskingService.autoMask('test@example.com')).toBe('t***@example.com')
    })
  })
})
