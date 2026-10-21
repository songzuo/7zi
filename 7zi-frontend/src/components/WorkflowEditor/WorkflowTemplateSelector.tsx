/**
 * Workflow Template Selector (New)
 *
 * 🎨 模板选择器组件
 * 版本: v1.12.2
 * 创建日期: 2026-04-04
 *
 * 使用新的模板系统，提供可视化的模板选择界面
 */

import React, { useState, useMemo } from 'react'
import { useWorkflowTemplate } from '../../hooks/useWorkflowTemplate'
import type { Template, TemplateCategory } from '../../lib/workflow/template-system'

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
  tagPreset: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  tagCustom: {
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
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#6c757d',
  },
}

// ============================================
// 类型定义
// ============================================

export interface WorkflowTemplateSelectorProps {
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
function getCategoryLabel(category: TemplateCategory): string {
  const labels: Record<TemplateCategory, string> = {
    'customer-service': '客服',
    'data-processing': '数据处理',
    'automation': '自动化',
    'approval': '审批',
    'collaboration': '协作',
    'custom': '自定义',
  }
  return labels[category]
}

/**
 * 获取类别图标
 */
function getCategoryIcon(category: TemplateCategory): string {
  const icons: Record<TemplateCategory, string> = {
    'customer-service': '💬',
    'data-processing': '📊',
    'automation': '⚡',
    'approval': '✅',
    'collaboration': '🤝',
    'custom': '📝',
  }
  return icons[category]
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
  template: Template
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
        <span style={styles.cardIcon}>{getCategoryIcon(template.category)}</span>
        <h3 style={styles.cardTitle}>{template.name}</h3>
      </div>

      <p style={styles.cardDescription}>{template.description}</p>

      <div style={styles.cardMeta}>
        <span style={{ ...styles.tag, ...styles.tagCategory }}>
          {getCategoryLabel(template.category)}
        </span>
        {template.isPreset ? (
          <span style={{ ...styles.tag, ...styles.tagPreset }}>预设</span>
        ) : (
          <span style={{ ...styles.tag, ...styles.tagCustom }}>自定义</span>
        )}
        {template.tags.slice(0, 2).map((tag) => (
          <span key={tag} style={{ ...styles.tag, ...styles.tagCategory }}>
            {tag}
          </span>
        ))}
      </div>

      <div style={styles.cardFooter}>
        <span>{template.workflow.nodes.length} 个节点</span>
        <span>使用 {template.usageCount} 次</span>
      </div>
    </div>
  )
}

/**
 * 工作流模板选择器主组件
 */
export function WorkflowTemplateSelector({
  onSelectTemplate,
  onCancel,
  className = '',
}: WorkflowTemplateSelectorProps): React.ReactElement {
  const {
    filteredTemplates,
    loading,
    error,
    selectedCategory,
    searchQuery,
    selectCategory,
    searchTemplates,
  } = useWorkflowTemplate({ autoLoad: true })

  const [localCategory, setLocalCategory] = useState<TemplateCategory | null>(null)
  const [localSearch, setLocalSearch] = useState('')

  // 处理分类选择
  const handleCategorySelect = (category: TemplateCategory | null) => {
    setLocalCategory(category)
    selectCategory(category)
  }

  // 处理搜索
  const handleSearch = (query: string) => {
    setLocalSearch(query)
    searchTemplates(query)
  }

  if (loading) {
    return (
      <div style={styles.container} className={className}>
        <div style={styles.loading}>
          <p>加载模板中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container} className={className}>
        <div style={styles.empty}>
          <p>加载模板失败</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>{error.message}</p>
        </div>
      </div>
    )
  }

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
          value={localSearch}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* 类别筛选 */}
      <div style={styles.filters}>
        <button
          style={{
            ...styles.filterButton,
            ...(localCategory === null ? styles.filterButtonActive : {}),
          }}
          onClick={() => handleCategorySelect(null)}
        >
          全部
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(localCategory === 'customer-service' ? styles.filterButtonActive : {}),
          }}
          onClick={() => handleCategorySelect('customer-service')}
        >
          客服
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(localCategory === 'data-processing' ? styles.filterButtonActive : {}),
          }}
          onClick={() => handleCategorySelect('data-processing')}
        >
          数据处理
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(localCategory === 'automation' ? styles.filterButtonActive : {}),
          }}
          onClick={() => handleCategorySelect('automation')}
        >
          自动化
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(localCategory === 'approval' ? styles.filterButtonActive : {}),
          }}
          onClick={() => handleCategorySelect('approval')}
        >
          审批
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(localCategory === 'collaboration' ? styles.filterButtonActive : {}),
          }}
          onClick={() => handleCategorySelect('collaboration')}
        >
          协作
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(localCategory === 'custom' ? styles.filterButtonActive : {}),
          }}
          onClick={() => handleCategorySelect('custom')}
        >
          自定义
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
 * 工作流模板选择对话框组件
 */
export function WorkflowTemplateSelectorDialog({
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
        <WorkflowTemplateSelector
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

export default WorkflowTemplateSelector