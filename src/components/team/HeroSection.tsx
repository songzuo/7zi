'use client';

import React from 'react';

interface HeroSectionProps {
  badge: string;
  title: string;
  description: string;
  stats: {
    members: { value: string; label: string };
    coverage: { value: string; label: string };
    support: { value: string; label: string };
  };
}

export function HeroSection({ badge, title, description, stats }: HeroSectionProps) {
  return (
    <section className="pt-32 pb-16 px-6 bg-gradient-to-br from-cyan-900 via-purple-900 to-zinc-900">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-cyan-400 text-sm font-medium mb-6 border border-white/20">
          <span className="animate-pulse">✨</span>{badge}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">{title}</h1>
        <p className="text-xl text-zinc-300 max-w-2xl mx-auto mb-12">{description}</p>
        <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto">
          {['members', 'coverage', 'support'].map((stat) => (
            <div key={stat} className="text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                {stats[stat as keyof typeof stats].value}
              </div>
              <div className="text-sm text-zinc-300 mt-1">{stats[stat as keyof typeof stats].label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}