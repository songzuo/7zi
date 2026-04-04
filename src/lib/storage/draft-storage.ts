/**
 * Workflow Draft Storage - IndexedDB 持久化存储
 * 
 * v1.12.2 功能：工作流草稿自动保存
 * - 支持 IndexedDB 主存储
 * - localStorage 降级方案
 * - 自动清理过期草稿
 */

// ============================================
// 类型定义
// ============================================

export interface WorkflowDraft {
  id: string;
  workflowId: string;
  content: string; // JSON serialized workflow
  updatedAt: number;
  createdAt: number;
  name?: string;
}

export interface DraftStorageStats {
  totalDrafts: number;
  oldestDraft: number | null;
  newestDraft: number | null;
  totalSize: number; // bytes
}

// ============================================
// 常量配置
// ============================================

const DB_NAME = 'workflow-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';
const LOCAL_STORAGE_KEY = 'workflow-drafts-backup';

// ============================================
// IndexedDB 检测与初始化
// ============================================

let dbInstance: IDBDatabase | null = null;
let useLocalStorage = false;

/**
 * 检测 IndexedDB 是否可用
 */
export function isIndexedDBAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * 初始化 IndexedDB
 * 返回 Promise<boolean> 表示是否成功
 */
export async function initDraftDB(): Promise<boolean> {
  if (!isIndexedDBAvailable()) {
    useLocalStorage = true;
    console.warn('[DraftStorage] IndexedDB 不可用，降级到 localStorage');
    return true;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[DraftStorage] IndexedDB 打开失败:', request.error);
      useLocalStorage = true;
      resolve(true); // 降级成功也算成功
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('[DraftStorage] IndexedDB 初始化成功');
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 创建 object store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('workflowId', 'workflowId', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * 获取数据库实例（内部使用）
 */
function getDB(): IDBDatabase | null {
  return dbInstance;
}

// ============================================
// CRUD 操作
// ============================================

/**
 * 保存草稿
 */
export async function saveDraft(draft: WorkflowDraft): Promise<void> {
  if (useLocalStorage) {
    return saveDraftToLocalStorage(draft);
  }

  const db = getDB();
  if (!db) {
    throw new Error('[DraftStorage] 数据库未初始化');
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // 更新时间戳
    const draftToSave: WorkflowDraft = {
      ...draft,
      updatedAt: Date.now(),
    };
    
    const request = store.put(draftToSave);

    request.onerror = () => {
      console.error('[DraftStorage] 保存草稿失败:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * 获取单个草稿
 */
export async function getDraft(id: string): Promise<WorkflowDraft | null> {
  if (useLocalStorage) {
    return getDraftFromLocalStorage(id);
  }

  const db = getDB();
  if (!db) {
    throw new Error('[DraftStorage] 数据库未初始化');
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => {
      console.error('[DraftStorage] 获取草稿失败:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result || null);
    };
  });
}

/**
 * 根据 workflowId 获取草稿
 */
export async function getDraftByWorkflowId(workflowId: string): Promise<WorkflowDraft | null> {
  if (useLocalStorage) {
    return getDraftFromLocalStorageByWorkflowId(workflowId);
  }

  const db = getDB();
  if (!db) {
    throw new Error('[DraftStorage] 数据库未初始化');
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('workflowId');
    const request = index.get(workflowId);

    request.onerror = () => {
      console.error('[DraftStorage] 获取草稿失败:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result || null);
    };
  });
}

/**
 * 列出所有草稿
 */
export async function listDrafts(): Promise<WorkflowDraft[]> {
  if (useLocalStorage) {
    return listDraftsFromLocalStorage();
  }

  const db = getDB();
  if (!db) {
    throw new Error('[DraftStorage] 数据库未初始化');
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => {
      console.error('[DraftStorage] 列出草稿失败:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      const drafts = request.result || [];
      // 按更新时间降序排列
      drafts.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(drafts);
    };
  });
}

/**
 * 删除草稿
 */
export async function deleteDraft(id: string): Promise<void> {
  if (useLocalStorage) {
    return deleteDraftFromLocalStorage(id);
  }

  const db = getDB();
  if (!db) {
    throw new Error('[DraftStorage] 数据库未初始化');
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => {
      console.error('[DraftStorage] 删除草稿失败:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * 清除所有草稿
 */
export async function clearAllDrafts(): Promise<void> {
  if (useLocalStorage) {
    return clearAllDraftsFromLocalStorage();
  }

  const db = getDB();
  if (!db) {
    throw new Error('[DraftStorage] 数据库未初始化');
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => {
      console.error('[DraftStorage] 清除草稿失败:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

// ============================================
// 清理功能
// ============================================

/**
 * 清理旧草稿
 * @param beforeDays 清理多少天前的草稿
 * @returns 删除的草稿数量
 */
export async function clearOldDrafts(beforeDays: number): Promise<number> {
  const cutoffTime = Date.now() - beforeDays * 24 * 60 * 60 * 1000;
  
  if (useLocalStorage) {
    return clearOldDraftsFromLocalStorage(cutoffTime);
  }

  const db = getDB();
  if (!db) {
    throw new Error('[DraftStorage] 数据库未初始化');
  }

  const drafts = await listDrafts();
  let deletedCount = 0;

  for (const draft of drafts) {
    if (draft.updatedAt < cutoffTime) {
      await deleteDraft(draft.id);
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * 获取存储统计信息
 */
export async function getDraftStats(): Promise<DraftStorageStats> {
  const drafts = await listDrafts();
  
  if (drafts.length === 0) {
    return {
      totalDrafts: 0,
      oldestDraft: null,
      newestDraft: null,
      totalSize: 0,
    };
  }

  const sorted = [...drafts].sort((a, b) => a.updatedAt - b.updatedAt);
  const totalSize = drafts.reduce((acc, d) => acc + d.content.length * 2, 0); // 估算字节

  return {
    totalDrafts: drafts.length,
    oldestDraft: sorted[0].updatedAt,
    newestDraft: sorted[sorted.length - 1].updatedAt,
    totalSize,
  };
}

// ============================================
// localStorage 降级实现
// ============================================

function getLocalStorageData(): Record<string, WorkflowDraft> {
  if (typeof window === 'undefined') {
    return {};
  }
  
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setLocalStorageData(data: Record<string, WorkflowDraft>): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[DraftStorage] localStorage 写入失败:', e);
    throw e;
  }
}

async function saveDraftToLocalStorage(draft: WorkflowDraft): Promise<void> {
  const data = getLocalStorageData();
  data[draft.id] = {
    ...draft,
    updatedAt: Date.now(),
  };
  setLocalStorageData(data);
}

async function getDraftFromLocalStorage(id: string): Promise<WorkflowDraft | null> {
  const data = getLocalStorageData();
  return data[id] || null;
}

async function getDraftFromLocalStorageByWorkflowId(workflowId: string): Promise<WorkflowDraft | null> {
  const data = getLocalStorageData();
  for (const draft of Object.values(data)) {
    if (draft.workflowId === workflowId) {
      return draft;
    }
  }
  return null;
}

async function listDraftsFromLocalStorage(): Promise<WorkflowDraft[]> {
  const data = getLocalStorageData();
  const drafts = Object.values(data);
  drafts.sort((a, b) => b.updatedAt - a.updatedAt);
  return drafts;
}

async function deleteDraftFromLocalStorage(id: string): Promise<void> {
  const data = getLocalStorageData();
  delete data[id];
  setLocalStorageData(data);
}

async function clearAllDraftsFromLocalStorage(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}

async function clearOldDraftsFromLocalStorage(cutoffTime: number): Promise<number> {
  const data = getLocalStorageData();
  let deletedCount = 0;

  for (const [id, draft] of Object.entries(data)) {
    if (draft.updatedAt < cutoffTime) {
      delete data[id];
      deletedCount++;
    }
  }

  setLocalStorageData(data);
  return deletedCount;
}

// ============================================
// 导出便捷方法
// ============================================

/**
 * 创建新草稿的工厂函数
 */
export function createDraft(
  workflowId: string,
  content: string,
  name?: string
): WorkflowDraft {
  const now = Date.now();
  return {
    id: `draft-${workflowId}-${now}`,
    workflowId,
    content,
    createdAt: now,
    updatedAt: now,
    name,
  };
}

/**
 * 批量保存草稿
 */
export async function saveDrafts(drafts: WorkflowDraft[]): Promise<void> {
  for (const draft of drafts) {
    await saveDraft(draft);
  }
}

/**
 * 批量删除草稿
 */
export async function deleteDrafts(ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteDraft(id);
  }
}
