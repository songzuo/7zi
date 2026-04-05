/**
 * 高级搜索 v1.13.0 功能测试
 * @description 为 v1.13.0 新增功能编写测试用例
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  AdvancedSearchManager,
  getGlobalSearchManager,
  resetGlobalSearchManager,
  highlightSearchTerm,
  parseSearchQuery,
  buildSearchQuery,
} from '@/lib/search/advanced-search'
import type { SearchConfig, SearchResult, SearchTarget } from '@/types/search-filter'

// ============================================================================
// Test Data
// ============================================================================

interface TestItem {
  id: string
  title: string
  name?: string
  description: string
  keywords?: string[]
  status?: string
  priority?: string
  assignee?: string
  content?: string
  body?: string
}

const mockTasks: TestItem[] = [
  {
    id: 'task-1',
    title: 'Fix login bug',
    name: 'Fix login bug',
    description: 'Users cannot login to the system',
    keywords: ['bug', 'login', 'urgent'],
    status: 'open',
    priority: 'high',
    assignee: 'john',
    content: 'The login page has a critical bug',
    body: 'Please fix this issue ASAP',
  },
  {
    id: 'task-2',
    title: 'Implement search feature',
    name: 'Implement search feature',
    description: 'Add advanced search functionality',
    keywords: ['feature', 'search', 'fuzzy'],
    status: 'in-progress',
    priority: 'medium',
    assignee: 'jane',
    content: 'Add fuzzy search with highlighting',
    body: 'Use Fuse.js for search',
  },
  {
    id: 'task-3',
    title: 'Update documentation',
    name: 'Update documentation',
    description: 'Update API docs and README',
    keywords: ['docs', 'documentation'],
    status: 'open',
    priority: 'low',
    assignee: 'bob',
    content: 'Update the README file',
    body: 'Add more examples',
  },
  {
    id: 'task-4',
    title: 'Refactor authentication',
    name: 'Refactor authentication',
    description: 'Improve auth module architecture',
    keywords: ['auth', 'refactor', 'security'],
    status: 'open',
    priority: 'high',
    assignee: 'john',
    content: 'Use JWT tokens',
    body: 'Add refresh token support',
  },
  {
    id: 'task-5',
    title: 'Add dark mode',
    name: 'Add dark mode',
    description: 'Implement dark theme support',
    keywords: ['ui', 'theme', 'dark'],
    status: 'closed',
    priority: 'low',
    assignee: 'jane',
    content: 'Add CSS variables for theming',
    body: 'Support system preference',
  },
]

const mockProjects: TestItem[] = [
  {
    id: 'project-1',
    title: 'Website Redesign',
    name: 'Website Redesign',
    description: 'Complete redesign of company website',
    keywords: ['website', 'design', 'frontend'],
    status: 'active',
    priority: 'high',
  },
  {
    id: 'project-2',
    title: 'Mobile App',
    name: 'Mobile App',
    description: 'Build iOS and Android mobile app',
    keywords: ['mobile', 'ios', 'android'],
    status: 'planning',
    priority: 'medium',
  },
]

// ============================================================================
// Test Suite
// ============================================================================

describe('Advanced Search v1.13.0 - 高级搜索测试', () => {
  let searchManager: AdvancedSearchManager<TestItem>

  beforeEach(() => {
    searchManager = new AdvancedSearchManager<TestItem>(10, 5, 50)
    searchManager.createIndex('tasks', mockTasks)
    searchManager.createIndex('projects', mockProjects)
  })

  afterEach(() => {
    searchManager.clearCaches()
    searchManager.clearHistory()
    resetGlobalSearchManager()
  })

  // ========================================================================
  // 基础功能测试 (Happy Path)
  // ========================================================================

  describe('基础搜索功能', () => {
    it('应该能够搜索所有索引', () => {
      const results = searchManager.search('login')
      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)
    })

    it('应该能够搜索特定索引', () => {
      const results = searchManager.searchIndex('tasks', 'login')
      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.id).toBe('task-1')
    })

    it('应该按相关性排序结果', () => {
      const results = searchManager.search('bug')
      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)
      // 第一个结果应该是 task-1 (title match)
      expect(results[0].item.id).toBe('task-1')
    })

    it('应该支持结果数量限制', () => {
      const results = searchManager.search('test', { limit: 2 })
      expect(results.length).toBeLessThanOrEqual(2)
    })
  })

  // ========================================================================
  // 边界情况测试
  // ========================================================================

  describe('边界情况测试', () => {
    it('应该处理空查询', () => {
      const results = searchManager.search('')
      expect(results).toEqual([])
    })

    it('应该处理空白查询', () => {
      const results = searchManager.search('   ')
      expect(results).toEqual([])
    })

    it('应该处理不存在的索引', () => {
      const results = searchManager.search('test', { indices: ['non-existent'] })
      expect(results).toEqual([])
    })

    it('应该处理无结果查询', () => {
      const results = searchManager.search('xyz12345')
      expect(results).toEqual([])
    })

    it('应该处理特殊字符', () => {
      const results = searchManager.search('test@#$%')
      expect(results).toBeDefined()
    })

    it('应该处理极限数量的结果限制', () => {
      const results = searchManager.search('test', { limit: 0 })
      expect(results).toBeDefined()
    })

    it('应该处理非常长的查询字符串', () => {
      const longQuery = 'a'.repeat(1000)
      const results = searchManager.search(longQuery)
      expect(results).toBeDefined()
    })
  })

  // ========================================================================
  // 错误处理测试
  // ========================================================================

  describe('错误处理测试', () => {
    it('应该在索引不存在时返回空结果', () => {
      const results = searchManager.searchIndex('non-existent', 'test')
      expect(results).toEqual([])
    })

    it('应该在空索引上搜索', () => {
      searchManager.createIndex('empty', [])
      const results = searchManager.searchIndex('empty', 'test')
      expect(results).toEqual([])
    })

    it('应该处理无效的配置', () => {
      const results = searchManager.search('test', { config: undefined })
      expect(results).toBeDefined()
    })
  })

  // ========================================================================
  // 搜索历史测试
  // ========================================================================

  describe('搜索历史功能', () => {
    it('应该添加搜索到历史', () => {
      searchManager.addToHistory('login', 5, 'task')
      const history = searchManager.getHistory()
      expect(history.length).toBeGreaterThan(0)
      expect(history[0].query).toBe('login')
    })

    it('应该去重历史记录', () => {
      searchManager.addToHistory('login', 5, 'task')
      searchManager.addToHistory('login', 3, 'task')
      const history = searchManager.getHistory()
      const loginCount = history.filter(h => h.query === 'login').length
      expect(loginCount).toBe(1)
    })

    it('应该限制历史记录数量', () => {
      for (let i = 0; i < 15; i++) {
        searchManager.addToHistory(`query${i}`, i, 'task')
      }
      const history = searchManager.getHistory()
      expect(history.length).toBeLessThanOrEqual(10)
    })

    it('应该支持清除历史', () => {
      searchManager.addToHistory('login', 5, 'task')
      searchManager.clearHistory()
      const history = searchManager.getHistory()
      expect(history.length).toBe(0)
    })

    it('应该支持删除特定历史记录', () => {
      searchManager.addToHistory('login', 5, 'task')
      searchManager.addToHistory('bug', 3, 'task')
      searchManager.removeFromHistory('login')
      const history = searchManager.getHistory()
      expect(history.find(h => h.query === 'login')).toBeUndefined()
      expect(history.find(h => h.query === 'bug')).toBeDefined()
    })
  })

  // ========================================================================
  // 自动补全测试
  // ========================================================================

  describe('自动补全功能', () => {
    it('应该返回自动补全建议', () => {
      const suggestions = searchManager.getAutocompleteSuggestions('log')
      expect(suggestions).toBeDefined()
    })

    it('应该包含历史建议', () => {
      searchManager.addToHistory('login bug', 5, 'task')
      const suggestions = searchManager.getAutocompleteSuggestions('log', { includeHistory: true })
      expect(suggestions.some(s => s.type === 'history')).toBe(true)
    })

    it('应该返回前缀建议', () => {
      const suggestions = searchManager.getAutocompleteSuggestions('st')
      expect(suggestions.some(s => s.type === 'suggestion')).toBe(true)
    })

    it('应该处理空查询返回历史', () => {
      searchManager.addToHistory('recent query', 5, 'task')
      const suggestions = searchManager.getAutocompleteSuggestions('', { includeHistory: true })
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('应该限制建议数量', () => {
      const suggestions = searchManager.getAutocompleteSuggestions('a', { includeHistory: false })
      expect(suggestions.length).toBeLessThanOrEqual(5)
    })
  })

  // ========================================================================
  // 缓存功能测试
  // ========================================================================

  describe('缓存功能测试', () => {
    it('应该缓存搜索结果', () => {
      searchManager.search('login')
      const stats = searchManager.getCacheStats()
      expect(stats.searchCache.size).toBeGreaterThan(0)
    })

    it('应该缓存自动补全结果', () => {
      searchManager.getAutocompleteSuggestions('log')
      const stats = searchManager.getCacheStats()
      expect(stats.autocompleteCache.size).toBeGreaterThan(0)
    })

    it('应该清除所有缓存', () => {
      searchManager.search('login')
      searchManager.getAutocompleteSuggestions('log')
      searchManager.clearCaches()
      const stats = searchManager.getCacheStats()
      expect(stats.searchCache.size).toBe(0)
      expect(stats.autocompleteCache.size).toBe(0)
    })
  })

  // ========================================================================
  // 索引管理测试
  // ========================================================================

  describe('索引管理测试', () => {
    it('应该创建索引', () => {
      expect(searchManager.hasIndex('tasks')).toBe(true)
      expect(searchManager.hasIndex('projects')).toBe(true)
    })

    it('应该更新索引', () => {
      searchManager.updateIndex('tasks', [...mockTasks, { id: 'new-task', title: 'New Task', description: 'New' }])
      const results = searchManager.searchIndex('tasks', 'new task')
      expect(results.length).toBeGreaterThan(0)
    })

    it('应该删除索引', () => {
      searchManager.removeIndex('tasks')
      expect(searchManager.hasIndex('tasks')).toBe(false)
    })

    it('应该获取所有索引 ID', () => {
      const ids = searchManager.getIndexIds()
      expect(ids).toContain('tasks')
      expect(ids).toContain('projects')
    })
  })

  // ========================================================================
  // 高亮功能测试
  // ========================================================================

  describe('高亮功能测试', () => {
    it('应该高亮搜索词', () => {
      const text = 'This is a test search term'
      const indices = [[10, 14]] // 'test' position
      const highlighted = highlightSearchTerm(text, indices)
      expect(highlighted).toContain('<mark')
    })

    it('应该处理空索引', () => {
      const text = 'No highlights'
      const highlighted = highlightSearchTerm(text, [])
      expect(highlighted).toBe(text)
    })
  })

  // ========================================================================
  // 查询解析测试
  // ========================================================================

  describe('查询解析测试', () => {
    it('应该解析带过滤器的查询', () => {
      const result = parseSearchQuery('status:open bug')
      expect(result.text).toBe('bug')
      expect(result.filters.get('status')).toBe('open')
    })

    it('应该解析多个过滤器', () => {
      const result = parseSearchQuery('priority:high status:open task')
      expect(result.text).toBe('task')
      expect(result.filters.get('priority')).toBe('high')
      expect(result.filters.get('status')).toBe('open')
    })

    it('应该构建带过滤器的查询', () => {
      const query = buildSearchQuery('bug', { status: 'open', priority: 'high' })
      expect(query).toContain('bug')
      expect(query).toContain('status:open')
      expect(query).toContain('priority:high')
    })
  })

  // ========================================================================
  // 全局管理器测试
  // ========================================================================

  describe('全局管理器测试', () => {
    it('应该获取全局管理器实例', () => {
      const manager = getGlobalSearchManager()
      expect(manager).toBeDefined()
    })

    it('应该支持重新创建全局管理器', () => {
      const manager1 = getGlobalSearchManager()
      manager1.createIndex('test', [])
      const manager2 = getGlobalSearchManager(true)
      expect(manager2).not.toBe(manager1)
    })

    it('应该重置全局管理器', () => {
      const manager = getGlobalSearchManager()
      manager.addToHistory('test', 1)
      resetGlobalSearchManager()
      const newManager = getGlobalSearchManager()
      expect(newManager.getHistory().length).toBe(0)
    })
  })
})
