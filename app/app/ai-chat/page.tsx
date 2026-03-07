/**
 * AI 聊天页面
 */

import AIChat from '@/components/ai-chat/AIChat';

export const metadata = {
  title: 'AI 助手 - AI Team Dashboard',
  description: '与 AI 助手进行智能对话',
};

export default function AIChatPage() {
  return (
    <div className="h-[calc(100vh-120px)] p-4">
      <AIChat />
    </div>
  );
}
