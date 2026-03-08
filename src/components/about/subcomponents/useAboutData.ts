'use client';

import { useMemo } from 'react';

export interface TeamMember {
  id: number;
  emoji: string;
  color: string;
  key: string;
}

export interface TimelineItem {
  year: string;
  emoji: string;
  color: string;
  key: string;
}

export interface ValueItem {
  key: string;
  color: string;
  emoji: string;
}

const teamMembersData: TeamMember[] = [
  { id: 1, emoji: '🌟', color: 'from-yellow-400 to-orange-500', key: 'expert' },
  { id: 2, emoji: '📚', color: 'from-blue-400 to-indigo-600', key: 'consultant' },
  { id: 3, emoji: '🏗️', color: 'from-purple-400 to-pink-600', key: 'architect' },
  { id: 4, emoji: '⚡', color: 'from-green-400 to-emerald-600', key: 'executor' },
  { id: 5, emoji: '🛡️', color: 'from-red-400 to-rose-600', key: 'admin' },
  { id: 6, emoji: '🧪', color: 'from-cyan-400 to-teal-600', key: 'tester' },
  { id: 7, emoji: '🎨', color: 'from-pink-400 to-rose-500', key: 'designer' },
  { id: 8, emoji: '📣', color: 'from-amber-400 to-yellow-600', key: 'promoter' },
  { id: 9, emoji: '💼', color: 'from-violet-400 to-purple-600', key: 'sales' },
  { id: 10, emoji: '💰', color: 'from-emerald-400 to-green-600', key: 'finance' },
  { id: 11, emoji: '📺', color: 'from-sky-400 to-blue-600', key: 'media' },
];

const timelineData: TimelineItem[] = [
  { year: '2024', emoji: '🚀', color: 'from-cyan-500 to-blue-600', key: '0' },
  { year: '2024', emoji: '👥', color: 'from-purple-500 to-pink-600', key: '1' },
  { year: '2025', emoji: '📈', color: 'from-green-500 to-emerald-600', key: '2' },
  { year: '2025', emoji: '⚡', color: 'from-amber-500 to-orange-600', key: '3' },
];

const valueKeys: readonly ('collaboration' | 'innovation' | 'quality' | 'customer')[] = ['collaboration', 'innovation', 'quality', 'customer'] as const;

const valueColors = [
  'from-cyan-500 to-blue-600',
  'from-purple-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-green-500 to-emerald-600',
];

const valueEmojis = ['🚀', '💡', '🎯', '🤝'];

export function useAboutData() {
  const teamMembers = useMemo(() => teamMembersData, []);
  
  const timeline = useMemo(() => timelineData, []);
  
  const values = useMemo<ValueItem[]>(() => {
    return valueKeys.map((key, index) => ({
      key,
      color: valueColors[index],
      emoji: valueEmojis[index],
    }));
  }, []);

  return {
    teamMembers,
    timeline,
    values,
  };
}