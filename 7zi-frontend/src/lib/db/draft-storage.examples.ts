/**
 * Draft Storage Usage Examples
 *
 * 展示如何使用草稿存储模块的示例代码
 */

import {
  DraftType,
  Draft,
  DraftStorageManager,
  getDraftStorageManager,
  saveDraft,
  loadDraft,
  listDrafts,
  deleteDraft,
  clearExpiredDrafts,
  updateDraft,
  clearAllDrafts,
  initializeDraftStorage,
} from './draft-storage'

/**
 * 示例 1: 基本使用 - 保存和加载草稿
 */
async function example1_BasicUsage() {
  console.log('=== Example 1: Basic Usage ===')

  // 保存工作流草稿
  const draftId = await saveDraft('workflow', {
    name: 'My Workflow',
    nodes: [
      { id: 'node1', type: 'start' },
      { id: 'node2', type: 'process' },
    ],
    edges: [],
  })

  console.log('Draft saved with ID:', draftId)

  // 加载草稿
  const draft = await loadDraft(draftId)
  console.log('Loaded draft:', draft)

  // 删除草稿
  await deleteDraft(draftId)
  console.log('Draft deleted')
}

/**
 * 示例 2: 自定义过期时间
 */
async function example2_CustomExpiration() {
  console.log('=== Example 2: Custom Expiration ===')

  // 保存 1 小时后过期的草稿
  const draftId = await saveDraft(
    'workflow',
    { name: 'Temporary Workflow' },
    { ttl: 60 * 60 * 1000 } // 1 小时
  )

  console.log('Draft saved with 1 hour expiration:', draftId)

  // 删除
  await deleteDraft(draftId)
}

/**
 * 示例 3: 列出特定类型的草稿
 */
async function example3_ListDrafts() {
  console.log('=== Example 3: List Drafts by Type ===')

  // 保存多个草稿
  const wf1 = await saveDraft('workflow', { name: 'Workflow 1' })
  const wf2 = await saveDraft('workflow', { name: 'Workflow 2' })
  const tpl1 = await saveDraft('template', { name: 'Template 1' })
  const exec1 = await saveDraft('execution', { status: 'running' })

  // 列出所有工作流草稿
  const workflowDrafts = await listDrafts('workflow')
  console.log('Workflow drafts:', workflowDrafts.length)

  // 列出所有模板草稿
  const templateDrafts = await listDrafts('template')
  console.log('Template drafts:', templateDrafts.length)

  // 列出所有草稿
  const allDrafts = await listDrafts()
  console.log('All drafts:', allDrafts.length)

  // 清理
  await deleteDraft(wf1)
  await deleteDraft(wf2)
  await deleteDraft(tpl1)
  await deleteDraft(exec1)
}

/**
 * 示例 4: 更新草稿
 */
async function example4_UpdateDraft() {
  console.log('=== Example 4: Update Draft ===')

  // 保存草稿
  const draftId = await saveDraft('workflow', {
    name: 'Initial Workflow',
    nodes: [{ id: 'node1', type: 'start' }],
  })

  // 加载并查看
  const draft1 = await loadDraft(draftId)
  console.log('Initial draft:', draft1)

  // 更新草稿
  await updateDraft(draftId, {
    nodes: [
      { id: 'node1', type: 'start' },
      { id: 'node2', type: 'end' },
    ],
  })

  // 再次加载查看
  const draft2 = await loadDraft(draftId)
  console.log('Updated draft:', draft2)

  // 删除
  await deleteDraft(draftId)
}

/**
 * 示例 5: 清理过期草稿
 */
async function example5_ClearExpired() {
  console.log('=== Example 5: Clear Expired Drafts ===')

  // 保存一个立即过期的草稿
  const expiredId = await saveDraft(
    'workflow',
    { name: 'Expired Workflow' },
    { ttl: 1 } // 1 毫秒后过期
  )

  // 等待过期
  await new Promise(resolve => setTimeout(resolve, 10))

  // 清理过期草稿
  const cleared = await clearExpiredDrafts()
  console.log(`Cleared ${cleared} expired draft(s)`)

  // 尝试加载（应该返回 null）
  const expiredDraft = await loadDraft(expiredId)
  console.log('Expired draft loaded:', expiredDraft) // null
}

/**
 * 示例 6: 使用 DraftStorageManager 类
 */
async function example6_UsingManager() {
  console.log('=== Example 6: Using DraftStorageManager ===')

  const manager = getDraftStorageManager()

  // 检查使用的存储后端
  console.log('Storage backend:', manager.getBackend())

  // 保存草稿
  const draftId = await manager.saveDraft('template', {
    name: 'Manager Workflow',
  })

  // 列出模板
  const templates = await manager.listDrafts('template')
  console.log('Templates:', templates.length)

  // 清空所有草稿
  await manager.clearAllDrafts()
  console.log('All drafts cleared')
}

/**
 * 示例 7: 页面初始化时自动清理过期草稿
 */
function example7_PageInitialization() {
  console.log('=== Example 7: Page Initialization ===')

  // 在应用初始化时调用
  initializeDraftStorage().then(() => {
    console.log('Draft storage initialized')
  })
}

/**
 * 示例 8: 实际使用场景 - 工作流编辑器自动保存
 */
class WorkflowEditor {
  private draftId: string | null = null
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    // 尝试加载最近的草稿
    this.loadLatestDraft()
  }

  /**
   * 加载最新的工作流草稿
   */
  private async loadLatestDraft() {
    const drafts = await listDrafts('workflow')

    if (drafts.length > 0) {
      // 按更新时间排序，获取最新的
      const latest = drafts.sort((a, b) => b.updatedAt - a.updatedAt)[0]

      // 询问用户是否恢复草稿
      const shouldRestore = confirm(`发现未保存的工作流草稿 (${new Date(latest.updatedAt).toLocaleString()}), 是否恢复？`)

      if (shouldRestore && latest.data) {
        this.draftId = latest.id
        this.loadWorkflowData(latest.data)
      }
    }
  }

  /**
   * 加载工作流数据
   */
  private loadWorkflowData(data: unknown) {
    console.log('Loading workflow data:', data)
    // 实际应用中，这里会将数据加载到编辑器中
  }

  /**
   * 自动保存草稿
   */
  scheduleAutoSave(data: unknown) {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
    }

    // 2秒后自动保存（防抖）
    this.autoSaveTimer = setTimeout(() => {
      this.saveDraft(data)
    }, 2000)
  }

  /**
   * 保存草稿
   */
  private async saveDraft(data: unknown) {
    if (this.draftId) {
      // 更新现有草稿
      await updateDraft(this.draftId, data)
    } else {
      // 创建新草稿
      this.draftId = await saveDraft('workflow', data)
    }

    console.log('Workflow draft saved:', this.draftId)
  }

  /**
   * 删除当前草稿
   */
  async discardDraft() {
    if (this.draftId) {
      await deleteDraft(this.draftId)
      this.draftId = null
    }
  }
}

/**
 * 示例 9: 类型安全的草稿存储
 */
interface WorkflowData {
  name: string
  description?: string
  nodes: Array<{ id: string; type: string }>
  edges: Array<{ source: string; target: string }>
}

async function example9_TypeSafeDrafts() {
  console.log('=== Example 9: Type-Safe Drafts ===')

  // 保存类型化数据
  const workflow: WorkflowData = {
    name: 'My Workflow',
    nodes: [
      { id: 'node1', type: 'start' },
      { id: 'node2', type: 'end' },
    ],
    edges: [{ source: 'node1', target: 'node2' }],
  }

  const draftId = await saveDraft('workflow', workflow)

  // 加载并保持类型安全
  const draft = await loadDraft<WorkflowData>(draftId)
  if (draft?.data) {
    console.log('Workflow name:', draft.data.name)
    console.log('Node count:', draft.data.nodes.length)
  }

  // 删除
  await deleteDraft(draftId)
}

/**
 * 导出所有示例（用于测试）
 */
export const examples = {
  example1_BasicUsage,
  example2_CustomExpiration,
  example3_ListDrafts,
  example4_UpdateDraft,
  example5_ClearExpired,
  example6_UsingManager,
  example7_PageInitialization,
  WorkflowEditor,
  example9_TypeSafeDrafts,
}

// 如果直接运行此文件，执行所有示例
if (typeof window !== 'undefined') {
  // 浏览器环境
  console.log('Draft Storage Examples loaded. Run specific examples manually.')
}
