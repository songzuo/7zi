# Database Schema Audit Report

**Audit Date:** 2026-05-12  
**Auditor:** Subagent (Database Schema Check)  
**Database Type:** SQLite

---

## 1. Schema Inventory

### 1.1 Core Tables

| 表名 | 字段数 | 主键 | 外键 | 索引数 | 备注 |
|------|--------|------|------|--------|------|
| `users` | 14 | id | - | 4 | 用户表 |
| `agents` | 13 | id | - | 5 | 智能体表 |
| `tenants` | 10 | id | - | 2 | 租户表 |
| `roles` | 6 | id | tenant_id | 1 | 角色表 |
| `permissions` | 4 | id | - | 1 | 权限表 |
| `plans` | 8 | id | - | 0 | 订阅计划表 |
| `subscriptions` | 9 | id | tenant_id, plan_id | 2 | 订阅表 |

### 1.2 认证相关表

| 表名 | 字段数 | 主键 | 外键 | 索引数 | 备注 |
|------|--------|------|------|--------|------|
| `user_tokens` | 8 | id | user_id | 3 | 用户Token |
| `agent_tokens` | 9 | id | agent_id | 3 | 智能体Token |
| `password_reset_tokens` | 5 | id | user_id | 3 | 密码重置Token |
| `oauth_configs` | 13 | id | tenant_id | 1 | OAuth配置 |

### 1.3 访问控制表

| 表名 | 字段数 | 主键 | 外键 | 索引数 | 备注 |
|------|--------|------|------|--------|------|
| `tenant_members` | 7 | id | tenant_id | 2 | 租户成员 |
| `role_permissions` | 2 | (role_id, permission_id) | role_id, permission_id | 0 | 角色-权限关联 |
| `user_roles` | 3 | (user_id, role_id, tenant_id) | user_id, role_id, tenant_id | 2 | 用户-角色关联 |
| `tenant_invites` | 12 | id | tenant_id | 4 | 租户邀请 |
| `cross_tenant_permissions` | 8 | id | source_tenant_id, target_tenant_id | 3 | 跨租户权限 |

### 1.4 财务相关表

| 表名 | 字段数 | 主键 | 外键 | 索引数 | 备注 |
|------|--------|------|------|--------|------|
| `usage_records` | 7 | id | tenant_id | 3 | 用量记录 |
| `invoices` | 11 | id | tenant_id, subscription_id | 2 | 发票表 |
| `payments` | 11 | id | tenant_id, invoice_id | 2 | 支付记录 |

### 1.5 审计与安全表

| 表名 | 字段数 | 主键 | 外键 | 索引数 | 备注 |
|------|--------|------|------|--------|------|
| `audit_logs` | 12 | id | tenant_id, user_id | 4 | 审计日志(multi-tenant) |
| `audit_logs` | 12 | id | user_id | 8 | 审计日志(general) |
| `tenant_keys` | 6 | id | tenant_id | 0 | 租户密钥 |
| `rate_limit_rules` | 12 | id | - | 4 | 限速规则 |
| `blacklist` | 7 | id | - | 4 | 黑名单 |
| `whitelist` | 7 | id | - | 3 | 白名单 |
| `rate_limit_events` | 12 | id | - | 6 | 限速事件 |
| `attack_events` | 11 | id | - | 5 | 攻击事件 |
| `security_alerts` | 9 | id | - | 4 | 安全告警 |

### 1.6 业务数据表

| 表名 | 字段数 | 主键 | 外键 | 索引数 | 备注 |
|------|--------|------|------|--------|------|
| `agent_data_access` | 7 | id | agent_id | 4 | 智能体数据访问记录 |
| `agent_features` | 12 | id | - | 3 | 智能体特征 |
| `agent_models` | 10 | id | - | 3 | AI模型配置 |
| `user_preferences` | 10 | user_id | - | 2 | 用户偏好 |
| `feedbacks` | 18 | id | - | 5 | 反馈表 |
| `feedback_attachments` | 6 | id | feedback_id | 0 | 反馈附件 |
| `ratings` | 15 | id | - | 4 | 评分表 |
| `helpful_votes` | 6 | id | rating_id | 1 | 有帮助投票 |
| `spam_detection_logs` | 7 | id | - | 0 | 垃圾检测日志 |
| `feedback_notifications` | 7 | id | feedback_id | 0 | 反馈通知 |
| `task_graphs` | 7 | id | - | 2 | 任务图 |
| `a2a_sessions` | 9 | id | - | 4 | A2A会话 |
| `audit_log_archive` | 9 | id | - | 4 | 审计日志归档 |
| `agent_learning_features` | 12 | id | - | 5 | 智能体学习特征 |
| `workflow_history` | 13 | id | - | 7 | 工作流历史 |
| `workflow_versions` | 12 | id | - | 4 | 工作流版本 |
| `workflow_version_diffs` | 13 | id | - | 3 | 工作流版本差异 |

---

## 2. 安全隐患分析

### 🔴 高危 (Critical)

#### 2.1 Token 明文存储

**问题:** 以下表中的 Token 字段未加密存储:
- `user_tokens.token` - 用户访问令牌
- `user_tokens.refresh_token` - 刷新令牌
- `agent_tokens.token` - 智能体访问令牌
- `agent_tokens.refresh_token` - 智能体刷新令牌
- `password_reset_tokens.token` - 密码重置令牌

**风险:** 如果数据库泄露，所有Token可被直接利用进行身份冒充。

**建议:** Token应使用单向哈希存储（如 SHA-256），与密码存储方式类似。

#### 2.2 OAuth Client Secret 明文存储

**问题:** `oauth_configs.client_secret` 以明文存储。

**风险:** OAuth client_secret 泄露可导致第三方登录被劫持。

**建议:** 使用 `tenant_keys` 类似的加密机制或外部密钥管理服务。

#### 2.3 缺少外键约束

**问题表:**
- `oauth_configs` - 缺少 `provider` 外键约束
- `tenant_invites` - 缺少 `invited_by`, `token` 相关约束
- `cross_tenant_permissions` - 缺少 `user_id`, `created_by` 外键
- `subscriptions` - plan_id 外键未强制
- `user_roles` - users.id 外键未在 multi-tenant schema 中定义

**风险:** 可能出现孤立记录，数据完整性无法保证。

**建议:** 添加 `REFERENCES` 约束或在应用层做数据一致性校验。

### 🟠 中危 (Medium)

#### 2.4 IP地址未验证

**问题:** `audit_logs.ip_address`, `blacklist.value`, `whitelist.value` 等字段无格式验证。

**风险:** 可存储无效IP地址，占用空间且影响查询准确性。

**建议:** 添加 CHECK 约束验证 IP 格式，如 `CHECK (ip_address GLOB '*[0-9.]*' OR ip_address GLOB '*[0-9a-fA-F:]*')`

#### 2.5 缺少唯一约束

**问题:**
- `oauth_configs.provider` - 应在 tenant_id 内唯一
- `tenant_keys.tenant_id` - 已有 UNIQUE，但可加显式约束

**建议:** 确认 UNIQUE 约束已正确定义。

#### 2.6 审计日志字段长度

**问题:** `audit_logs.old_value`, `audit_logs.new_value` 为 TEXT 类型，无长度限制。

**风险:** 可能存储过大的 JSON 数据影响性能。

**建议:** 添加合理的长度限制或使用 MEDIUMTEXT。

### 🟡 低危 (Low)

#### 2.7 缺少时间戳更新触发器

**问题:** 大部分表无 `updated_at` 自动更新触发器，需应用层维护。

**建议:** 添加 SQLite 触发器自动更新 `updated_at`。

```sql
CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;
```

#### 2.8 索引覆盖不完整

**问题:**
- `feedbacks.email` - 可能有查询需求但无索引
- `audit_logs.metadata` - JSON 字段无索引
- `blacklist.expires_at` - 可添加部分索引只查询未过期的黑名单

**建议:** 根据实际查询模式添加相应索引。

---

## 3. 优化建议

### 3.1 安全性优化

| 优先级 | 建议 | 影响 |
|--------|------|------|
| P0 | Token字段使用SHA-256哈希存储 | 防止Token泄露被直接利用 |
| P0 | OAuth client_secret 加密存储 | 防止第三方登录被劫持 |
| P1 | 添加 IP 地址格式 CHECK 约束 | 提升数据质量 |
| P1 | 敏感字段（client_secret, encrypted_key）标记注释 | 便于代码审查 |

### 3.2 性能优化

| 优先级 | 建议 | 影响 |
|--------|------|------|
| P1 | 为高频查询字段添加复合索引 | 提升查询性能 |
| P2 | 定期 VACUUM 和 ANALYZE | 保持查询计划准确 |
| P2 | 大表分区（如 audit_logs 按月分区） | 提升大数据量查询性能 |
| P3 | 添加覆盖索引减少回表 | 减少 I/O 操作 |

### 3.3 数据完整性

| 优先级 | 建议 | 影响 |
|--------|------|------|
| P1 | 添加缺失的外键约束或应用层校验 | 保证数据一致性 |
| P2 | 启用 WAL 模式提升并发性能 | 提升写入性能 |
| P2 | 添加 updated_at 自动更新触发器 | 减少应用层代码复杂度 |

### 3.4 监控与维护

| 建议 | 说明 |
|------|------|
| 定期检查大表 (>10万行) | 考虑归档或分区 |
| 监控慢查询 (>100ms) | 针对性优化 |
| 定期检查孤立记录 | 清理无效数据 |

---

## 4. 统计摘要

| 指标 | 数值 |
|------|------|
| 总表数 | ~35+ |
| 总索引数 | ~100+ |
| 有主键的表 | ~35+ |
| 有外键的表 | ~20 |
| **高危安全问题** | 3 |
| **中危安全问题** | 3 |
| **低危安全问题** | 3 |

---

*Report generated by Database Schema Audit Tool*