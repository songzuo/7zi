/**
 * NodeProperties - 节点属性编辑器
 *
 * 编辑单个节点的属性
 * v1.10.0 更新: 新增 loop, subworkflow, transform 节点配置支持
 * v1.11.0 更新: 新增验证状态显示、快捷操作按钮、改善表单布局
 */

import React, { useState, useCallback } from 'react'
import type { Node } from 'reactflow'
import type { WorkflowNodeData, ValidationError } from '../types'
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Settings,
  Info,
  X
} from 'lucide-react'

interface NodePropertiesProps {
  node: Node<WorkflowNodeData>
  onChange?: (data: Partial<WorkflowNodeData>) => void
  onDelete?: () => void
  onDuplicate?: () => void
  validationErrors?: ValidationError[]
}

interface KeyValue {
  key: string
  value: string
}

// 节点类型中文名称映射
const NODE_TYPE_LABELS: Record<string, string> = {
  start: '开始节点',
  end: '结束节点',
  agent: 'Agent 节点',
  condition: '条件节点',
  parallel: '并行节点',
  wait: '等待节点',
  humanInput: '人工输入',
  loop: '循环节点',
  subworkflow: '子工作流',
  transform: '数据转换',
}

// 节点类型颜色映射
const NODE_TYPE_COLORS: Record<string, string> = {
  start: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  end: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  agent: 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30',
  condition: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
  parallel: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  wait: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  humanInput: 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  loop: 'text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-900/30',
  subworkflow: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  transform: 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30',
}

export function NodeProperties({ 
  node, 
  onChange, 
  onDelete,
  onDuplicate,
  validationErrors = [] 
}: NodePropertiesProps) {
  const { data } = node
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']))
  const [copied, setCopied] = useState(false)

  // 过滤当前节点的验证错误
  const nodeErrors = validationErrors.filter(e => e.nodeId === data.id)
  const hasErrors = nodeErrors.some(e => e.severity === 'error')
  const hasWarnings = nodeErrors.some(e => e.severity === 'warning')

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  const handleChange = useCallback((field: string, value: unknown) => {
    onChange?.({ [field]: value })
  }, [onChange])

  const handleConfigChange = useCallback((field: string, value: unknown) => {
    onChange?.({
      config: {
        ...data.config,
        [field]: value,
      },
    })
  }, [data.config, onChange])

  // 复制节点配置
  const handleCopyConfig = useCallback(() => {
    const config = JSON.stringify(data.config, null, 2)
    navigator.clipboard.writeText(config).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [data.config])

  // 动态参数管理
  const handleAddParameter = useCallback(() => {
    const params = (data.config.parameters || []) as KeyValue[]
    handleConfigChange('parameters', [...params, { key: '', value: '' }])
  }, [data.config.parameters, handleConfigChange])

  const handleParameterChange = useCallback((index: number, field: 'key' | 'value', value: string) => {
    const params = (data.config.parameters || []) as KeyValue[]
    const newParams = [...params]
    newParams[index] = { ...newParams[index], [field]: value }
    handleConfigChange('parameters', newParams)
  }, [data.config.parameters, handleConfigChange])

  const handleRemoveParameter = useCallback((index: number) => {
    const params = (data.config.parameters || []) as KeyValue[]
    const newParams = params.filter((_, i) => i !== index)
    handleConfigChange('parameters', newParams)
  }, [data.config.parameters, handleConfigChange])

  const nodeTypeColor = NODE_TYPE_COLORS[data.type] || 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'

  return (
    <div className="flex h-full flex-col">
      {/* 头部区域 - 节点类型和快捷操作 */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center justify-between">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${nodeTypeColor}`}>
            {NODE_TYPE_LABELS[data.type] || data.type}
          </span>
          <div className="flex items-center gap-1">
            {/* 复制配置按钮 */}
            <button
              onClick={handleCopyConfig}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title="复制节点配置"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
            {/* 复制节点按钮 */}
            {onDuplicate && (
              <button
                onClick={onDuplicate}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                title="复制节点"
              >
                <Copy className="h-4 w-4" />
              </button>
            )}
            {/* 删除节点按钮 */}
            {onDelete && data.type !== 'start' && (
              <button
                onClick={onDelete}
                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                title="删除节点"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* 验证状态 */}
        {(hasErrors || hasWarnings) && (
          <ValidationStatus errors={nodeErrors} />
        )}

        {/* 节点名称 */}
        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            名称
          </label>
          <input
            type="text"
            value={data.label}
            onChange={e => handleChange('label', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
            placeholder="输入节点名称"
          />
        </div>
      </div>

      {/* 滚动区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 基本信息（可折叠） */}
        <Section
          title="基本信息"
          sectionKey="basic"
          expanded={expandedSections.has('basic')}
          onToggle={toggleSection}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                节点 ID
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={data.id}
                  disabled
                  className="flex-1 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 font-mono text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(data.id)}
                  className="rounded-lg border border-gray-300 px-2 py-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                  title="复制 ID"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                描述
              </label>
              <textarea
                value={data.description || ''}
                onChange={e => handleChange('description', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                placeholder="输入节点描述（可选）"
              />
            </div>

            {/* 启用/禁用开关 */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                启用节点
              </label>
              <ToggleSwitch
                checked={data.config.enabled !== false}
                onChange={checked => handleConfigChange('enabled', checked)}
              />
            </div>
          </div>
        </Section>

        {/* Agent 配置 */}
        {data.type === 'agent' && (
          <Section
            title="Agent 配置"
            sectionKey="agent"
            expanded={expandedSections.has('agent')}
            onToggle={toggleSection}
            icon={<Settings className="h-4 w-4" />}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Agent 类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={data.config.agentType || 'researcher'}
                  onChange={e => handleConfigChange('agentType', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                >
                  <option value="researcher">研究员</option>
                  <option value="assistant">助手</option>
                  <option value="analyst">分析师</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  提示词模板 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={data.config.prompt || ''}
                  onChange={e => handleConfigChange('prompt', e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                  placeholder="输入提示词模板..."
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  使用 {'{{变量名}}'} 语法引用变量
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    超时 (秒)
                  </label>
                  <input
                    type="number"
                    value={(data.config.timeout || 30000) / 1000}
                    onChange={e => handleConfigChange('timeout', Number(e.target.value) * 1000)}
                    min={1}
                    step={1}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    最大重试
                  </label>
                  <input
                    type="number"
                    value={data.config.retryConfig?.maxRetries || 0}
                    onChange={e => handleConfigChange('retryConfig', {
                      ...data.config.retryConfig,
                      maxRetries: Number(e.target.value),
                      retryDelay: data.config.retryConfig?.retryDelay || 1000,
                      backoffStrategy: data.config.retryConfig?.backoffStrategy || 'fixed'
                    })}
                    min={0}
                    max={5}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                  />
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* 条件配置 */}
        {data.type === 'condition' && (
          <Section
            title="条件配置"
            sectionKey="condition"
            expanded={expandedSections.has('condition')}
            onToggle={toggleSection}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  条件表达式 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={data.config.condition || ''}
                  onChange={e => handleConfigChange('condition', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                  placeholder="例如: inputs.value > 10"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  支持使用 inputs 变量，表达式求值为 true/false
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="text-xs text-blue-800 dark:text-blue-300">
                    <p className="font-medium">示例表达式：</p>
                    <ul className="mt-1 space-y-1">
                      <li><code className="rounded bg-blue-100 px-1 dark:bg-blue-800">inputs.status === 'success'</code></li>
                      <li><code className="rounded bg-blue-100 px-1 dark:bg-blue-800">inputs.count &gt; 10</code></li>
                      <li><code className="rounded bg-blue-100 px-1 dark:bg-blue-800">inputs.items.includes('target')</code></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* 等待配置 */}
        {data.type === 'wait' && (
          <Section
            title="等待配置"
            sectionKey="wait"
            expanded={expandedSections.has('wait')}
            onToggle={toggleSection}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  等待类型
                </label>
                <select
                  value={data.config.waitType || 'duration'}
                  onChange={e => handleConfigChange('waitType', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                >
                  <option value="duration">时间等待</option>
                  <option value="event">事件等待</option>
                </select>
              </div>
              {data.config.waitType !== 'event' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    等待时长 (秒)
                  </label>
                  <input
                    type="number"
                    value={(data.config.duration || 0) / 1000}
                    onChange={e => handleConfigChange('duration', Number(e.target.value) * 1000)}
                    min={0}
                    step={1}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                    placeholder="例如: 5"
                  />
                </div>
              )}
              {data.config.waitType === 'event' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    等待事件名称
                  </label>
                  <input
                    type="text"
                    value={data.config.waitForEvent || ''}
                    onChange={e => handleConfigChange('waitForEvent', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                    placeholder="例如: user_approval"
                  />
                </div>
              )}
            </div>
          </Section>
        )}

        {/* 循环配置 */}
        {data.type === 'loop' && (
          <Section
            title="循环配置"
            sectionKey="loop"
            expanded={expandedSections.has('loop')}
            onToggle={toggleSection}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  循环类型
                </label>
                <select
                  value={data.config.loopType || 'fixed'}
                  onChange={e => handleConfigChange('loopType', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                >
                  <option value="fixed">固定次数</option>
                  <option value="while">条件循环</option>
                  <option value="forEach">遍历数组</option>
                </select>
              </div>

              {data.config.loopType === 'fixed' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    循环次数
                  </label>
                  <input
                    type="number"
                    value={data.config.loopCount || 1}
                    onChange={e => handleConfigChange('loopCount', Number(e.target.value))}
                    min={1}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                  />
                </div>
              )}

              {data.config.loopType === 'while' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    循环条件
                  </label>
                  <input
                    type="text"
                    value={data.config.loopCondition || ''}
                    onChange={e => handleConfigChange('loopCondition', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                    placeholder="例如: inputs.continue === true"
                  />
                </div>
              )}

              {data.config.loopType === 'forEach' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    遍历数组
                  </label>
                  <input
                    type="text"
                    value={data.config.loopArray || 'inputs.items'}
                    onChange={e => handleConfigChange('loopArray', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                    placeholder="例如: inputs.items"
                  />
                </div>
              )}
            </div>
          </Section>
        )}

        {/* 子工作流配置 */}
        {data.type === 'subworkflow' && (
          <Section
            title="子工作流配置"
            sectionKey="subworkflow"
            expanded={expandedSections.has('subworkflow')}
            onToggle={toggleSection}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  子工作流 ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={data.config.subworkflowId || ''}
                  onChange={e => handleConfigChange('subworkflowId', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                  placeholder="输入子工作流 ID"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  输入映射
                </label>
                <textarea
                  value={data.config.inputMapping || ''}
                  onChange={e => handleConfigChange('inputMapping', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                  placeholder='{"param1": "inputs.value"}'
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  JSON 格式，定义输入参数映射
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  输出映射
                </label>
                <textarea
                  value={data.config.outputMapping || ''}
                  onChange={e => handleConfigChange('outputMapping', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                  placeholder='{"result": "outputs.data"}'
                />
              </div>
            </div>
          </Section>
        )}

        {/* 数据转换配置 */}
        {data.type === 'transform' && (
          <Section
            title="数据转换配置"
            sectionKey="transform"
            expanded={expandedSections.has('transform')}
            onToggle={toggleSection}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  转换类型
                </label>
                <select
                  value={data.config.transformType || 'javascript'}
                  onChange={e => handleConfigChange('transformType', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="jsonPath">JSON Path</option>
                  <option value="template">模板</option>
                </select>
              </div>

              {data.config.transformType !== 'javascript' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    转换脚本 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={data.config.transformScript || 'return inputs;'}
                    onChange={e => handleConfigChange('transformScript', e.target.value)}
                    rows={6}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                    placeholder="// 输入: inputs\n// 返回: 转换后的数据\nreturn inputs;"
                  />
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    返回值将作为节点输出
                  </p>
                </div>
              )}

              {data.config.transformType === 'jsonPath' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    JSON Path 表达式
                  </label>
                  <input
                    type="text"
                    value={data.config.jsonPath || '$.data'}
                    onChange={e => handleConfigChange('jsonPath', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                    placeholder="例如: $.data.items[*]"
                  />
                </div>
              )}

              {data.config.transformType === 'template' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    模板
                  </label>
                  <textarea
                    value={data.config.template || ''}
                    onChange={e => handleConfigChange('template', e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                    placeholder="{{inputs.value}}"
                  />
                </div>
              )}
            </div>
          </Section>
        )}

        {/* 参数管理 (通用) */}
        {(data.type === 'agent' || data.type === 'subworkflow' || data.type === 'transform') && (
          <Section
            title="参数管理"
            sectionKey="parameters"
            expanded={expandedSections.has('parameters')}
            onToggle={toggleSection}
          >
            <div className="space-y-3">
              {((data.config.parameters || []) as KeyValue[]).map((param, index) => (
                <div key={index} className="flex items-start gap-2">
                  <input
                    type="text"
                    value={param.key}
                    onChange={e => handleParameterChange(index, 'key', e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                    placeholder="参数名"
                  />
                  <input
                    type="text"
                    value={param.value}
                    onChange={e => handleParameterChange(index, 'value', e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                    placeholder="参数值"
                  />
                  <button
                    onClick={() => handleRemoveParameter(index)}
                    className="rounded-lg border border-red-300 px-2 py-2 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddParameter}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
              >
                <Plus className="h-4 w-4" />
                添加参数
              </button>
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

// 验证状态组件
function ValidationStatus({ errors }: { errors: ValidationError[] }) {
  if (errors.length === 0) return null

  const errorCount = errors.filter(e => e.severity === 'error').length
  const warningCount = errors.filter(e => e.severity === 'warning').length

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
      <div className="flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-300">
        {errorCount > 0 ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        )}
        <span>
          {errorCount > 0 && `${errorCount} 个错误`}
          {errorCount > 0 && warningCount > 0 && '，'}
          {warningCount > 0 && `${warningCount} 个警告`}
        </span>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-red-700 dark:text-red-400">
        {errors.slice(0, 3).map((error, index) => (
          <li key={index} className="flex items-start gap-1">
            <span>{error.severity === 'error' ? '•' : '○'}</span>
            <span>{error.message}</span>
          </li>
        ))}
        {errors.length > 3 && (
          <li className="text-red-600 dark:text-red-500">
            还有 {errors.length - 3} 个问题...
          </li>
        )}
      </ul>
    </div>
  )
}

// 开关组件
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// 可折叠部分组件
function Section({
  title,
  sectionKey,
  expanded,
  onToggle,
  children,
  icon,
}: {
  title: string
  sectionKey: string
  expanded: boolean
  onToggle: (key: string) => void
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700/50"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          {children}
        </div>
      )}
    </div>
  )
}
