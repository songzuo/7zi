-- Migration: create_rate_limit_security_tables
-- Version: 1.0.0
-- Date: 2026-04-05
-- Description: Create tables for Rate Limiting & Security Dashboard

-- ============================================================================
-- Rate Limit Rules Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  pattern TEXT NOT NULL,
  algorithm TEXT NOT NULL CHECK(algorithm IN ('sliding-window', 'token-bucket')),
  window_ms INTEGER NOT NULL,
  max_requests INTEGER NOT NULL,
  key_type TEXT NOT NULL CHECK(key_type IN ('ip', 'user', 'api-key', 'custom')),
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_rules_pattern ON rate_limit_rules(pattern);
CREATE INDEX IF NOT EXISTS idx_rate_limit_rules_enabled ON rate_limit_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_rate_limit_rules_algorithm ON rate_limit_rules(algorithm);
CREATE INDEX IF NOT EXISTS idx_rate_limit_rules_priority ON rate_limit_rules(priority);

-- ============================================================================
-- Blacklist Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS blacklist (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('ip', 'user-id', 'api-key', 'email')),
  value TEXT NOT NULL,
  reason TEXT,
  expires_at INTEGER,
  created_by TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blacklist_type ON blacklist(type);
CREATE INDEX IF NOT EXISTS idx_blacklist_value ON blacklist(value);
CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON blacklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_blacklist_created_by ON blacklist(created_by);

-- ============================================================================
-- Whitelist Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS whitelist (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('ip', 'user-id', 'api-key', 'email')),
  value TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_whitelist_type ON whitelist(type);
CREATE INDEX IF NOT EXISTS idx_whitelist_value ON whitelist(value);
CREATE INDEX IF NOT EXISTS idx_whitelist_created_by ON whitelist(created_by);

-- ============================================================================
-- Rate Limit Events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  path TEXT NOT NULL,
  rule_id TEXT,
  allowed BOOLEAN NOT NULL,
  remaining INTEGER,
  limit INTEGER,
  algorithm TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_identifier ON rate_limit_events(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_path ON rate_limit_events(path);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_timestamp ON rate_limit_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_allowed ON rate_limit_events(allowed);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_rule_id ON rate_limit_events(rule_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_identifier_timestamp ON rate_limit_events(identifier, timestamp DESC);

-- ============================================================================
-- Attack Events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS attack_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('ddos', 'brute-force', 'sql-injection', 'xss', 'other')),
  identifier TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  evidence TEXT,
  detected_at INTEGER NOT NULL,
  resolved BOOLEAN DEFAULT 0,
  resolved_at INTEGER,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_attack_events_type ON attack_events(type);
CREATE INDEX IF NOT EXISTS idx_attack_events_identifier ON attack_events(identifier);
CREATE INDEX IF NOT EXISTS idx_attack_events_severity ON attack_events(severity);
CREATE INDEX IF NOT EXISTS idx_attack_events_detected_at ON attack_events(detected_at);
CREATE INDEX IF NOT EXISTS idx_attack_events_resolved ON attack_events(resolved);

-- ============================================================================
-- Security Alerts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'error', 'critical')),
  title TEXT NOT NULL,
  message TEXT,
  metadata TEXT,
  dismissed BOOLEAN DEFAULT 0,
  dismissed_at INTEGER,
  dismissed_by TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_dismissed ON security_alerts(dismissed);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

-- ============================================================================
-- Audit Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  user_id TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- ============================================================================
-- Views for Analytics
-- ============================================================================

-- View: Request statistics per path
CREATE VIEW IF NOT EXISTS v_path_statistics AS
SELECT
  path,
  COUNT(*) as total_requests,
  SUM(CASE WHEN allowed = 0 THEN 1 ELSE 0 END) as blocked_requests,
  CAST(SUM(CASE WHEN allowed = 0 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as block_rate
FROM rate_limit_events
GROUP BY path;

-- View: Request statistics per identifier
CREATE VIEW IF NOT EXISTS v_identifier_statistics AS
SELECT
  identifier,
  COUNT(*) as total_requests,
  SUM(CASE WHEN allowed = 0 THEN 1 ELSE 0 END) as blocked_requests,
  CAST(SUM(CASE WHEN allowed = 0 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as block_rate,
  MAX(timestamp) as last_activity
FROM rate_limit_events
GROUP BY identifier;

-- View: Active rules
CREATE VIEW IF NOT EXISTS v_active_rules AS
SELECT * FROM rate_limit_rules WHERE enabled = 1;

-- View: Expired blacklist entries
CREATE VIEW IF NOT EXISTS v_expired_blacklist AS
SELECT * FROM blacklist WHERE expires_at IS NOT NULL AND expires_at < strftime('%s', 'now') * 1000;

-- ============================================================================
-- Triggers for Automatic Updates
-- ============================================================================

-- Trigger: Update updated_at timestamp on rate_limit_rules
CREATE TRIGGER IF NOT EXISTS trg_rate_limit_rules_updated_at
AFTER UPDATE ON rate_limit_rules
FOR EACH ROW
BEGIN
  UPDATE rate_limit_rules SET updated_at = strftime('%s', 'now') * 1000 WHERE id = NEW.id;
END;

-- ============================================================================
-- Initial Data - Common Rules
-- ============================================================================

-- Insert common rate limit rules
INSERT OR IGNORE INTO rate_limit_rules (id, name, description, pattern, algorithm, window_ms, max_requests, key_type, priority, enabled, created_at, updated_at)
VALUES
  ('rule-auth-login', 'Auth Login Limit', 'Limit login attempts per IP', '/api/auth/login', 'sliding-window', 60000, 5, 'ip', 10, 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('rule-auth-register', 'Auth Register Limit', 'Limit registration attempts per IP', '/api/auth/register', 'sliding-window', 60000, 3, 'ip', 10, 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('rule-api-default', 'Default API Limit', 'Default limit for all API endpoints', '/api/', 'sliding-window', 60000, 100, 'ip', 0, 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('rule-public-api', 'Public API Limit', 'Limit for public API endpoints', '/api/public/', 'token-bucket', 60000, 300, 'ip', 5, 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('rule-admin-api', 'Admin API Limit', 'Strict limit for admin endpoints', '/api/admin/', 'sliding-window', 60000, 60, 'user', 10, 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- ============================================================================
-- End of Migration
-- ============================================================================
