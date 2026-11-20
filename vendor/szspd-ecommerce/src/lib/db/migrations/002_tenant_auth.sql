-- Multi-Tenant Authentication Migration Script
-- Version: 1.11.0
-- Date: 2026-04-03
-- Requires: 001_multi_tenant.sql

-- ============================================
-- 租户邀请表
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_invites (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME,
  cancelled_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_invites_tenant ON tenant_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_token ON tenant_invites(token);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_email ON tenant_invites(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_status ON tenant_invites(status);

-- ============================================
-- 跨租户权限表
-- ============================================
CREATE TABLE IF NOT EXISTS cross_tenant_permissions (
  id TEXT PRIMARY KEY,
  source_tenant_id TEXT NOT NULL,
  target_tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permissions TEXT NOT NULL, -- JSON array of permissions
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL,
  FOREIGN KEY (source_tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (target_tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(source_tenant_id, target_tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cross_perms_source ON cross_tenant_permissions(source_tenant_id);
CREATE INDEX IF NOT EXISTS idx_cross_perms_target ON cross_tenant_permissions(target_tenant_id);
CREATE INDEX IF NOT EXISTS idx_cross_perms_user ON cross_tenant_permissions(user_id);

-- ============================================
-- 为现有表添加 tenant_id 列（如果不存在）
-- ============================================
-- 注意：这些需要根据实际数据库状态调整
-- ALTER TABLE users ADD COLUMN tenant_id TEXT DEFAULT 'default';
-- ALTER TABLE agents ADD COLUMN tenant_id TEXT DEFAULT 'default';
-- ALTER TABLE workflows ADD COLUMN tenant_id TEXT DEFAULT 'default';
-- ALTER TABLE conversations ADD COLUMN tenant_id TEXT DEFAULT 'default';
