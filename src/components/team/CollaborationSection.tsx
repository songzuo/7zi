'use client';

import React from 'react';

interface CollaborationItem {
  title: string;
  description: string;
}

interface CollaborationSectionProps {
  title: string;
  description: string;
  items: {
    strategy: CollaborationItem;
    design: CollaborationItem;
    testing: CollaborationItem;
    promotion: CollaborationItem;
  };
}

const colors = {
  strategy: 'from-cyan-500 to-blue-600',
  design: 'from-purple-500 to-pink-600',
  testing: 'from-green-500 to-emerald-600',
  promotion: 'from-amber-500 to-orange-600',
};

const emojis = { strategy: '🎯', design: '🎨', testing: '🧪', promotion: '📈' };

export function CollaborationSection({ title, description, items }: CollaborationSectionProps) {
  return (
    <section className="py-20 px-6 bg-white dark:bg-zinc-900">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {title}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {description}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(Object.keys(items) as Array<keyof typeof items>).map((key) => (
            <div
              key={key}
              className="group bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[key]} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`} aria-hidden="true">
                {emojis[key]}
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">
                {items[key].title}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {items[key].description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
