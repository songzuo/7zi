/**
 * 模板系统使用示例
 *
 * 版本: v1.12.2
 * 创建日期: 2026-04-04
 *
 * 展示如何使用模板系统创建工作流
 */

import React, { useState } from 'react'
import {
  TemplateSelectorDialog,
  useWorkflowTemplates,
  type WorkflowDefinition,
} from './index'
import {
  listTemplates,
  getTemplate,
  createFromTemplate,
} from './templates'

// ============================================
// 示例 1: 基础模板选择器
// ============================================

export function BasicTemplateSelectorExample(): React.ReactElement {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null)

  const handleSelectTemplate = (templateId: string) => {
    // 从模板创建工作流
    const workflow = createFromTemplate(templateId, '我的工作流', '从模板创建的工作流')

    if (workflow) {
      setSelectedWorkflow(workflow)
      // 在这里可以将工作流传递给编辑器
      console.log('创建的工作流:', workflow)
    }
  }

  return (
    <div>
      <button onClick={() => setIsDialogOpen(true)}>从模板创建工作流</button>

      <TemplateSelectorDialog
        isOpen={isDialogOpen}
        onSelectTemplate={handleSelectTemplate}
        onClose={() => setIsDialogOpen(false)}
      />

      {selectedWorkflow && (
        <div style={{ marginTop: '20px' }}>
          <h3>已创建工作流: {selectedWorkflow.name}</h3>
          <p>节点数: {selectedWorkflow.nodes.length}</p>
          <p>边数: {selectedWorkflow.edges.length}</p>
        </div>
      )}
    </div>
  )
}

// ============================================
// 示例 2: 使用 Hook 的模板选择
// ============================================

export function HookTemplateSelectorExample(): React.ReactElement {
  const {
    templates,
    selectedTemplate,
    createdWorkflow,
    createWorkflow,
    isCreating,
    createError,
  } = useWorkflowTemplates()

  const [workflowName, setWorkflowName] = useState('')

  const handleSelectTemplate = (templateId: string) => {
    // 在实际应用中，这里会使用 hook 提供的 selectTemplate 方法
    // 这里简化处理
    console.log('选择了模板:', templateId)
  }

  const handleCreateWorkflow = () => {
    if (!selectedTemplate || !workflowName.trim()) {
      return
    }

    const workflow = createWorkflow(workflowName)
    if (workflow) {
      console.log('创建的工作流:', workflow)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>创建工作流</h2>

      {/* 模板列表 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>选择模板</h3>
        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {templates.map((template) => (
            <div
              key={template.id}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: selectedTemplate?.id === template.id ? '#e7f3ff' : 'white',
              }}
              onClick={() => handleSelectTemplate(template.id)}
            >
              <div style={{ fontSize: '24px' }}>{template.icon}</div>
              <div style={{ fontWeight: '600' }}>{template.name}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{template.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 工作流名称输入 */}
      {selectedTemplate && (
        <div style={{ marginBottom: '20px' }}>
          <h3>工作流名称</h3>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="输入工作流名称"
            style={{ padding: '8px', width: '300px' }}
          />
        </div>
      )}

      {/* 创建按钮 */}
      {selectedTemplate && (
        <button
          onClick={handleCreateWorkflow}
          disabled={!workflowName.trim() || isCreating}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isCreating ? 'not-allowed' : 'pointer',
            opacity: !workflowName.trim() ? 0.5 : 1,
          }}
        >
          {isCreating ? '创建中...' : '创建工作流'}
        </button>
      )}

      {/* 错误提示 */}
      {createError && (
        <div style={{ marginTop: '20px', color: '#dc3545' }}>
          错误: {createError}
        </div>
      )}

      {/* 创建成功 */}
      {createdWorkflow && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px' }}>
          <h3>工作流创建成功!</h3>
          <p>名称: {createdWorkflow.name}</p>
          <p>节点数: {createdWorkflow.nodes.length}</p>
          <p>边数: {createdWorkflow.edges.length}</p>
        </div>
      )}
    </div>
  )
}

// ============================================
// 示例 3: 编程式使用模板 API
// ============================================

export function TemplateApiExample(): React.ReactElement {
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const handleListTemplates = () => {
    const templates = listTemplates()
    addLog(`找到 ${templates.length} 个模板`)
    templates.forEach((t) => {
      addLog(`  - ${t.icon} ${t.name} (${t.category}/${t.difficulty})`)
    })
  }

  const handleCreateAiChatWorkflow = () => {
    const template = getTemplate('ai-chat')
    if (!template) {
      addLog('❌ 未找到 AI 对话模板')
      return
    }

    addLog(`✅ 找到模板: ${template.name}`)

    const workflow = createFromTemplate('ai-chat', '我的 AI 对话工作流', '从模板创建')
    if (workflow) {
      setWorkflow(workflow)
      addLog(`✅ 工作流创建成功: ${workflow.id}`)
      addLog(`   节点数: ${workflow.nodes.length}`)
      addLog(`   边数: ${workflow.edges.length}`)
    } else {
      addLog('❌ 工作流创建失败')
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>模板 API 示例</h2>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleListTemplates}
          style={{ padding: '10px 20px', marginRight: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          列出所有模板
        </button>
        <button
          onClick={handleCreateAiChatWorkflow}
          style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          创建 AI 对话工作流
        </button>
      </div>

      {/* 工作流信息 */}
      {workflow && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h3>工作流信息</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(workflow, null, 2)}
          </pre>
        </div>
      )}

      {/* 日志 */}
      <div style={{ marginTop: '20px' }}>
        <h3>操作日志</h3>
        <div style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px', maxHeight: '300px', overflow: 'auto' }}>
          {logs.length === 0 ? (
            <p style={{ color: '#666' }}>暂无日志</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ fontSize: '12px', marginBottom: '4px' }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// 示例 4: 与工作流编辑器集成
// ============================================

export function WorkflowEditorIntegrationExample(): React.ReactElement {
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowDefinition | null>(null)

  const handleCreateFromTemplate = (templateId: string) => {
    const workflow = createFromTemplate(
      templateId,
      `工作流 ${new Date().toLocaleDateString()}`,
      '从模板创建'
    )

    if (workflow) {
      setCurrentWorkflow(workflow)
      // 在实际应用中，这里会设置编辑器的工作流
      // 例如: setNodes(workflow.nodes); setEdges(workflow.edges);
    }
  }

  const handleNewBlankWorkflow = () => {
    const workflow = createFromTemplate('blank', '空白工作流', '空白模板')
    if (workflow) {
      setCurrentWorkflow(workflow)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>工作流编辑器</h2>

      {/* 工具栏 */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={handleNewBlankWorkflow}
          style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          新建空白工作流
        </button>
        <button
          onClick={() => setIsTemplateDialogOpen(true)}
          style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          从模板创建
        </button>
      </div>

      {/* 工作流信息 */}
      {currentWorkflow ? (
        <div style={{ padding: '15px', backgroundColor: '#d4edda', borderRadius: '4px' }}>
          <h3>当前工作流: {currentWorkflow.name}</h3>
          <p>{currentWorkflow.description}</p>
          <p>节点数: {currentWorkflow.nodes.length} | 边数: {currentWorkflow.edges.length}</p>

          {/* 节点列表 */}
          <div style={{ marginTop: '10px' }}>
            <h4>节点:</h4>
            <ul>
              {currentWorkflow.nodes.map((node) => (
                <li key={node.id}>
                  {node.type}: {node.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px', textAlign: 'center' }}>
          <p style={{ color: '#666' }}>暂无工作流，请创建或从模板加载</p>
        </div>
      )}

      {/* 模板选择对话框 */}
      <TemplateSelectorDialog
        isOpen={isTemplateDialogOpen}
        onSelectTemplate={handleCreateFromTemplate}
        onClose={() => setIsTemplateDialogOpen(false)}
      />
    </div>
  )
}

// ============================================
// 导出所有示例
// ============================================

export default {
  BasicTemplateSelectorExample,
  HookTemplateSelectorExample,
  TemplateApiExample,
  WorkflowEditorIntegrationExample,
}
