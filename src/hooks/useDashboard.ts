'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTasksStore } from '@/lib/store/tasks-store';
import { useMembers, useDashboardStats, type AIMember } from '@/stores/dashboardStore';
import type { Task } from '@/lib/types/task-types';
import type { Project, ActivityLog } from '@/components/dashboard/types';
import { STATUS_LABELS } from '@/components/dashboard/types';
import { formatDate, getTaskEmoji } from '@/components/dashboard/utils';

// Mock data for fallback
const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: '7zi.com 官网重构',
    progress: 75,
    status: 'active',
    tasks: { total: 20, completed: 15 },
    team: ['Executor', '设计师', '架构师'],
    deadline: '2024-03-15',
  },
  {
    id: '2',
    name: 'AI 聊天系统集成',
    progress: 90,
    status: 'active',
    tasks: { total: 10, completed: 9 },
    team: ['Executor', '智能体专家'],
    deadline: '2024-03-10',
  },
  {
    id: '3',
    name: '品牌视觉升级',
    progress: 100,
    status: 'completed',
    tasks: { total: 15, completed: 15 },
    team: ['设计师', '媒体'],
    deadline: '2024-03-01',
  },
  {
    id: '4',
    name: 'SEO 优化项目',
    progress: 45,
    status: 'active',
    tasks: { total: 25, completed: 11 },
    team: ['推广专员', '咨询师'],
    deadline: '2024-03-20',
  },
];

const MOCK_ACTIVITIES: ActivityLog[] = [
  { id: '1', type: 'commit', message: '添加 AI 聊天组件', user: 'Executor', time: '5 分钟前', emoji: '💻' },
  { id: '2', type: 'deploy', message: '部署到生产环境', user: '系统管理员', time: '15 分钟前', emoji: '🚀' },
  { id: '3', type: 'issue', message: '修复响应式布局问题', user: '设计师', time: '1 小时前', emoji: '🐛' },
];

export interface UseDashboardReturn {
  tasks: Task[] | null;
  members: AIMember[];
  dashboardStats: { totalMembers: number };
  projects: Project[];
  activities: ActivityLog[];
  stats: {
    totalTasks: number;
    completedTasks: number;
    overallProgress: number;
  };
  getTaskAssigneeName: (task: Task) => string;
}

export function useDashboard(): UseDashboardReturn {
  const tasks = useTasksStore((state) => state.tasks);
  const members = useMembers();
  const dashboardStats = useDashboardStats();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // Convert tasks to projects format
  useEffect(() => {
    if (!tasks || tasks.length === 0) {
      requestAnimationFrame(() => {
        setProjects(MOCK_PROJECTS);
      });
    } else {
      const projectMap = new Map<string, Project>();
      
      tasks.forEach(task => {
        const projectName = task.type === 'development' ? '开发项目' : 
                          task.type === 'design' ? '设计项目' :
                          task.type === 'research' ? '研究项目' :
                          task.type === 'marketing' ? '营销项目' : '其他项目';
        
        if (!projectMap.has(projectName)) {
          projectMap.set(projectName, {
            id: projectName,
            name: projectName,
            progress: 0,
            status: 'active',
            tasks: { total: 0, completed: 0 },
            team: [],
            deadline: '2024-12-31',
          });
        }
        
        const project = projectMap.get(projectName)!;
        project.tasks.total += 1;
        if (task.status === 'completed') {
          project.tasks.completed += 1;
        }
        
        if (task.assignee && !project.team.includes(task.assignee)) {
          const member = members.find(m => m.id === task.assignee);
          if (member) {
            project.team.push(member.name);
          }
        }
      });
      
      const updatedProjects: Project[] = Array.from(projectMap.values()).map(project => ({
        ...project,
        progress: project.tasks.total > 0 ? Math.round((project.tasks.completed / project.tasks.total) * 100) : 0,
        status: project.tasks.completed >= project.tasks.total ? 'completed' : 'active'
      }));
      
      requestAnimationFrame(() => {
        setProjects(updatedProjects);
      });
    }
  }, [tasks, members]);

  // Generate activities from tasks and members
  useEffect(() => {
    const newActivities: ActivityLog[] = [];
    
    if (tasks && tasks.length > 0) {
      const recentTasks = [...tasks]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);
      
      recentTasks.forEach(task => {
        const assigneeName = task.assignee 
          ? members.find(m => m.id === task.assignee)?.name || task.assignee
          : '未分配';
          
        newActivities.push({
          id: `task-${task.id}`,
          type: 'task',
          message: `${task.title} (${STATUS_LABELS[task.status]})`,
          user: assigneeName,
          time: formatDate(task.updatedAt),
          emoji: getTaskEmoji(task.type, task.status)
        });
      });
    }
    
    members.slice(0, 3).forEach(member => {
      if (member.currentTask) {
        newActivities.push({
          id: `member-${member.id}`,
          type: 'meeting',
          message: `${member.currentTask}`,
          user: member.name,
          time: '最近',
          emoji: '📋'
        });
      }
    });
    
    if (newActivities.length === 0) {
      requestAnimationFrame(() => {
        setActivities(MOCK_ACTIVITIES);
      });
    } else {
      requestAnimationFrame(() => {
        setActivities(newActivities);
      });
    }
  }, [tasks, members]);

  const stats = useMemo(() => {
    const totalTasks = projects.reduce((acc, p) => acc + p.tasks.total, 0);
    const completedTasks = projects.reduce((acc, p) => acc + p.tasks.completed, 0);
    const overallProgress = Math.round((completedTasks / (totalTasks || 1)) * 100);
    return { totalTasks, completedTasks, overallProgress };
  }, [projects]);

  const getTaskAssigneeName = (task: Task): string => {
    return task.assignee 
      ? members.find(m => m.id === task.assignee)?.name || task.assignee
      : '未分配';
  };

  return {
    tasks,
    members,
    dashboardStats,
    projects,
    activities,
    stats,
    getTaskAssigneeName,
  };
}