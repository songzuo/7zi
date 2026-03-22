/**
 * Team Data Constants
 */

import type { TeamMember, CollaborationItem } from './types';

export const TEAM_MEMBERS: TeamMember[] = [
  { id: 1, name: 'Expert', role: 'Strategy', emoji: '🌟', color: 'from-yellow-400 to-orange-500', key: 'expert', category: 'strategy', status: 'online' },
  { id: 2, name: 'Consultant', role: 'Strategy', emoji: '📚', color: 'from-blue-400 to-indigo-600', key: 'consultant', category: 'strategy', status: 'online' },
  { id: 3, name: 'Architect', role: 'Technical', emoji: '🏗️', color: 'from-purple-400 to-pink-600', key: 'architect', category: 'tech', status: 'working' },
  { id: 4, name: 'Executor', role: 'Technical', emoji: '⚡', color: 'from-green-400 to-emerald-600', key: 'executor', category: 'tech', status: 'busy' },
  { id: 5, name: 'Admin', role: 'Technical', emoji: '🛡️', color: 'from-red-400 to-rose-600', key: 'admin', category: 'tech', status: 'online' },
  { id: 6, name: 'Tester', role: 'Technical', emoji: '🧪', color: 'from-cyan-400 to-teal-600', key: 'tester', category: 'tech', status: 'idle' },
  { id: 7, name: 'Designer', role: 'Creative', emoji: '🎨', color: 'from-pink-400 to-rose-500', key: 'designer', category: 'creative', status: 'working' },
  { id: 8, name: 'Promoter', role: 'Creative', emoji: '📣', color: 'from-amber-400 to-yellow-600', key: 'promoter', category: 'creative', status: 'online' },
  { id: 9, name: 'Sales', role: 'Business', emoji: '💼', color: 'from-violet-400 to-purple-600', key: 'sales', category: 'business', status: 'busy' },
  { id: 10, name: 'Finance', role: 'Business', emoji: '💰', color: 'from-emerald-400 to-green-600', key: 'finance', category: 'business', status: 'online' },
  { id: 11, name: 'Media', role: 'Creative', emoji: '📺', color: 'from-sky-400 to-blue-600', key: 'media', category: 'creative', status: 'idle' },
];

export const COLLABORATION_ITEMS: Record<string, CollaborationItem> = {
  strategy: { key: 'strategy', color: 'from-cyan-500 to-blue-600', emoji: '🎯' },
  design: { key: 'design', color: 'from-purple-500 to-pink-600', emoji: '🎨' },
  testing: { key: 'testing', color: 'from-green-500 to-emerald-600', emoji: '🧪' },
  promotion: { key: 'promotion', color: 'from-amber-500 to-orange-600', emoji: '📈' },
};

export const BASE_URL = 'https://7zi.studio';
