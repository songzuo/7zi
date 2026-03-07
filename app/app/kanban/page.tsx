/**
 * 团队协作看板页面
 */

import { Metadata } from 'next';
import { TeamKanbanClient } from './TeamKanbanClient';

export const metadata: Metadata = {
  title: '团队协作看板 - AI Team Dashboard',
  description: '可视化任务管理，支持拖拽、实时协作',
};

export default function TeamKanbanPage() {
  return <TeamKanbanClient />;
}