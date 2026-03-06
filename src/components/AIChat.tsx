'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  memberId?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  emoji: string;
  status: 'online' | 'busy' | 'offline';
  specialty: string;
}

const teamMembers: TeamMember[] = [
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

const quickActions = [
  '介绍一下团队',
  '今天的工作进度',
  '项目状态如何',
  '联系方式',
];

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '您好！我是 7zi Studio 的 AI 助手。我们的团队由 11 位专业 AI 代理组成，随时为您服务！有什么可以帮助您的吗？',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTeamStatus, setShowTeamStatus] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    const member = selectedMemberId ? teamMembers.find(m => m.id === selectedMemberId) : null;
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
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateResponse(userMessage.content),
        timestamp: new Date(),
        memberId: selectedMemberId || undefined,
      };
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 500 + Math.random() * 500);
  };

  const handleQuickAction = (action: string) => {
    setInputValue(action);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  const onlineCount = teamMembers.filter((m) => m.status === 'online').length;
  const busyCount = teamMembers.filter((m) => m.status === 'busy').length;

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center ${
          isOpen ? 'rotate-90' : ''
        }`}
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <span className="text-2xl">×</span>
        ) : (
          <span className="text-2xl">💬</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 md:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500 to-purple-600 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                  🤖
                </div>
                <div>
                  <h3 className="font-bold text-white">7zi AI 助手</h3>
                  <div className="flex items-center gap-2 text-xs text-white/80">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    {onlineCount} 位成员在线
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowTeamStatus(!showTeamStatus)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs text-white transition-colors"
              >
                {showTeamStatus ? '隐藏状态' : '团队状态'}
              </button>
            </div>
            
            {/* Member Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/80">选择 AI 成员:</span>
              <button
                onClick={() => setShowMemberSelector(!showMemberSelector)}
                className="flex-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs text-white transition-colors flex items-center justify-between"
              >
                {selectedMemberId ? (
                  <span>
                    {teamMembers.find(m => m.id === selectedMemberId)?.emoji}{' '}
                    {teamMembers.find(m => m.id === selectedMemberId)?.name}
                  </span>
                ) : (
                  <span>全部成员</span>
                )}
                <span>{showMemberSelector ? '↑' : '↓'}</span>
              </button>
            </div>
            
            {/* Member Selector Dropdown */}
            {showMemberSelector && (
              <div className="mt-2 max-h-48 overflow-y-auto bg-white/10 rounded-lg p-2">
                <button
                  onClick={() => {
                    setSelectedMemberId('');
                    setShowMemberSelector(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    !selectedMemberId ? 'bg-white/30 text-white' : 'text-white/80 hover:bg-white/20'
                  }`}
                >
                  🤖 全部成员
                </button>
                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setSelectedMemberId(member.id);
                      setShowMemberSelector(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                      selectedMemberId === member.id ? 'bg-white/30 text-white' : 'text-white/80 hover:bg-white/20'
                    }`}
                  >
                    <span>{member.emoji}</span>
                    <span className="flex-1">{member.name}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        member.status === 'online'
                          ? 'bg-green-400'
                          : member.status === 'busy'
                          ? 'bg-yellow-400'
                          : 'bg-zinc-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Team Status Panel */}
          {showTeamStatus && (
            <div className="max-h-40 overflow-y-auto bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 p-3">
              <div className="grid grid-cols-3 gap-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col items-center p-2 rounded-lg bg-white dark:bg-zinc-800 hover:shadow-md transition-shadow"
                    title={member.specialty}
                  >
                    <span className="text-lg">{member.emoji}</span>
                    <span className="text-[10px] text-zinc-600 dark:text-zinc-400 truncate w-full text-center">
                      {member.name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full mt-1 ${
                        member.status === 'online'
                          ? 'bg-green-500'
                          : member.status === 'busy'
                          ? 'bg-yellow-500'
                          : 'bg-zinc-400'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-900">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                      : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-md'
                  }`}
                >
                  {message.role === 'assistant' && message.memberId && (
                    <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1">
                      {teamMembers.find(m => m.id === message.memberId)?.emoji}{' '}
                      {teamMembers.find(m => m.id === message.memberId)?.name}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span
                    className={`text-[10px] mt-1 block ${
                      message.role === 'user' ? 'text-white/70' : 'text-zinc-400'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-zinc-800 p-3 rounded-2xl shadow-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
                    <span
                      className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <span
                      className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => handleQuickAction(action)}
                  className="flex-shrink-0 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-zinc-700 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-full text-xs transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="输入消息..."
                className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white flex items-center justify-center hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span>➤</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
