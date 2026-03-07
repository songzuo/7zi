/**
 * 标签数据仓库
 * 处理标签的 CRUD 操作
 */

import { getDatabaseAsync } from './index';
import { TaskTag, DEFAULT_TAGS } from '../tasks/types';

interface TagRow {
  id: string;
  name: string;
  color: string;
}

/**
 * 获取所有标签（包括默认标签和自定义标签）
 */
export async function getAllTags(): Promise<TaskTag[]> {
  const db = await getDatabaseAsync();
  const rows = db.prepare('SELECT * FROM tags ORDER BY id').all() as TagRow[];
  
  // 确保默认标签存在
  const tagMap = new Map<string, TaskTag>();
  
  // 先添加默认标签
  for (const tag of DEFAULT_TAGS) {
    tagMap.set(tag.id, tag);
  }
  
  // 然后添加/覆盖数据库中的标签
  for (const row of rows) {
    tagMap.set(row.id, {
      id: row.id,
      name: row.name,
      color: row.color,
    });
  }
  
  return Array.from(tagMap.values());
}

/**
 * 获取自定义标签
 */
export async function getCustomTags(): Promise<TaskTag[]> {
  const db = await getDatabaseAsync();
  const defaultTagIds = DEFAULT_TAGS.map(t => t.id);
  
  // 使用参数化查询
  const placeholders = defaultTagIds.map(() => '?').join(', ');
  const sql = `SELECT * FROM tags WHERE id NOT IN (${placeholders})`;
  
  const rows = db.prepare(sql).all(...defaultTagIds) as TagRow[];
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    color: row.color,
  }));
}

/**
 * 根据 ID 获取标签
 */
export async function getTagById(id: string): Promise<TaskTag | null> {
  const db = await getDatabaseAsync();
  const row = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as TagRow | undefined;
  
  if (!row) return null;
  
  return {
    id: row.id,
    name: row.name,
    color: row.color,
  };
}

/**
 * 创建自定义标签
 */
export async function createTag(tagData: Omit<TaskTag, 'id'>): Promise<TaskTag> {
  const db = await getDatabaseAsync();
  
  const id = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const stmt = db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)');
  stmt.run(id, tagData.name, tagData.color);
  
  return {
    id,
    name: tagData.name,
    color: tagData.color,
  };
}

/**
 * 更新标签
 */
export async function updateTag(id: string, updates: Partial<TaskTag>): Promise<TaskTag | null> {
  const db = await getDatabaseAsync();
  
  const existingTag = await getTagById(id);
  if (!existingTag) return null;
  
  const fields: string[] = [];
  const values: string[] = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  
  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }
  
  if (fields.length === 0) return existingTag;
  
  values.push(id);
  
  const sql = `UPDATE tags SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...values);
  
  return getTagById(id);
}

/**
 * 删除自定义标签
 */
export async function deleteTag(id: string): Promise<boolean> {
  const db = await getDatabaseAsync();
  
  // 不允许删除默认标签
  if (DEFAULT_TAGS.some(t => t.id === id)) {
    return false;
  }
  
  // 删除任务-标签关联
  db.prepare('DELETE FROM task_tags WHERE tag_id = ?').run(id);
  
  // 删除标签
  const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  return result.changes > 0;
}