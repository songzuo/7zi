-- Multi-Tenant Migration Script
-- Version: 1.10.0
-- Date: 2026-04-03

-- ============================================
-- 租户表
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'starter',
  status TEXT DEFAULT 'active',
  isolation_mode TEXT DEFAULT 'shared',
  database_url TEXT,
  schema_name TEXT,
  settings TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- ============================================
-- 租户成员表
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_members (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id);

-- ============================================
-- 角色表
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);

-- 插入系统默认角色
INSERT OR IGNORE INTO roles (id, tenant_id, name, description, is_system) VALUES
  ('role_owner', NULL, 'owner', '租户所有者，拥有全部权限', TRUE),
  ('role_admin', NULL, 'admin', '管理员，拥有管理权限', TRUE),
  ('role_member', NULL, 'member', '成员，拥有基本操作权限', TRUE),
  ('role_guest', NULL, 'guest', '访客，只读权限', TRUE);

-- ============================================
-- 权限表
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  UNIQUE(resource, action)
);

-- 插入系统权限
INSERT OR IGNORE INTO permissions (id, resource, action, description) VALUES
  -- 租户管理
  ('perm_tenant_read', 'tenant', 'read', '查看租户信息'),
  ('perm_tenant_write', 'tenant', 'write', '修改租户信息'),
  ('perm_tenant_delete', 'tenant', 'delete', '删除租户'),

  -- 用户管理
  ('perm_users_read', 'users', 'read', '查看用户'),
  ('perm_users_write', 'users', 'write', '创建/修改用户'),
  ('perm_users_delete', 'users', 'delete', '删除用户'),

  -- 成员管理
  ('perm_members_read', 'members', 'read', '查看成员'),
  ('perm_members_write', 'members', 'write', '邀请/修改成员'),
  ('perm_members_delete', 'members', 'delete', '移除成员'),

  -- 角色权限
  ('perm_roles_read', 'roles', 'read', '查看角色'),
  ('perm_roles_write', 'roles', 'write', '创建/修改角色'),
  ('perm_roles_delete', 'roles', 'delete', '删除角色'),

  -- 智能体管理
  ('perm_agents_read', 'agents', 'read', '查看智能体'),
  ('perm_agents_write', 'agents', 'write', '创建/修改智能体'),
  ('perm_agents_delete', 'agents', 'delete', '删除智能体'),
  ('perm_agents_execute', 'agents', 'execute', '执行智能体'),

  -- 工作流管理
  ('perm_workflows_read', 'workflows', 'read', '查看工作流'),
  ('perm_workflows_write', 'workflows', 'write', '创建/修改工作流'),
  ('perm_workflows_delete', 'workflows', 'delete', '删除工作流'),
  ('perm_workflows_execute', 'workflows', 'execute', '执行工作流'),

  -- 对话管理
  ('perm_conversations_read', 'conversations', 'read', '查看对话'),
  ('perm_conversations_write', 'conversations', 'write', '创建/修改对话'),
  ('perm_conversations_delete', 'conversations', 'delete', '删除对话'),

  -- 计费管理
  ('perm_billing_read', 'billing', 'read', '查看账单'),
  ('perm_billing_write', 'billing', 'write', '修改订阅'),
  ('perm_billing_pay', 'billing', 'pay', '支付账单'),

  -- 审计日志
  ('perm_audit_read', 'audit', 'read', '查看审计日志'),
  ('perm_audit_export', 'audit', 'export', '导出审计日志');

-- ============================================
-- 角色-权限关联表
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- 为系统角色分配权限
-- Owner: 全部权限
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_owner', id FROM permissions;

-- Admin: 除删除租户外的所有权限
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_admin', id FROM permissions WHERE id != 'perm_tenant_delete';

-- Member: 基本操作权限
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_member', id FROM permissions WHERE
  resource IN ('agents', 'workflows', 'conversations') AND
  action IN ('read', 'write', 'execute');

-- Guest: 只读权限
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_guest', id FROM permissions WHERE action = 'read';

-- ============================================
-- 用户-角色关联表
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id, tenant_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id);

-- ============================================
-- 计划表
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  features TEXT,
  limits TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入订阅计划
INSERT OR IGNORE INTO plans (id, name, type, price_monthly, price_yearly, features, limits) VALUES
  ('plan_starter', 'Starter', 'subscription', 99.00, 990.00,
   '{"agents": 5, "workflows": 10, "storage": 10, "support": "email"}',
   '{"ai_calls": 1000, "workflow_runs": 100, "storage_gb": 10}'),
  ('plan_professional', 'Professional', 'subscription', 299.00, 2990.00,
   '{"agents": 50, "workflows": 100, "storage": 100, "support": "priority"}',
   '{"ai_calls": 10000, "workflow_runs": 1000, "storage_gb": 100}'),
  ('plan_enterprise', 'Enterprise', 'subscription', 999.00, 9990.00,
   '{"agents": "unlimited", "workflows": "unlimited", "storage": "unlimited", "support": "24/7"}',
   '{"ai_calls": "unlimited", "workflow_runs": "unlimited", "storage_gb": "unlimited"}');

-- ============================================
-- 订阅表
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  current_period_start DATETIME,
  current_period_end DATETIME,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- 用量表
-- ============================================
CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,4),
  total_cost DECIMAL(10,2),
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_usage_tenant ON usage_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_type ON usage_records(resource_type);
CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_records(recorded_at);

-- ============================================
-- 发票表
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  subscription_id TEXT,
  status TEXT DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CNY',
  due_date DATETIME,
  paid_at DATETIME,
  items TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================
-- 支付记录表
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CNY',
  method TEXT,
  status TEXT,
  transaction_id TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- ============================================
-- 审计日志表
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ============================================
-- 租户密钥表
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_keys (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  encrypted_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ============================================
-- OAuth 配置表
-- ============================================
CREATE TABLE IF NOT EXISTS oauth_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  authorization_url TEXT NOT NULL,
  token_url TEXT NOT NULL,
  user_info_url TEXT NOT NULL,
  scope TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_oauth_tenant ON oauth_configs(tenant_id);

-- ============================================
-- 创建默认租户
-- ============================================
INSERT OR IGNORE INTO tenants (id, name, slug, plan, status, isolation_mode)
VALUES ('default', 'Default Tenant', 'default', 'professional', 'active', 'shared');

-- ============================================
-- 为现有表添加 tenant_id 列（如果不存在）
-- ============================================
-- 注意：这些 ALTER TABLE 语句需要在实际迁移时根据现有表结构调整
-- ALTER TABLE users ADD COLUMN tenant_id TEXT DEFAULT 'default';
-- ALTER TABLE agents ADD COLUMN tenant_id TEXT DEFAULT 'default';
-- ALTER TABLE workflows ADD COLUMN tenant_id TEXT DEFAULT 'default';
-- ALTER TABLE conversations ADD COLUMN tenant_id TEXT DEFAULT 'default';