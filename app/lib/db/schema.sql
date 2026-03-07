-- AI Team Dashboard Database Schema
-- SQLite

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium', -- high, medium, low
  status TEXT NOT NULL DEFAULT 'todo', -- todo, in_progress, review, done
  assignee TEXT,
  due_date TEXT, -- ISO date string
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',
  created_at TEXT DEFAULT (datetime('now'))
);

-- 任务-标签关联表 (多对多)
CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 默认标签
INSERT OR IGNORE INTO tags (id, name, color) VALUES
  ('bug', 'Bug', 'red'),
  ('feature', 'Feature', 'blue'),
  ('enhancement', 'Enhancement', 'purple'),
  ('documentation', 'Docs', 'green'),
  ('urgent', 'Urgent', 'orange'),
  ('ai-agent', 'AI Agent', 'pink');

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
