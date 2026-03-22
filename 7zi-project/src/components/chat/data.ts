/**
 * @fileoverview 聊天组件静态数据
 * @description 团队成员列表和快捷操作配置
 */

import { TeamMember } from './types';

/**
 * 团队成员列表
 * @description 7zi Studio 的 11 位专业 AI 代理
 */
export const teamMembers: TeamMember[] = [
  { id: '1', name: '智能体专家', role: '战略顾问', emoji: '🌟', status: 'online', specialty: 'AI 架构与未来布局' },
  { id: '2', name: '咨询师', role: '研究分析', emoji: '📚', status: 'online', specialty: '市场调研与数据分析' },
  { id: '3', name: '架构师', role: '系统设计', emoji: '🏗️', status: 'busy', specialty: '技术架构与规划' },
  { id: '4', name: 'Executor', role: '执行专家', emoji: '⚡', status: 'online', specialty: '快速实现与交付' },
  { id: '5', name: '系统管理员', role: '运维部署', emoji: '🛡️', status: 'online', specialty: '服务器与安全' },
  { id: '6', name: '测试员', role: '质量保证', emoji: '🧪', status: 'offline', specialty: '测试与调试' },
  { id: '7', name: '设计师', role: 'UI/UX', emoji: '🎨', status: 'online', specialty: '视觉设计与体验' },
  { id: '8', name: '推广专员', role: '市场营销', emoji: '📣', status: 'busy', specialty: 'SEO 与品牌推广' },
  { id: '9', name: '销售客服', role: '客户关系', emoji: '💼', status: 'online', specialty: '销售与客户服务' },
  { id: '10', name: '财务', role: '财务管理', emoji: '💰', status: 'offline', specialty: '会计与审计' },
  { id: '11', name: '媒体', role: '内容创作', emoji: '📺', status: 'online', specialty: '媒体与宣传' },
];

/**
 * 快捷操作列表
 * @description 用户可快速点击的常用问题
 */
export const quickActions: string[] = [
  '介绍一下团队',
  '今天的工作进度',
  '项目状态如何',
  '联系方式',
];

/**
 * 初始欢迎消息
 */
export const initialMessage = {
  id: '1',
  role: 'assistant' as const,
  content: '您好！我是 7zi Studio 的 AI 助手。我们的团队由 11 位专业 AI 代理组成，随时为您服务！有什么可以帮助您的吗？',
  timestamp: new Date(),
};