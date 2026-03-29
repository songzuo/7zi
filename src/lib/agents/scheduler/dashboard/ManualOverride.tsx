'use client';

/**
 * ManualOverride.tsx
 * Manual intervention interface for overriding scheduling decisions
 * Features:
 * - Override scheduling decisions
 * - Confirmation dialog
 * - Task reassignment
 * - Audit trail
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  useSchedulerStore,
  selectPendingTasks,
  selectAgents,
} from '../stores/scheduler-store';
import type { Task } from '../models/task-model';
import type { AgentCapability } from '../models/agent-capability';
import type { TaskType } from '../models/agent-capability';

/**
 * Agent emoji mapping
 */
const AGENT_EMOJIS: Record<string, string> = {
  'agent-expert': '🌟',
  'consultant': '📚',
  'architect': '🏗️',
  'executor': '⚡',
  'sysadmin': '🛡️',
  'tester': '🧪',
  'designer': '🎨',
  'promoter': '📣',
  'sales': '💼',
  'finance': '💰',
  'media': '📺',
};

/**
 * Priority colors
 */
const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  urgent: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  low: { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-700 dark:text-gray-400' },
};

/**
 * Confirmation dialog component
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      bg: 'bg-red-600 hover:bg-red-700',
      icon: '⚠️',
    },
    warning: {
      bg: 'bg-orange-600 hover:bg-orange-700',
      icon: '⚡',
    },
    info: {
      bg: 'bg-blue-600 hover:bg-blue-700',
      icon: 'ℹ️',
    },
  };

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-2xl">
              {style.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                此操作需要您的确认
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/30 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${style.bg} transition-colors`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Agent selection item
 */
interface AgentSelectItemProps {
  agent: AgentCapability;
  isSelected: boolean;
  onSelect: () => void;
  reason?: string;
}

function AgentSelectItem({
  agent,
  isSelected,
  onSelect,
  reason,
}: AgentSelectItemProps) {
  const emoji = AGENT_EMOJIS[agent.agentId] || '🤖';
  const statusColor = !agent.availability
    ? 'border-red-300 dark:border-red-800'
    : agent.currentLoad > 80
    ? 'border-orange-300 dark:border-orange-800'
    : 'border-green-300 dark:border-green-800';

  return (
    <button
      onClick={onSelect}
      disabled={!agent.availability}
      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : `border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 ${
              !agent.availability ? 'opacity-50 cursor-not-allowed' : ''
            }`
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center text-xl border-2 border-white dark:border-gray-700">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
              {agent.name}
            </h4>
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                !agent.availability
                  ? 'bg-red-500'
                  : agent.currentLoad > 80
                  ? 'bg-orange-500'
                  : 'bg-green-500'
              }`}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {agent.provider}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span>负载: {agent.currentLoad}%</span>
            <span>并发: {agent.capabilities.concurrency}</span>
            <span>成功率: {(agent.capabilities.successRate * 100).toFixed(0)}%</span>
          </div>
          {reason && (
            <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 line-clamp-2">
              {reason}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * Task selection item
 */
interface TaskSelectItemProps {
  task: Task;
  isSelected: boolean;
  onSelect: () => void;
}

function TaskSelectItem({ task, isSelected, onSelect }: TaskSelectItemProps) {
  const priorityColor = PRIORITY_COLORS[task.priority];
  const assignedAgent = useSchedulerStore.getState().agents.find(
    a => a.agentId === task.assignedAgent
  );
  const currentAgentEmoji = assignedAgent
    ? AGENT_EMOJIS[assignedAgent.agentId] || '🤖'
    : '⏳';

  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${priorityColor.bg} ${priorityColor.text}`}>
              {task.priority.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {task.type}
            </span>
          </div>
          <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {task.title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
            {task.description || 'No description'}
          </p>
        </div>
        <div className="text-center">
          <div className="text-xl">{currentAgentEmoji}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {assignedAgent ? assignedAgent.name.slice(0, 6) : '未分配'}
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * Override form section
 */
interface OverrideFormProps {
  selectedTask: Task | null;
  selectedAgent: AgentCapability | null;
  overrideReason: string;
  onReasonChange: (reason: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function OverrideForm({
  selectedTask,
  selectedAgent,
  overrideReason,
  onReasonChange,
  onSubmit,
  onCancel,
  isSubmitting,
}: OverrideFormProps) {
  if (!selectedTask || !selectedAgent) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900/30 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-center text-gray-500 dark:text-gray-400">
          请从上方选择一个任务和一个 Agent 进行手动分配
        </p>
      </div>
    );
  }

  const taskAgent = useSchedulerStore.getState().agents.find(
    a => a.agentId === selectedTask.assignedAgent
  );

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900/30 rounded-lg space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
        确认手动分配
      </h3>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            任务
          </p>
          <p className="font-semibold text-gray-900 dark:text-white text-sm">
            {selectedTask.title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ID: {selectedTask.id}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            分配给
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {AGENT_EMOJIS[selectedAgent.agentId] || '🤖'}
            </span>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              {selectedAgent.name}
            </p>
          </div>
        </div>
      </div>

      {/* Change indicator */}
      {selectedTask.assignedAgent && taskAgent && (
        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <p className="text-sm text-orange-700 dark:text-orange-400">
            <span className="font-semibold">注意:</span> 此操作将覆盖系统当前的分配决策
            (
            {AGENT_EMOJIS[taskAgent.agentId] || '🤖'} {taskAgent.name}
            )
          </p>
        </div>
      )}

      {/* Reason input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          手动干预原因 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={overrideReason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="请输入手动干预的原因，以便审计追踪..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          原因将记录在调度历史中供审计使用
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          取消
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting || !overrideReason.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              提交中...
            </>
          ) : (
            '确认手动分配'
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * ManualOverride main component
 */
export function ManualOverride() {
  const {
    pendingTasks,
    agents,
    manualAssign,
    isLoading,
    error,
    refresh,
  } = useSchedulerStore();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Get selected task and agent
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return pendingTasks.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, pendingTasks]);

  const selectedAgent = useMemo(() => {
    if (!selectedAgentId) return null;
    return agents.find(a => a.agentId === selectedAgentId) || null;
  }, [selectedAgentId, agents]);

  // Filter agents by task type
  const compatibleAgents = useMemo(() => {
    if (!selectedTask) return agents;
    return agents.filter(
      agent =>
        agent.availability &&
        agent.capabilities.taskTypes.includes(selectedTask.type)
    );
  }, [selectedTask, agents]);

  // Refresh on mount
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!selectedTask || !selectedAgent || !overrideReason.trim()) {
      return;
    }
    setShowConfirmDialog(true);
  }, [selectedTask, selectedAgent, overrideReason]);

  // Confirm and execute override
  const handleConfirmOverride = useCallback(async () => {
    if (!selectedTask || !selectedAgent) return;

    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      manualAssign(selectedTask.id, selectedAgent.agentId, 'human-operator');
      setSubmitResult({
        success: true,
        message: `成功将任务 "${selectedTask.title}" 分配给 ${selectedAgent.name}`,
      });

      // Reset form
      setSelectedTaskId(null);
      setSelectedAgentId(null);
      setOverrideReason('');

      // Refresh data
      refresh();
    } catch (err: any) {
      setSubmitResult({
        success: false,
        message: err.message || '手动分配失败',
      });
    } finally {
      setIsSubmitting(false);

      // Clear result after 5 seconds
      setTimeout(() => {
        setSubmitResult(null);
      }, 5000);
    }
  }, [selectedTask, selectedAgent, manualAssign, refresh]);

  // Cancel override
  const handleCancel = useCallback(() => {
    setSelectedTaskId(null);
    setSelectedAgentId(null);
    setOverrideReason('');
    setShowConfirmDialog(false);
  }, []);

  // Statistics
  const stats = useMemo(() => {
    const availableAgents = agents.filter(a => a.availability).length;
    const pendingTaskCount = pendingTasks.length;
    const avgLoad =
      agents.length > 0
        ? agents.reduce((sum, a) => sum + a.currentLoad, 0) / agents.length
        : 0;

    return {
      totalAgents: agents.length,
      availableAgents,
      pendingTasks: pendingTaskCount,
      avgLoad: avgLoad.toFixed(1),
    };
  }, [agents, pendingTasks]);

  if (isLoading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          手动干预
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          主人可在此覆盖系统调度决策，手动分配任务给指定的 Agent
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Submit Result */}
      {submitResult && (
        <div
          className={`p-4 rounded-lg ${
            submitResult.success
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}
        >
          {submitResult.message}
        </div>
      )}

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalAgents}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            总 Agent 数
          </div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
            {stats.availableAgents}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            可用 Agent
          </div>
        </div>
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
            {stats.pendingTasks}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            待分配任务
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {stats.avgLoad}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            平均负载
          </div>
        </div>
      </div>

      {/* Selection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-xl">📋</span>
            选择任务
          </h3>
          <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
            {pendingTasks.length === 0 ? (
              <div className="p-6 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  暂无待分配的任务
                </p>
              </div>
            ) : (
              pendingTasks.map(task => (
                <TaskSelectItem
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskId === task.id}
                  onSelect={() => {
                    setSelectedTaskId(
                      task.id === selectedTaskId ? null : task.id
                    );
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Agent Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-xl">🤖</span>
            选择 Agent
            {selectedTask && (
              <span className="text-sm font-normal text-blue-600 dark:text-blue-400">
                (推荐: 支持 {selectedTask.type} 类型的 Agent)
              </span>
            )}
          </h3>
          <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
            {agents.length === 0 ? (
              <div className="p-6 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-gray-500 dark:text-gray-400">暂无 Agent</p>
              </div>
            ) : (
              agents.map(agent => (
                <AgentSelectItem
                  key={agent.agentId}
                  agent={agent}
                  isSelected={selectedAgentId === agent.agentId}
                  onSelect={() => {
                    setSelectedAgentId(
                      agent.agentId === selectedAgentId ? null : agent.agentId
                    );
                  }}
                  reason={
                    selectedTask &&
                    agent.capabilities.taskTypes.includes(selectedTask.type)
                      ? `支持 ${selectedTask.type} 类型任务`
                      : undefined
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Override Form */}
      <OverrideForm
        selectedTask={selectedTask}
        selectedAgent={selectedAgent}
        overrideReason={overrideReason}
        onReasonChange={setOverrideReason}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="确认手动分配"
        message={`您确定要将任务 "${selectedTask?.title}" 手动分配给 ${
          selectedAgent?.name || 'Unknown'
        } 吗？此操作将覆盖系统的自动调度决策。`}
        confirmLabel="确认分配"
        cancelLabel="取消"
        variant="warning"
        onConfirm={handleConfirmOverride}
        onCancel={() => setShowConfirmDialog(false)}
      />

      {/* Footer note */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold">💡 提示:</span> 手动干预的决策将被记录在调度历史中，
          包含操作者信息和干预原因，以便后续审计和分析。
        </p>
      </div>
    </div>
  );
}

export default ManualOverride;
