/**
 * @fileoverview 聊天组件类型定义
 * @description 定义消息、团队成员等核心类型
 */

/**
 * 聊天消息类型
 */
export interface Message {
  /** 消息唯一标识 */
  id: string;
  /** 消息角色：用户或助手 */
  role: 'user' | 'assistant';
  /** 消息内容 */
  content: string;
  /** 消息时间戳 */
  timestamp: Date;
  /** 回复的团队成员ID（可选） */
  memberId?: string;
}

/**
 * 团队成员状态
 */
export type MemberStatus = 'online' | 'busy' | 'offline';

/**
 * 团队成员类型
 */
export interface TeamMember {
  /** 成员唯一标识 */
  id: string;
  /** 成员名称 */
  name: string;
  /** 成员角色 */
  role: string;
  /** 成员表情符号 */
  emoji: string;
  /** 在线状态 */
  status: MemberStatus;
  /** 专业领域 */
  specialty: string;
}

/**
 * 聊天组件 Props
 */
export interface ChatProps {
  /** 是否打开聊天窗口 */
  isOpen: boolean;
  /** 切换打开状态的回调 */
  onToggle: () => void;
}

/**
 * 消息组件 Props
 */
export interface ChatMessageProps {
  /** 消息数据 */
  message: Message;
  /** 团队成员列表（用于显示发送者） */
  teamMembers: TeamMember[];
}

/**
 * 输入组件 Props
 */
export interface ChatInputProps {
  /** 输入值 */
  value: string;
  /** 输入变化回调 */
  onChange: (value: string) => void;
  /** 发送消息回调 */
  onSend: () => void;
  /** 输入框引用 */
  inputRef: React.RefObject<HTMLInputElement | null>;
}

/**
 * 快捷操作组件 Props
 */
export interface QuickActionsProps {
  /** 快捷操作列表 */
  actions: string[];
  /** 点击快捷操作的回调 */
  onAction: (action: string) => void;
}

/**
 * 团队状态面板 Props
 */
export interface TeamStatusPanelProps {
  /** 团队成员列表 */
  teamMembers: TeamMember[];
}

/**
 * 成员选择器 Props
 */
export interface MemberSelectorProps {
  /** 团队成员列表 */
  teamMembers: TeamMember[];
  /** 当前选中的成员ID */
  selectedMemberId: string;
  /** 选择成员的回调 */
  onSelect: (memberId: string) => void;
  /** 是否显示选择器 */
  isOpen: boolean;
  /** 切换显示状态的回调 */
  onToggle: () => void;
}