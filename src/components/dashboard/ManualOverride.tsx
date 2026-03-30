'use client';

/**
 * ManualOverride - 手动覆盖/干预 Agent 调度组件
 *
 * 允许管理员手动触发特定 Agent 执行任务
 * 支持设置任务优先级、执行时间、取消任务
 * 使用 Zustand store 管理状态
 * 包含表单验证、错误处理和确认对话框
 */

import { FC, useState, useEffect, useCallback } from 'react';
import { 
  Clock,
  AlertTriangle,
  Trash2,
  Settings,
  Zap,
  Info,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Send,
  RefreshCw
} from 'lucide-react';
import { 
  useSchedulerStore, 
  selectAgents, 
  selectPendingTasks,
  selectStats 
} from '@/lib/agents/scheduler/stores/scheduler-store';
import type { Task, TaskPriority } from '@/lib/agents/scheduler/models/task-model';
import type { AgentCapability } from '@/lib/agents/scheduler/models/agent-capability';
import type { TaskType } from '@/lib/agents/scheduler/models/agent-capability';

// ============================================================================
// 类型定义
// ============================================================================

export interface ManualOverrideProps {
  /** 自定义类名 */
  className?: string;
  /** 任务创建成功回调 */
  onTaskCreated?: (task: Task) => void;
  /** 任务取消回调 */
  onTaskCancelled?: (taskId: string) => void;
  /** 最大显示待处理任务数量 */
  maxPendingDisplay?: number;
}

export interface TaskFormData {
  /** 任务标题 */
  title: string;
  /** 任务描述 */
  description: string;
  /** 任务类型 */
  type: TaskType;
  /** 目标 Agent */
  agentId: string;
  /** 优先级 */
  priority: TaskPriority;
  /** 执行方式 */
  executionMode: 'immediate' | 'scheduled';
  /** 定时执行时间（Unix timestamp） */
  scheduledTime?: number;
  /** 估计时长（分钟） */
  estimatedDuration: number;
  /** 技术要求 */
  requiredCapabilities: string[];
  /** 截止时间（可选，Unix timestamp） */
  deadline?: number;
}

interface FormError {
  field: string;
  message: string;
}

interface SchedulePreview {
  estimatedStartTime: string;
  estimatedAgentLoad: number;
  queuePosition: number;
}

// ============================================================================
// 常量定义
// ============================================================================

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string; color: string }> = [
  { value: 'urgent', label: '紧急', color: 'red' },
  { value: 'high', label: '高', color: 'orange' },
  { value: 'medium', label: '中', color: 'yellow' },
  { value: 'low', label: '低', color: 'blue' }
];

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  architecture: '架构设计',
  research: '研究分析',
  implementation: '实现开发',
  testing: '测试调试',
  devops: '运维部署',
  design: 'UI设计',
  marketing: '营销推广',
  sales: '销售客服',
  finance: '财务管理',
  media: '媒体宣传',
  general: '通用任务'
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 格式化时间戳为可读时间
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = timestamp - now.getTime();
  
  // 如果在未来 24 小时内，显示相对时间
  if (diffMs > 0 && diffMs < 86400000) {
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟后`;
    } else {
      return `${minutes}分钟后`;
    }
  }
  
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 验证表单数据
 */
function validateFormData(data: Partial<TaskFormData>): FormError[] {
  const errors: FormError[] = [];
  
  if (!data.title || data.title.trim().length === 0) {
    errors.push({ field: 'title', message: '任务标题不能为空' });
  } else if (data.title.trim().length > 200) {
    errors.push({ field: 'title', message: '任务标题不能超过 200 字符' });
  }
  
  if (!data.agentId) {
    errors.push({ field: 'agentId', message: '请选择要执行的 Agent' });
  }
  
  if (!data.type) {
    errors.push({ field: 'type', message: '请选择任务类型' });
  }
  
  if (data.executionMode === 'scheduled' && !data.scheduledTime) {
    errors.push({ field: 'scheduledTime', message: '请选择执行时间' });
  }
  
  if (data.scheduledTime && data.scheduledTime <= Date.now()) {
    errors.push({ field: 'scheduledTime', message: '执行时间必须是未来时间' });
  }
  
  if (data.deadline && data.deadline <= Date.now()) {
    errors.push({ field: 'deadline', message: '截止时间必须是未来时间' });
  }
  
  if (data.estimatedDuration && data.estimatedDuration <= 0) {
    errors.push({ field: 'estimatedDuration', message: '估计时长必须大于 0' });
  }
  
  return errors;
}

/**
 * 生成唯一任务 ID
 */
function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// 子组件：表单字段
// ============================================================================

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  helpText?: string;
}

const FormField: FC<FormFieldProps> = ({ label, required, error, children, helpText }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        {error}
      </p>
    )}
    {helpText && !error && (
      <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
        <Info className="w-3 h-3" />
        {helpText}
      </p>
    )}
  </div>
);

// ============================================================================
// 子组件：确认对话框
// ============================================================================

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'warning',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;
  
  const variantStyles = {
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800/30',
      confirmBtn: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
      icon: 'text-red-600 dark:text-red-400'
    },
    warning: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800/30',
      confirmBtn: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600',
      icon: 'text-orange-600 dark:text-orange-400'
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800/30',
      confirmBtn: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
      icon: 'text-blue-600 dark:text-blue-400'
    }
  };
  
  const styles = variantStyles[variant];
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`
        w-full max-w-md bg-white dark:bg-zinc-800 
        rounded-xl border-2 ${styles.border}
        shadow-2xl
      `}>
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className={`w-5 h-5 mt-0.5 ${styles.icon}`} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                {title}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {message}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium
                bg-zinc-100 dark:bg-zinc-700/50
                text-zinc-700 dark:text-zinc-300
                hover:bg-zinc-200 dark:hover:bg-zinc-600/50
                transition-colors duration-200
              "
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium text-white
                ${styles.confirmBtn}
                transition-colors duration-200
              `}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 子组件：待处理任务列表
// ============================================================================

interface PendingTasksListProps {
  tasks: Task[];
  agents: AgentCapability[];
  onCancelTask: (taskId: string) => void;
  isLoading?: boolean;
}

const PendingTasksList: FC<PendingTasksListProps> = ({ 
  tasks, 
  agents, 
  onCancelTask,
  isLoading = false 
}) => {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mb-2" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          暂无待处理任务
        </p>
      </div>
    );
  }
  
  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.agentId === agentId);
    return agent?.name || agentId;
  };
  
  const getPriorityColor = (priority: TaskPriority) => {
    const colors = {
      urgent: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500'
    };
    return colors[priority];
  };
  
  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <div
          key={task.id}
          className={`
            p-3 bg-zinc-50 dark:bg-zinc-800/30
            border border-zinc-200 dark:border-zinc-700/50
            rounded-lg
            transition-all duration-200
            hover:bg-zinc-100 dark:hover:bg-zinc-800/50
          `}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {task.title}
                </h4>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {getAgentName(task.assignedAgent || task.type)}
                </span>
                {task.estimatedDuration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.estimatedDuration}分钟
                  </span>
                )}
              </div>
            </div>
            
            <button
              onClick={() => onCancelTask(task.id)}
              disabled={isLoading}
              className={`
                p-1.5 rounded-lg
                bg-red-50 dark:bg-red-900/20
                text-red-600 dark:text-red-400
                hover:bg-red-100 dark:hover:bg-red-900/30
                transition-colors duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              title="取消任务"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// 子组件：调度预览卡片
// ============================================================================

interface SchedulePreviewCardProps {
  preview: SchedulePreview;
  priority: TaskPriority;
}

const SchedulePreviewCard: FC<SchedulePreviewCardProps> = ({ preview, priority }) => {
  const priorityColors = {
    urgent: 'text-red-600 dark:text-red-400',
    high: 'text-orange-600 dark:text-orange-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    low: 'text-blue-600 dark:text-blue-400'
  };
  
  const priorityLabels = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低'
  };
  
  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/50 rounded-lg space-y-3">
      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        <Zap className="w-4 h-4" />
        调度预览
      </h4>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-600 dark:text-zinc-400">优先级</span>
          <span className={`font-medium ${priorityColors[priority]}`}>
            {priorityLabels[priority]}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-600 dark:text-zinc-400">预计开始时间</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {preview.estimatedStartTime}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-600 dark:text-zinc-400">Agent 负载</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {preview.estimatedAgentLoad}%
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-600 dark:text-zinc-400">队列位置</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            #{preview.queuePosition}
          </span>
        </div>
      </div>
      
      {preview.estimatedAgentLoad > 80 && (
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/50">
          <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Agent 当前负载较高
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 主组件：ManualOverride
// ============================================================================

export const ManualOverride: FC<ManualOverrideProps> = ({
  className = '',
  onTaskCreated,
  onTaskCancelled,
  maxPendingDisplay = 5
}) => {
  // Store data
  const agents = useSchedulerStore(selectAgents);
  const pendingTasks = useSchedulerStore(selectPendingTasks);
  const stats = useSchedulerStore(selectStats);
  const addTask = useSchedulerStore(state => state.addTask);
  const manualAssign = useSchedulerStore(state => state.manualAssign);
  const scheduleTask = useSchedulerStore(state => state.scheduleTask);
  const completeTask = useSchedulerStore(state => state.completeTask);
  const isLoading = useSchedulerStore(state => state.isLoading);
  
  // Local state
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    type: 'general',
    agentId: '',
    priority: 'medium',
    executionMode: 'immediate',
    estimatedDuration: 30,
    requiredCapabilities: [],
    deadline: undefined
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);
  const [cancelTaskId, setCancelTaskId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // 计算调度预览
  const schedulePreview = useCallback((): SchedulePreview => {
    const now = Date.now();
    const estimatedStartTime = formData.executionMode === 'immediate' 
      ? now 
      : (formData.scheduledTime || now);
    
    // 查找选中的 Agent
    const selectedAgent = agents.find(a => a.agentId === formData.agentId);
    const agentLoad = selectedAgent?.currentLoad || 0;
    
    // 计算队列位置（基于优先级和 Agent 负载）
    const higherPriorityTasks = pendingTasks.filter(t => {
      const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityWeight[t.priority] > priorityWeight[formData.priority];
    });
    
    const queuePosition = higherPriorityTasks.length + 1;
    
    return {
      estimatedStartTime: formatTimestamp(estimatedStartTime),
      estimatedAgentLoad: agentLoad,
      queuePosition
    };
  }, [formData, agents, pendingTasks]);
  
  // 清除成功消息
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  // 处理表单输入
  const handleInputChange = (
    field: keyof TaskFormData,
    value: string | number | TaskType | TaskPriority
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  // 处理提交
  const handleSubmit = async () => {
    // 验证表单
    const validationErrors = validateFormData(formData);
    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return;
    }
    
    // 高优先级任务需要确认
    if (formData.priority === 'urgent' || formData.priority === 'high') {
      const task = createTaskFromFormData();
      setConfirmTask(task);
      setShowConfirmDialog(true);
      return;
    }
    
    await createTask();
  };
  
  // 创建任务
  const createTask = async () => {
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const task = createTaskFromFormData();
      
      // 添加任务到 store
      addTask(task);
      
      // 如果指定了 Agent，进行手动分配
      if (formData.agentId) {
        manualAssign(task.id, formData.agentId, 'admin');
        
        // 如果是立即执行，尝试调度
        if (formData.executionMode === 'immediate') {
          await scheduleTask(task.id);
        }
      }
      
      // 显示成功消息
      setSuccessMessage('任务创建成功');
      
      // 回调
      if (onTaskCreated) {
        onTaskCreated(task);
      }
      
      // 重置表单
      setFormData({
        title: '',
        description: '',
        type: 'general',
        agentId: '',
        priority: 'medium',
        executionMode: 'immediate',
        estimatedDuration: 30,
        requiredCapabilities: [],
        deadline: undefined
      });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : '任务创建失败';
      setErrors({ _form: message });
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
      setConfirmTask(null);
    }
  };
  
  // 从表单数据创建任务对象
  const createTaskFromFormData = (): Task => {
    const now = Date.now();
    
    return {
      id: generateTaskId(),
      type: formData.type,
      title: formData.title.trim(),
      description: formData.description?.trim(),
      priority: formData.priority,
      requiredCapabilities: formData.requiredCapabilities,
      estimatedDuration: formData.estimatedDuration,
      dependencies: [],
      status: formData.executionMode === 'immediate' ? 'pending' : 'pending',
      assignedAgent: formData.agentId || undefined,
      createdAt: now,
      deadline: formData.deadline,
      createdBy: 'admin',
      metadata: {
        executionMode: formData.executionMode,
        scheduledTime: formData.scheduledTime
      }
    };
  };
  
  // 取消任务
  const handleCancelTask = (taskId: string) => {
    setCancelTaskId(taskId);
    setShowCancelConfirm(true);
  };
  
  const confirmCancelTask = () => {
    if (cancelTaskId) {
      completeTask(cancelTaskId);
      setSuccessMessage('任务已取消');
      
      if (onTaskCancelled) {
        onTaskCancelled(cancelTaskId);
      }
    }
    setShowCancelConfirm(false);
    setCancelTaskId(null);
  };
  
  // 根据任务类型过滤合适的 Agent
  const getSuitableAgents = () => {
    return agents.filter(agent => 
      agent.capabilities.taskTypes.includes(formData.type)
    );
  };
  
  const suitableAgents = getSuitableAgents();
  const preview = schedulePreview();
  
  return (
    <div className={className}>
      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="确认创建高优先级任务"
        message={`您正在创建一个 ${confirmTask?.priority === 'urgent' ? '紧急' : '高'} 优先级任务。这可能会影响现有任务的调度顺序。确认继续吗？`}
        variant="warning"
        confirmText="确认创建"
        cancelText="取消"
        onConfirm={createTask}
        onCancel={() => {
          setShowConfirmDialog(false);
          setConfirmTask(null);
        }}
      />
      
      {/* 取消任务确认对话框 */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="确认取消任务"
        message="您确定要取消这个任务吗？此操作不可撤销。"
        variant="danger"
        confirmText="确认取消"
        cancelText="返回"
        onConfirm={confirmCancelTask}
        onCancel={() => {
          setShowCancelConfirm(false);
          setCancelTaskId(null);
        }}
      />
      
      {/* 成功消息 */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300">
            {successMessage}
          </span>
        </div>
      )}
      
      {/* 错误消息 */}
      {errors._form && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">
            {errors._form}
          </span>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：表单 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              手动创建任务
            </h3>
          </div>
          
          {/* 任务标题 */}
          <FormField
            label="任务标题"
            required
            error={errors.title}
            helpText="简要描述任务内容"
          >
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="例如：优化首页加载性能"
              className={`
                w-full px-4 py-2.5 rounded-lg
                bg-white dark:bg-zinc-800
                border ${errors.title ? 'border-red-300 dark:border-red-700' : 'border-zinc-200 dark:border-zinc-700'}
                text-zinc-900 dark:text-zinc-100
                placeholder-zinc-400 dark:placeholder-zinc-500
                focus:outline-none focus:ring-2 focus:ring-blue-500/50
                transition-colors duration-200
              `}
            />
          </FormField>
          
          {/* 任务描述 */}
          <FormField
            label="任务描述"
            error={errors.description}
          >
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="详细描述任务要求..."
              rows={3}
              className={`
                w-full px-4 py-2.5 rounded-lg
                bg-white dark:bg-zinc-800
                border ${errors.description ? 'border-red-300 dark:border-red-700' : 'border-zinc-200 dark:border-zinc-700'}
                text-zinc-900 dark:text-zinc-100
                placeholder-zinc-400 dark:placeholder-zinc-500
                focus:outline-none focus:ring-2 focus:ring-blue-500/50
                transition-colors duration-200
                resize-none
              `}
            />
          </FormField>
          
          {/* 任务类型和 Agent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="任务类型"
              required
              error={errors.type}
            >
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value as TaskType)}
                className={`
                  w-full px-4 py-2.5 rounded-lg
                  bg-white dark:bg-zinc-800
                  border ${errors.type ? 'border-red-300 dark:border-red-700' : 'border-zinc-200 dark:border-zinc-700'}
                  text-zinc-900 dark:text-zinc-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50
                  transition-colors duration-200
                `}
              >
                {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </FormField>
            
            <FormField
              label="指定 Agent"
              required
              error={errors.agentId}
              helpText="将根据任务类型自动推荐"
            >
              <select
                value={formData.agentId}
                onChange={(e) => handleInputChange('agentId', e.target.value)}
                className={`
                  w-full px-4 py-2.5 rounded-lg
                  bg-white dark:bg-zinc-800
                  border ${errors.agentId ? 'border-red-300 dark:border-red-700' : 'border-zinc-200 dark:border-zinc-700'}
                  text-zinc-900 dark:text-zinc-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50
                  transition-colors duration-200
                `}
              >
                <option value="">自动选择</option>
                {suitableAgents.map(agent => (
                  <option key={agent.agentId} value={agent.agentId}>
                    {agent.name} ({agent.role})
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          
          {/* 优先级和执行时间 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="优先级"
              required
              helpText="高优先级任务会影响现有调度"
            >
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value as TaskPriority)}
                className={`
                  w-full px-4 py-2.5 rounded-lg
                  bg-white dark:bg-zinc-800
                  border border-zinc-200 dark:border-zinc-700
                  text-zinc-900 dark:text-zinc-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50
                  transition-colors duration-200
                `}
              >
                {PRIORITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}优先级
                  </option>
                ))}
              </select>
            </FormField>
            
            <FormField
              label="执行时间"
              error={errors.executionMode}
            >
              <select
                value={formData.executionMode}
                onChange={(e) => handleInputChange('executionMode', e.target.value as 'immediate' | 'scheduled')}
                className={`
                  w-full px-4 py-2.5 rounded-lg
                  bg-white dark:bg-zinc-800
                  border border-zinc-200 dark:border-zinc-700
                  text-zinc-900 dark:text-zinc-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50
                  transition-colors duration-200
                `}
              >
                <option value="immediate">立即执行</option>
                <option value="scheduled">定时执行</option>
              </select>
            </FormField>
          </div>
          
          {/* 定时执行时间 */}
          {formData.executionMode === 'scheduled' && (
            <FormField
              label="执行时间"
              required
              error={errors.scheduledTime}
              helpText="选择任务的执行时间"
            >
              <input
                type="datetime-local"
                value={formData.scheduledTime ? new Date(formData.scheduledTime).toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value).getTime() : undefined;
                  handleInputChange('scheduledTime', date || Date.now());
                }}
                min={new Date().toISOString().slice(0, 16)}
                className={`
                  w-full px-4 py-2.5 rounded-lg
                  bg-white dark:bg-zinc-800
                  border ${errors.scheduledTime ? 'border-red-300 dark:border-red-700' : 'border-zinc-200 dark:border-zinc-700'}
                  text-zinc-900 dark:text-zinc-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50
                  transition-colors duration-200
                `}
              />
            </FormField>
          )}
          
          {/* 估计时长 */}
          <FormField
            label="估计时长（分钟）"
            required
            error={errors.estimatedDuration}
          >
            <input
              type="number"
              value={formData.estimatedDuration}
              onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value) || 30)}
              min={1}
              max={480}
              className={`
                w-full px-4 py-2.5 rounded-lg
                bg-white dark:bg-zinc-800
                border ${errors.estimatedDuration ? 'border-red-300 dark:border-red-700' : 'border-zinc-200 dark:border-zinc-700'}
                text-zinc-900 dark:text-zinc-100
                focus:outline-none focus:ring-2 focus:ring-blue-500/50
                transition-colors duration-200
              `}
            />
          </FormField>
          
          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className={`
              w-full py-3 px-4 rounded-lg
              bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
              text-white font-medium
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2
            `}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                创建任务
              </>
            )}
          </button>
        </div>
        
        {/* 右侧：预览和待处理任务 */}
        <div className="space-y-6">
          {/* 调度预览 */}
          <div>
            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              调度预览
            </h4>
            <SchedulePreviewCard preview={preview} priority={formData.priority} />
          </div>
          
          {/* 待处理任务列表 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                待处理任务 ({pendingTasks.length})
              </h4>
              {pendingTasks.length > maxPendingDisplay && (
                <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  查看全部
                </button>
              )}
            </div>
            
            <PendingTasksList
              tasks={pendingTasks.slice(0, maxPendingDisplay)}
              agents={agents}
              onCancelTask={handleCancelTask}
              isLoading={isLoading}
            />
          </div>
          
          {/* 统计信息 */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              当前状态
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-white dark:bg-zinc-800/50 rounded-lg">
                <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats.totalTasks}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">总任务</div>
              </div>
              <div className="text-center p-2 bg-white dark:bg-zinc-800/50 rounded-lg">
                <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {stats.pendingTasks}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">待处理</div>
              </div>
              <div className="text-center p-2 bg-white dark:bg-zinc-800/50 rounded-lg">
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {stats.completedTasks}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">已完成</div>
              </div>
              <div className="text-center p-2 bg-white dark:bg-zinc-800/50 rounded-lg">
                <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {stats.failedTasks}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">失败</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 默认导出
// ============================================================================

export default ManualOverride;