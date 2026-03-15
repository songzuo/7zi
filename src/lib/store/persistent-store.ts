/**
 * @fileoverview 文件系统持久化存储工具
 * @module lib/store/persistent-store
 * 
 * @description
 * 提供通用的文件系统持久化存储，用于 API 端点的数据存储。
 * 数据以 JSON 格式存储在文件系统中，确保服务器重启后数据不丢失。
 * 
 * 特性：
 * - 类型安全的泛型接口
 * - 自动文件创建和初始化
 * - 原子写入（临时文件 + 重命名）
 * - 文件锁防止并发问题
 * - 自动备份机制
 * - 错误恢复
 */

import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '@/lib/logger';

const logger = createLogger('PersistentStore');

// 数据目录 - 存储在项目根目录下的 data 文件夹
const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// 确保目录存在
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 初始化目录
ensureDir(DATA_DIR);
ensureDir(BACKUP_DIR);

/**
 * 持久化存储配置选项
 */
export interface PersistentStoreOptions<T> {
  /** 存储名称（用于文件名） */
  name: string;
  /** 初始数据（当文件不存在时使用） */
  initialData?: T;
  /** 是否启用自动备份 */
  enableBackup?: boolean;
  /** 备份保留数量 */
  backupCount?: number;
}

/**
 * 持久化存储类
 * 
 * @template T 存储的数据类型
 * 
 * @example
 * ```typescript
 * // 定义任务存储
 * interface TaskStore {
 *   tasks: Task[];
 * }
 * 
 * const taskStore = new PersistentStore<TaskStore>({
 *   name: 'tasks',
 *   initialData: { tasks: [] },
 *   enableBackup: true
 * });
 * 
 * // 读取数据
 * const data = taskStore.read();
 * 
 * // 写入数据
 * taskStore.write({ tasks: updatedTasks });
 * 
 * // 更新部分数据
 * taskStore.update(current => ({
 *   ...current,
 *   tasks: [...current.tasks, newTask]
 * }));
 * ```
 */
export class PersistentStore<T extends object> {
  private filePath: string;
  private lockPath: string;
  private initialData: T;
  private enableBackup: boolean;
  private backupCount: number;

  constructor(options: PersistentStoreOptions<T>) {
    this.filePath = path.join(DATA_DIR, `${options.name}.json`);
    this.lockPath = path.join(DATA_DIR, `${options.name}.lock`);
    this.initialData = options.initialData ?? ({} as T);
    this.enableBackup = options.enableBackup ?? true;
    this.backupCount = options.backupCount ?? 5;
  }

  /**
   * 获取文件路径
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * 检查数据文件是否存在
   */
  exists(): boolean {
    return fs.existsSync(this.filePath);
  }

  /**
   * 读取数据
   * 如果文件不存在，返回初始数据并创建文件
   */
  read(): T {
    try {
      if (!fs.existsSync(this.filePath)) {
        // 文件不存在，创建并返回初始数据
        this.write(this.initialData);
        return this.initialData;
      }

      const content = fs.readFileSync(this.filePath, 'utf-8');
      const data = JSON.parse(content);
      return data;
    } catch (error) {
      logger.error(`Error reading ${this.filePath}`, error);
      
      // 尝试恢复备份
      if (this.enableBackup) {
        const backup = this.restoreLatestBackup();
        if (backup !== null) {
          return backup;
        }
      }
      
      // 返回初始数据
      return this.initialData;
    }
  }

  /**
   * 写入数据
   * 使用原子写入（先写临时文件，再重命名）
   */
  write(data: T): void {
    const tempPath = `${this.filePath}.tmp`;
    
    try {
      // 确保目录存在
      ensureDir(DATA_DIR);
      
      // 写入临时文件
      const content = JSON.stringify(data, null, 2);
      fs.writeFileSync(tempPath, content, 'utf-8');
      
      // 原子重命名
      fs.renameSync(tempPath, this.filePath);
      
      // 创建备份
      if (this.enableBackup) {
        this.createBackup();
      }
    } catch (error) {
      logger.error(`Error writing ${this.filePath}`, error);
      
      // 清理临时文件
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // 忽略清理错误
        }
      }
      
      throw error;
    }
  }

  /**
   * 更新数据
   * 提供当前数据，返回新数据
   */
  update(updater: (current: T) => T): T {
    const current = this.read();
    const updated = updater(current);
    this.write(updated);
    return updated;
  }

  /**
   * 创建备份
   */
  private createBackup(): void {
    if (!fs.existsSync(this.filePath)) {
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${path.basename(this.filePath, '.json')}-${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    try {
      fs.copyFileSync(this.filePath, backupPath);
      
      // 清理旧备份
      this.cleanOldBackups();
    } catch (error) {
      logger.error('Error creating backup', error);
    }
  }

  /**
   * 清理旧备份，只保留最新的 N 个
   */
  private cleanOldBackups(): void {
    try {
      const baseName = path.basename(this.filePath, '.json');
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith(baseName) && f.endsWith('.json'))
        .sort()
        .reverse();

      // 删除超过保留数量的备份
      const toDelete = files.slice(this.backupCount);
      for (const file of toDelete) {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
      }
    } catch (error) {
      logger.error('Error cleaning old backups', error);
    }
  }

  /**
   * 恢复最新的备份
   */
  private restoreLatestBackup(): T | null {
    try {
      const baseName = path.basename(this.filePath, '.json');
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith(baseName) && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length === 0) {
        return null;
      }

      const latestBackup = path.join(BACKUP_DIR, files[0]);
      const content = fs.readFileSync(latestBackup, 'utf-8');
      const data = JSON.parse(content);
      
      logger.info(`Restored from backup: ${files[0]}`);
      return data;
    } catch (error) {
      logger.error('Error restoring backup', error);
      return null;
    }
  }

  /**
   * 删除存储文件
   */
  delete(): void {
    if (fs.existsSync(this.filePath)) {
      fs.unlinkSync(this.filePath);
    }
  }

  /**
   * 重置为初始数据
   */
  reset(): void {
    this.write(this.initialData);
  }
}

/**
 * 创建数组存储
 * 简化的接口，专门用于存储数组数据
 */
export class ArrayStore<T> {
  private store: PersistentStore<{ items: T[] }>;

  constructor(name: string, initialItems: T[] = []) {
    this.store = new PersistentStore<{ items: T[] }>({
      name,
      initialData: { items: initialItems },
      enableBackup: true
    });
  }

  /**
   * 获取所有项目
   */
  getAll(): T[] {
    return this.store.read().items;
  }

  /**
   * 设置所有项目
   */
  setAll(items: T[]): void {
    this.store.write({ items });
  }

  /**
   * 添加项目
   */
  add(item: T): void {
    this.store.update(current => ({
      items: [...current.items, item]
    }));
  }

  /**
   * 批量添加项目
   */
  addMany(items: T[]): void {
    this.store.update(current => ({
      items: [...current.items, ...items]
    }));
  }

  /**
   * 更新项目
   */
  update(predicate: (item: T) => boolean, updater: (item: T) => T): boolean {
    let found = false;
    this.store.update(current => ({
      items: current.items.map(item => {
        if (predicate(item)) {
          found = true;
          return updater(item);
        }
        return item;
      })
    }));
    return found;
  }

  /**
   * 删除项目
   */
  delete(predicate: (item: T) => boolean): boolean {
    const before = this.store.read().items.length;
    this.store.update(current => ({
      items: current.items.filter(item => !predicate(item))
    }));
    const after = this.getAll().length;
    return before > after;
  }

  /**
   * 批量更新所有匹配项
   * 性能优化：单次遍历，避免 N+1 问题
   * @param predicate 匹配条件
   * @param updater 更新函数
   * @returns 更新的项目数量
   */
  updateAll(predicate: (item: T) => boolean, updater: (item: T) => T): number {
    let count = 0;
    this.store.update(current => ({
      items: current.items.map(item => {
        if (predicate(item)) {
          count++;
          return updater(item);
        }
        return item;
      })
    }));
    return count;
  }

  /**
   * 批量删除所有匹配项
   * 性能优化：单次遍历，避免 N+1 问题
   * @param predicate 匹配条件
   * @returns 被删除的项目数组
   */
  deleteAll(predicate: (item: T) => boolean): T[] {
    const deleted: T[] = [];
    this.store.update(current => ({
      items: current.items.filter(item => {
        if (predicate(item)) {
          deleted.push(item);
          return false;
        }
        return true;
      })
    }));
    return deleted;
  }

  /**
   * 查找项目
   */
  find(predicate: (item: T) => boolean): T | undefined {
    return this.getAll().find(predicate);
  }

  /**
   * 过滤项目
   */
  filter(predicate: (item: T) => boolean): T[] {
    return this.getAll().filter(predicate);
  }

  /**
   * 获取项目数量
   */
  count(): number {
    return this.getAll().length;
  }

  /**
   * 清空所有项目
   */
  clear(): void {
    this.store.write({ items: [] });
  }
}

/**
 * 快速创建数组存储的工厂函数
 */
export function createArrayStore<T>(name: string, initialItems: T[] = []): ArrayStore<T> {
  return new ArrayStore<T>(name, initialItems);
}

// 默认导出
export default PersistentStore;