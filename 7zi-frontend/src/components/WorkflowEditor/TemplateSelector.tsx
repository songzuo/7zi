/**
 * 模板选择器组件
 *
 * 版本: v1.12.2
 * 创建日期: 2026-04-04
 *
 * 提供可视化的模板选择界面
 */

import React, { useState, useMemo } from 'react'
import {
  listTemplates,
  listTemplatesByCategory,
  listTemplatesByDifficulty,
  searchTemplatesByTag,
  type WorkflowTemplate,
} from './templates'

// ============================================
// 样式定义
// ============================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    maxHeight: '600px',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#212529',
    margin: 0,
  },
  filters: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
    marginBottom: '16px',
  },
  filterButton: {
    padding: '6px 12px',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#007bff',
    color: '#ffffff',
    borderColor: '#007bff',
  },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    fontSize: '14px',
    minWidth: '200px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  cardHover: {
    borderColor: '#007bff',
    boxShadow: '0 2px 8px rgba(0, 123, 255, 0.15)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  cardIcon: {
    fontSize: '32px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#212529',
    margin: 0,
    flex: 1,
  },
  cardDescription: {
    fontSize: '14px',
    color: '#6c757d',
    margin: 0,
    lineHeight: '1.5',
  },
  cardMeta: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  tag: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  tagCategory: {
    backgroundColor: '#e7f3ff',
    color: '#0066cc',
  },
  tagDifficulty: {
    backgroundColor: '#f0f0f0',
    color: '#666666',
  },
  tagFeature: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #dee2e6',
    fontSize: '12px',
    color: '#6c757d',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#6c757d',
  },
}

// ============================================
// 类型定义
// ============================================

export interface TemplateSelectorProps {
  onSelectTemplate: (templateId: string) => void
  onCancel?: () => void
  className?: string
}

// ============================================
// 辅助函数
// ============================================

/**
 * 获取类别标签
 */
function getCategoryLabel(category: WorkflowTemplate['category']): string {
  const labels: Record<WorkflowTemplate['category'], string> = {
    basic: '基础',
    ai: 'AI',
    data: '数据',
    logic: '逻辑',
    advanced: '高级',
  }
  return labels[category]
}

/**
 * 获取难度标签
 */
function getDifficultyLabel(difficulty: WorkflowTemplate['difficulty']): string {
  const labels: Record<WorkflowTemplate['difficulty'], string> = {
    beginner: '入门',
    intermediate: '中级',
    advanced: '高级',
  }
  return labels[difficulty]
}

/**
 * 获取难度颜色
 */
function getDifficultyColor(difficulty: WorkflowTemplate['difficulty']): string {
  const colors: Record<WorkflowTemplate['difficulty'], string> = {
    beginner: '#28a745',
    intermediate: '#ffc107',
    advanced: '#dc3545',
  }
  return colors[difficulty]
}

// ============================================
// 组件
// ============================================

/**
 * 模板卡片组件
 */
function TemplateCard({
  template,
  onSelect,
}: {
  template: WorkflowTemplate
  onSelect: (templateId: string) => void
}): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      style={{
        ...styles.card,
        ...(isHovered ? styles.cardHover : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(template.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(template.id)
        }
      }}
    >
      <div style={styles.cardHeader}>
        <span style={styles.cardIcon}>{template.icon}</span>
        <h3 style={styles.cardTitle}>{template.name}</h3>
      </div>

      <p style={styles.cardDescription}>{template.description}</p>

      <div style={styles.cardMeta}>
        <span style={{ ...styles.tag, ...styles.tagCategory }}>
          {getCategoryLabel(template.category)}
        </span>
        <span
          style={{
            ...styles.tag,
            ...styles.tagDifficulty,
            backgroundColor: getDifficultyColor(template.difficulty) + '20',
            color: getDifficultyColor(template.difficulty),
          }}
        >
          {getDifficultyLabel(template.difficulty)}
        </span>
        {template.tags.slice(0, 2).map((tag) => (
          <span key={tag} style={{ ...styles.tag, ...styles.tagFeature }}>
            {tag}
          </span>
        ))}
      </div>

      {template.preview?.features && (
        <div style={styles.cardMeta}>
          {template.preview.features.slice(0, 3).map((feature) => (
            <span key={feature} style={{ ...styles.tag, ...styles.tagFeature }}>
              {feature}
            </span>
          ))}
        </div>
      )}

      <div style={styles.cardFooter}>
        <span>{template.estimatedNodes} 个节点</span>
        <span>点击使用 →</span>
      </div>
    </div>
  )
}

/**
 * 模板选择器主组件
 */
export function TemplateSelector({
  onSelectTemplate,
  onCancel,
  className = '',
}: TemplateSelectorProps): React.ReactElement {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 筛选模板
  const filteredTemplates = useMemo(() => {
    let templates = listTemplates()

    // 按类别筛选
    if (selectedCategory !== 'all') {
      templates = listTemplatesByCategory(selectedCategory as WorkflowTemplate['category'])
    }

    // 按难度筛选
    if (selectedDifficulty !== 'all') {
      templates = templates.filter((t) => t.difficulty === selectedDifficulty)
    }

    // 按搜索词筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    return templates
  }, [selectedCategory, selectedDifficulty, searchQuery])

  return (
    <div style={styles.container} className={className}>
      <div style={styles.header}>
        <h2 style={styles.title}>选择工作流模板</h2>
        {onCancel && (
          <button
            style={{
              padding: '6px 12px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
            }}
            onClick={onCancel}
          >
            取消
          </button>
        )}
      </div>

      {/* 搜索框 */}
      <div>
        <input
          type="text"
          placeholder="搜索模板..."
          style={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 类别筛选 */}
      <div style={styles.filters}>
        <button
          style={{
            ...styles.filterButton,
            ...(selectedCategory === 'all' ? styles.filterButtonActive : {}),
          }}
          onClick={() => setSelectedCategory('all')}
        >
          全部
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(selectedCategory === 'basic' ? styles.filterButtonActive : {}),
          }}
          onClick={() => setSelectedCategory('basic')}
        >
          基础
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(selectedCategory === 'ai' ? styles.filterButtonActive : {}),
          }}
          onClick={() => setSelectedCategory('ai')}
        >
          AI
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(selectedCategory === 'data' ? styles.filterButtonActive : {}),
          }}
          onClick={() => setSelectedCategory('data')}
        >
          数据
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(selectedCategory === 'logic' ? styles.filterButtonActive : {}),
          }}
          onClick={() => setSelectedCategory('logic')}
        >
          逻辑
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(selectedCategory === 'advanced' ? styles.filterButtonActive : {}),
          }}
          onClick={() => setSelectedCategory('advanced')}
        >
          高级
        </button>
      </div>

      {/* 难度筛选 */}
      <div style={styles.filters}>
        <button
          style={{
            ...styles.filterButton,
            ...(selectedDifficulty === 'all' ? styles.filterButtonActive : {}),
          }}
          onClick={() => setSelectedDifficulty('all')}
        >
          全部难度
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(selectedDifficulty === 'beginner' ? styles.filterButtonActive : {}),
          }}
          onClick={() => setSelectedDifficulty('beginner')}
        >
          入门
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(selectedDifficulty === 'intermediate' ? styles.filterButtonActive : {}),
          }}
          onClick={() => setSelectedDifficulty('intermediate')}
        >
          中级
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(selectedDifficulty === 'advanced' ? styles.filterButtonActive : {}),
          }}
          onClick={() => setSelectedDifficulty('advanced')}
        >
          高级
        </button>
      </div>

      {/* 模板网格 */}
      {filteredTemplates.length > 0 ? (
        <div style={styles.grid}>
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelectTemplate}
            />
          ))}
        </div>
      ) : (
        <div style={styles.empty}>
          <p>没有找到匹配的模板</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            尝试调整筛选条件或搜索关键词
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * 模板选择对话框组件
 */
export function TemplateSelectorDialog({
  isOpen,
  onSelectTemplate,
  onClose,
}: {
  isOpen: boolean
  onSelectTemplate: (templateId: string) => void
  onClose: () => void
}): React.ReactElement | null {
  if (!isOpen) {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          maxWidth: '900px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <TemplateSelector
          onSelectTemplate={(templateId) => {
            onSelectTemplate(templateId)
            onClose()
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  )
}

export default TemplateSelector