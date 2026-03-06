/**
 * @fileoverview 聊天逻辑 Hook
 * @description 封装聊天状态和业务逻辑
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, TeamMember } from './types';
import { initialMessage } from './data';

/**
 * 生成 AI 回复内容
 * @param userMessage - 用户消息
 * @param selectedMemberId - 选中的成员ID
 * @param teamMembers - 团队成员列表
 */
function generateResponse(
  userMessage: string,
  selectedMemberId: string,
  teamMembers: TeamMember[]
): string {
  const lowerMessage = userMessage.toLowerCase();
  const member = selectedMemberId
    ? teamMembers.find(m => m.id === selectedMemberId)
    : null;
  const prefix = member ? `**${member.emoji} ${member.name}**: ` : '';

  if (lowerMessage.includes('团队') || lowerMessage.includes('成员')) {
    return prefix + `我们 7zi Studio 由 11 位专业 AI 代理组成：

🌟 **智能体专家** - 负责战略规划和未来布局
📚 **咨询师** - 进行研究分析和市场调研
🏗️ **架构师** - 设计系统架构和技术方案
⚡ **Executor** - 快速执行和实现功能
🛡️ **系统管理员** - 负责运维部署和安全
🧪 **测试员** - 保证质量和测试调试
🎨 **设计师** - 负责 UI/UX 设计
📣 **推广专员** - 进行 SEO 和品牌推广
💼 **销售客服** - 处理客户关系
💰 **财务** - 管理会计和审计
📺 **媒体** - 负责内容创作和宣传

点击"团队状态"按钮可以查看实时在线情况！`;
  }

  if (lowerMessage.includes('进度') || lowerMessage.includes('状态')) {
    return prefix + `📊 **当前项目进度**

✅ 主页已完成
✅ 团队页面已上线
✅ AI 聊天组件已集成
🔄 博客系统开发中
⏳ 联系表单优化中

今天完成了 3 个功能模块，代码提交 15 次，团队效率优秀！`;
  }

  if (lowerMessage.includes('联系') || lowerMessage.includes('方式')) {
    return prefix + `📬 **联系方式**

📧 Email: business@7zi.studio
💬 Telegram: @7zistudio
🐦 Twitter: @7zistudio
🔗 GitHub: github.com/7zi-studio

我们 24/7 在线，随时为您服务！`;
  }

  if (lowerMessage.includes('服务') || lowerMessage.includes('能做什么')) {
    return prefix + `💼 **我们的服务**

💻 **网站开发** - 高性能现代网站和 Web 应用
🎨 **品牌设计** - 专业 UI/UX 设计
📈 **营销推广** - SEO 优化、内容营销
🤖 **AI 集成** - 智能代理系统开发
📱 **移动应用** - 跨平台移动解决方案

每个项目都有专业的 AI 团队负责！`;
  }

  if (lowerMessage.includes('介绍') || lowerMessage.includes('你好') || lowerMessage.includes('您好')) {
    return prefix + `您好！我是 7zi Studio 的 AI 助手。我们的团队由 11 位专业 AI 代理组成，随时为您服务！

您可以问我关于：
• 团队介绍
• 项目进度
• 服务内容
• 联系方式

或者直接点击下方的快捷按钮！`;
  }

  return prefix + `感谢您的消息！"${userMessage}"

我是 7zi Studio 的 AI 助手。您可以问我关于：
• 团队介绍
• 项目进度
• 服务内容
• 联系方式

或者直接点击下方的快捷按钮！`;
}

/**
 * 聊天 Hook
 * @description 管理聊天状态和消息处理逻辑
 */
export function useChat(teamMembers: TeamMember[]) {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 消息更新时滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 发送消息
  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // 模拟 AI 回复延迟
    setTimeout(() => {
      const response: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: generateResponse(userMessage.content, selectedMemberId, teamMembers),
        timestamp: new Date(),
        memberId: selectedMemberId || undefined,
      };
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 750);
  }, [inputValue, selectedMemberId, teamMembers]);

  // 快捷操作
  const handleQuickAction = useCallback((action: string) => {
    setInputValue(action);
    setTimeout(() => {
      handleSend();
    }, 100);
  }, [handleSend]);

  return {
    // 状态
    messages,
    inputValue,
    isTyping,
    selectedMemberId,
    messagesEndRef,
    inputRef,
    
    // 操作
    setInputValue,
    handleSend,
    handleQuickAction,
    setSelectedMemberId,
  };
}