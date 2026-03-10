import { useDashboardStore } from '@/stores/dashboardStore';
import { useTasksStore } from '@/lib/store/tasks-store';
import { TaskType, type Task, type AITeamMember } from '@/lib/types/task-types';

/**
 * Task Dashboard Integration Service
 * 
 * This service provides integration between the tasks system and the dashboard store.
 * It handles:
 * - Converting dashboard AI members to task assignment candidates
 * - Updating member status based on task assignments
 * - Synchronizing task data with dashboard activities
 */

// Get AI team members from dashboard store for task assignment
export const getAITeamForTaskAssignment = (): AITeamMember[] => {
  const members = useDashboardStore.getState().members;
  
  return members.map(member => ({
    id: member.id,
    name: member.name,
    role: member.role,
    expertise: getExpertiseFromRole(member.role),
    status: (member.status === 'working' || member.status === 'busy' ? 'busy' : 'available') as 'available' | 'busy' | 'offline',
    completedTasks: member.completedTasks,
    avatar: member.avatar
  }));
};

// Convert member role to expertise areas for task matching
const getExpertiseFromRole = (role: string): TaskType[] => {
  const roleLower = role.toLowerCase();
  
  if (roleLower.includes('执行') || roleLower.includes('executor')) {
    return ['development'];
  }
  if (roleLower.includes('架构') || roleLower.includes('architect')) {
    return ['development', 'research'];
  }
  if (roleLower.includes('设计') || roleLower.includes('designer')) {
    return ['design'];
  }
  if (roleLower.includes('咨询') || roleLower.includes('consultant')) {
    return ['research', 'marketing'];
  }
  if (roleLower.includes('专家') || roleLower.includes('expert')) {
    return ['research'];
  }
  if (roleLower.includes('推广') || roleLower.includes('marketing')) {
    return ['marketing'];
  }
  if (roleLower.includes('媒体') || roleLower.includes('media')) {
    return ['marketing'];
  }
  if (roleLower.includes('测试') || roleLower.includes('tester')) {
    return ['development'];
  }
  if (roleLower.includes('系统') || roleLower.includes('sysadmin')) {
    return ['development'];
  }
  
  return ['other'];
};

// Update AI member status when task is assigned
export const updateMemberStatusOnTaskAssignment = (memberId: string, taskId: string) => {
  const member = useDashboardStore.getState().members.find(m => m.id === memberId);
  if (!member) return;
  
  // Update member status to working/busy
  useDashboardStore.getState().updateMemberStatus(memberId, 'working');
  useDashboardStore.getState().updateMemberTask(memberId, `#${taskId} ${getTaskTitle(taskId)}`);
};

// Update AI member status when task is completed
export const updateMemberStatusOnTaskCompletion = (memberId: string) => {
  const member = useDashboardStore.getState().members.find(m => m.id === memberId);
  if (!member) return;
  
  // Update member status back to idle
  useDashboardStore.getState().updateMemberStatus(memberId, 'idle');
  useDashboardStore.getState().updateMemberTask(memberId, undefined);
  
  // Increment completed tasks count
  const currentCompleted = member.completedTasks || 0;
  
  // Note: The dashboard store doesn't have a direct way to update completedTasks,
  // so we'll need to handle this through the existing member array update mechanism
  const currentState = useDashboardStore.getState();
  const updatedMembers = currentState.members.map(m => 
    m.id === memberId ? { ...m, completedTasks: currentCompleted + 1 } : m
  );
  
  // Since the dashboard store doesn't expose a direct method to update members,
  // we'll create a new state with updated members
  useDashboardStore.setState({ members: updatedMembers });
};

// Get task title by ID
const getTaskTitle = (taskId: string): string => {
  const tasks = useTasksStore.getState().tasks;
  const task = tasks.find(t => t.id === taskId);
  return task ? task.title : '未知任务';
};

// Get statistics for dashboard integration
export const getTaskStatistics = () => {
  const tasks = useTasksStore.getState().tasks;
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'assigned').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  
  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  };
};

// Get active projects for dashboard (grouped by assignee)
export const getActiveProjectsForDashboard = () => {
  const tasks = useTasksStore.getState().tasks;
  const members = useDashboardStore.getState().members;
  
  // Group tasks by assignee
  const tasksByAssignee = tasks.reduce((acc, task) => {
    if (task.assignee) {
      if (!acc[task.assignee]) {
        acc[task.assignee] = [];
      }
      acc[task.assignee].push(task);
    }
    return acc;
  }, {} as Record<string, Task[]>);
  
  // Convert to project format expected by dashboard
  const projects = Object.entries(tasksByAssignee).map(([assigneeId, assigneeTasks]) => {
    const member = members.find(m => m.id === assigneeId);
    const completed = assigneeTasks.filter(t => t.status === 'completed').length;
    const total = assigneeTasks.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      id: assigneeId,
      name: member ? `${member.name} 的任务` : '未分配任务',
      progress,
      status: progress === 100 ? 'completed' : 'active' as const,
      tasks: {
        total,
        completed
      },
      team: member ? [member.name] : ['未分配'],
      deadline: '持续进行中'
    };
  });
  
  // Add unassigned tasks as a separate project
  const unassignedTasks = tasks.filter(t => !t.assignee);
  if (unassignedTasks.length > 0) {
    const completedUnassigned = unassignedTasks.filter(t => t.status === 'completed').length;
    const totalUnassigned = unassignedTasks.length;
    const progressUnassigned = Math.round((completedUnassigned / totalUnassigned) * 100);
    
    projects.push({
      id: 'unassigned',
      name: '未分配任务',
      progress: progressUnassigned,
      status: 'active' as const,
      tasks: {
        total: totalUnassigned,
        completed: completedUnassigned
      },
      team: ['待分配'],
      deadline: '待分配'
    });
  }
  
  return projects;
};

// Generate activity logs from tasks for dashboard
export const generateTaskActivitiesForDashboard = () => {
  const tasks = useTasksStore.getState().tasks;
  const activities = [];
  
  // Create activities for recent task updates
  const recentTasks = tasks
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);
  
  for (const task of recentTasks) {
    const lastUpdate = new Date(task.updatedAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
    
    let timeText = '';
    if (diffMinutes < 1) {
      timeText = '刚刚';
    } else if (diffMinutes < 60) {
      timeText = `${diffMinutes} 分钟前`;
    } else if (diffMinutes < 1440) {
      timeText = `${Math.floor(diffMinutes / 60)} 小时前`;
    } else {
      timeText = '昨天';
    }
    
    let activityMessage = '';
    let emoji = '📋';
    
    switch (task.status) {
      case 'pending':
        activityMessage = `创建新任务: ${task.title}`;
        emoji = '🆕';
        break;
      case 'assigned':
        activityMessage = `分配任务给 ${getMemberName(task.assignee)}: ${task.title}`;
        emoji = '👥';
        break;
      case 'in_progress':
        activityMessage = `开始处理任务: ${task.title}`;
        emoji = '🔄';
        break;
      case 'completed':
        activityMessage = `完成任务: ${task.title}`;
        emoji = '✅';
        break;
    }
    
    activities.push({
      id: `task-${task.id}`,
      type: 'issue' as const,
      message: activityMessage,
      user: task.assignee ? getMemberName(task.assignee) : '系统',
      time: timeText,
      emoji
    });
  }
  
  return activities;
};

// Helper function to get member name by ID
const getMemberName = (memberId?: string): string => {
  if (!memberId) return '未分配';
  const members = useDashboardStore.getState().members;
  const member = members.find(m => m.id === memberId);
  return member ? member.name : '未知成员';
};

// Initialize integration (call once on app startup)
export const initializeTaskDashboardIntegration = () => {
  // Subscribe to task changes and update dashboard accordingly
  useTasksStore.subscribe((state, prevState) => {
    // Handle new task creation
    if (state.tasks.length > prevState.tasks.length) {
      const newTask = state.tasks.find(t => !prevState.tasks.some(pt => pt.id === t.id));
      if (newTask && newTask.assignee) {
        updateMemberStatusOnTaskAssignment(newTask.assignee, newTask.id);
      }
    }
    
    // Handle task status changes
    for (const task of state.tasks) {
      const prevTask = prevState.tasks.find(pt => pt.id === task.id);
      if (prevTask && prevTask.status !== task.status) {
        if (task.status === 'assigned' && task.assignee) {
          updateMemberStatusOnTaskAssignment(task.assignee, task.id);
        } else if (task.status === 'completed' && task.assignee) {
          updateMemberStatusOnTaskCompletion(task.assignee);
        }
      }
    }
  });
};