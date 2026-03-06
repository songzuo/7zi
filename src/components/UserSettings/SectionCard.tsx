'use client';

import { memo, ReactNode } from 'react';

export interface SectionCardProps {
  title: string;
  icon: string;
  children: ReactNode;
  className?: string;
}

/**
 * 分区卡片容器组件
 */
const SectionCard = memo(function SectionCard({
  title,
  icon,
  children,
  className = '',
}: SectionCardProps) {
  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </h2>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
});

export default SectionCard;
