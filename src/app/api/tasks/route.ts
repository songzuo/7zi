import { NextRequest } from 'next/server';
import { Task, TaskStatus, TaskType } from '@/lib/types/task-types';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for tasks (in production, this would be a database)
const tasks: Task[] = [
  {
    id: 'task-001',
    title: '分析市场趋势',
    description: '研究当前AI代理市场的趋势和竞争对手',
    type: 'research',
    priority: 'high',
    status: 'completed',
    assignee: 'agent-world-expert',
    createdBy: 'user',
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-06T15:30:00Z',
    comments: [],
    history: [
      { timestamp: '2026-03-05T10:00:00Z', status: 'pending', changedBy: 'user' },
      { timestamp: '2026-03-05T10:15:00Z', status: 'assigned', changedBy: 'system', assignee: 'agent-world-expert' },
      { timestamp: '2026-03-05T10:20:00Z', status: 'in_progress', changedBy: 'agent-world-expert' },
      { timestamp: '2026-03-06T15:30:00Z', status: 'completed', changedBy: 'agent-world-expert' }
    ]
  },
  {
    id: 'task-002',
    title: '竞品调研报告',
    description: '分析主要竞争对手的产品功能和市场策略',
    type: 'research',
    priority: 'medium',
    status: 'in_progress',
    assignee: 'consultant',
    createdBy: 'user',
    createdAt: '2026-03-06T09:00:00Z',
    updatedAt: '2026-03-06T09:00:00Z',
    comments: [],
    history: [
      { timestamp: '2026-03-06T09:00:00Z', status: 'pending', changedBy: 'user' },
      { timestamp: '2026-03-06T09:05:00Z', status: 'assigned', changedBy: 'system', assignee: 'consultant' },
      { timestamp: '2026-03-06T09:10:00Z', status: 'in_progress', changedBy: 'consultant' }
    ]
  },
  {
    id: 'task-003',
    title: '系统架构评审',
    description: '评审当前系统的架构设计并提出改进建议',
    type: 'development',
    priority: 'high',
    status: 'in_progress',
    assignee: 'architect',
    createdBy: 'user',
    createdAt: '2026-03-06T11:00:00Z',
    updatedAt: '2026-03-06T11:00:00Z',
    comments: [],
    history: [
      { timestamp: '2026-03-06T11:00:00Z', status: 'pending', changedBy: 'user' },
      { timestamp: '2026-03-06T11:05:00Z', status: 'assigned', changedBy: 'system', assignee: 'architect' },
      { timestamp: '2026-03-06T11:10:00Z', status: 'in_progress', changedBy: 'architect' }
    ]
  }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as TaskStatus | null;
  const type = searchParams.get('type') as TaskType | null;
  const assignee = searchParams.get('assignee');

  let filteredTasks = [...tasks];

  if (status) {
    filteredTasks = filteredTasks.filter(task => task.status === status);
  }

  if (type) {
    filteredTasks = filteredTasks.filter(task => task.type === type);
  }

  if (assignee) {
    filteredTasks = filteredTasks.filter(task => task.assignee === assignee);
  }

  return Response.json(filteredTasks);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newTask: Task = {
      id: `task-${uuidv4().split('-')[0]}`,
      title: body.title,
      description: body.description || '',
      type: body.type || 'other',
      priority: body.priority || 'medium',
      status: 'pending',
      assignee: body.assignee || undefined,
      createdBy: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
      history: [{
        timestamp: new Date().toISOString(),
        status: 'pending',
        changedBy: 'user'
      }]
    };

    tasks.push(newTask);

    // If an assignee is specified, update their status
    if (newTask.assignee) {
      // This would normally call the dashboard store
    }

    return Response.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return Response.json({ error: 'Failed to create task' }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, assignee, comment } = body;

    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = tasks[taskIndex];
    const oldStatus = task.status;
    const oldAssignee = task.assignee;

    // Update task
    if (status) {
      task.status = status;
      task.history.push({
        timestamp: new Date().toISOString(),
        status: status,
        changedBy: 'user',
        assignee: assignee
      });
    }

    if (assignee !== undefined) {
      task.assignee = assignee;
      if (!status) {
        task.history.push({
          timestamp: new Date().toISOString(),
          status: task.status,
          changedBy: 'user',
          assignee: assignee
        });
      }
    }

    if (comment) {
      task.comments.push({
        id: `comment-${uuidv4().split('-')[0]}`,
        content: comment,
        author: 'user',
        timestamp: new Date().toISOString()
      });
    }

    task.updatedAt = new Date().toISOString();

    // Update dashboard member status if needed
    // (assignment tracking would happen here in production)

    tasks[taskIndex] = task;
    return Response.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return Response.json({ error: 'Failed to update task' }, { status: 400 });
  }
}