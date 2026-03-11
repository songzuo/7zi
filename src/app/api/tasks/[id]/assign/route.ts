/**
 * @module api/tasks/assign
 * @description AI 智能任务分配 API
 * 
 * 该模块提供基于 AI 的智能任务分配功能，根据任务类型、团队成员专业技能、
 * 当前工作负载等因素自动推荐最佳分配人选。
 * 
 * @example
 * // 获取分配建议（不自动分配）
 * POST /api/tasks/task-001/assign
 * {}
 * 
 * // 自动分配给最佳候选人
 * POST /api/tasks/task-001/assign
 * { "autoAssign": true }
 * 
 * // 分配给指定成员
 * POST /api/tasks/task-001/assign
 * { "preferredMemberId": "architect" }
 * 
 * @see {@link Task} 任务类型定义
 * @see {@link AITeamMember} AI 团队成员类型
 * @see {@link AssignmentSuggestion} 分配建议类型
 */

import { NextRequest, NextResponse } from 'next/server';
import { Task, AITeamMember, AssignmentSuggestion, TaskType } from '@/lib/types/task-types';
import { getAITeamForTaskAssignment } from '@/lib/services/task-dashboard-integration';
import { verifyToken, extractToken } from '@/lib/security/auth';
import { apiLogger } from '@/lib/logger';

/**
 * 分配成功的成员信息
 * @typedef {Object} AssignedMember
 * @property {string} id - 成员 ID
 * @property {string} name - 成员名称
 * @property {number} confidence - 匹配置信度 (0-100)
 */

/**
 * 自动分配成功响应
 * @typedef {Object} AssignmentSuccessResult
 * @property {true} success - 成功标志
 * @property {string} message - 分配结果消息
 * @property {AssignedMember} assignedTo - 分配的成员信息
 * @property {Task|null} task - 更新后的任务对象
 */

/**
 * 分配建议列表响应
 * @typedef {Object} AssignmentSuggestionsResult
 * @property {true} success - 成功标志
 * @property {string} message - 结果消息
 * @property {AssignmentSuggestion[]} suggestions - 分配建议列表（最多5个）
 * @property {Task} task - 任务对象
 */

/**
 * 分配请求体
 * @typedef {Object} AssignmentRequestBody
 * @property {boolean} [autoAssign=false] - 是否自动分配给最佳候选人
 * @property {string} [preferredMemberId] - 指定分配的成员 ID
 */

/**
 * 错误响应
 * @typedef {Object} AssignmentErrorResponse
 * @property {string} error - 错误类型
 * @property {string} [message] - 错误详情
 */

/**
 * 分配结果（联合类型）
 * @typedef {AssignmentSuccessResult | AssignmentSuggestionsResult} AssignmentResult
 */

// Mock AI assignment logic - in production this would use actual AI models
const aiAssignTask = (task: Task, teamMembers: AITeamMember[]): AssignmentSuggestion[] => {
  const suggestions: AssignmentSuggestion[] = [];
  
  // Score each team member based on expertise match, availability, and workload
  for (const member of teamMembers) {
    let score = 0;
    let reason = '';
    
    // Expertise matching (highest priority)
    if (member.expertise.includes(task.type)) {
      score += 50;
      reason += `匹配专业领域 (${task.type})`;
    } else if (member.expertise.includes('other')) {
      score += 20;
      reason += '通用技能匹配';
    }
    
    // Availability bonus
    if (member.status === 'available') {
      score += 30;
      if (reason) reason += ', ';
      reason += '当前可用';
    } else if (member.status === 'busy') {
      score += 10;
      if (reason) reason += ', ';
      reason += '当前忙碌但可接受';
    }
    
    // Experience bonus (completed tasks)
    const experienceBonus = Math.min(member.completedTasks * 2, 20);
    score += experienceBonus;
    if (experienceBonus > 0 && reason) {
      reason += `, 经验丰富 (${member.completedTasks} 个已完成任务)`;
    }
    
    // Ensure minimum score for valid suggestions
    if (score > 0) {
      suggestions.push({
        memberId: member.id,
        memberName: member.name,
        confidence: Math.min(score, 100),
        reason
      });
    }
  }
  
  // Sort by confidence (highest first)
  return suggestions.sort((a, b) => b.confidence - a.confidence);
};

// Get task by ID (mock implementation - in production would query database)
const getTaskById = (taskId: string): Task | null => {
  // This would normally query a database
  // For now, we'll simulate with a simple lookup
  const mockTasks: Task[] = [
    {
      id: 'task-001',
      title: '分析市场趋势',
      description: '研究当前 AI 代理市场的趋势和竞争对手',
      type: 'research',
      priority: 'high',
      status: 'pending',
      assignee: undefined,
      createdBy: 'user',
      createdAt: '2026-03-05T10:00:00Z',
      updatedAt: '2026-03-05T10:00:00Z',
      comments: [],
      history: [{
        timestamp: '2026-03-05T10:00:00Z',
        status: 'pending',
        changedBy: 'user'
      }]
    },
    {
      id: 'task-002',
      title: '竞品调研报告',
      description: '分析主要竞争对手的产品功能和市场策略',
      type: 'research',
      priority: 'medium',
      status: 'pending',
      assignee: undefined,
      createdBy: 'user',
      createdAt: '2026-03-06T09:00:00Z',
      updatedAt: '2026-03-06T09:00:00Z',
      comments: [],
      history: [{
        timestamp: '2026-03-06T09:00:00Z',
        status: 'pending',
        changedBy: 'user'
      }]
    },
    {
      id: 'task-003',
      title: '系统架构评审',
      description: '评审当前系统的架构设计并提出改进建议',
      type: 'development',
      priority: 'high',
      status: 'pending',
      assignee: undefined,
      createdBy: 'user',
      createdAt: '2026-03-06T11:00:00Z',
      updatedAt: '2026-03-06T11:00:00Z',
      comments: [],
      history: [{
        timestamp: '2026-03-06T11:00:00Z',
        status: 'pending',
        changedBy: 'user'
      }]
    }
  ];
  
  return mockTasks.find(task => task.id === taskId) || null;
};

// Update task assignment (mock implementation)
const updateTaskAssignment = (taskId: string, assigneeId: string): Task | null => {
  // This would normally update a database
  // For now, we'll simulate the update
  const task = getTaskById(taskId);
  if (!task) return null;
  
  task.assignee = assigneeId;
  task.status = 'assigned';
  task.updatedAt = new Date().toISOString();
  task.history.push({
    timestamp: task.updatedAt,
    status: 'assigned',
    changedBy: 'system',
    assignee: assigneeId
  });
  
  return task;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    
    // Authentication check
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Get the task
    const task = getTaskById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Get AI team members
    const teamMembers = getAITeamForTaskAssignment();
    if (teamMembers.length === 0) {
      return NextResponse.json(
        { error: 'No AI team members available for assignment' },
        { status: 400 }
      );
    }
    
    // Parse request body for assignment options
    const body = await request.json();
    const { autoAssign = false, preferredMemberId } = body;
    
    // Get AI assignment suggestions
    const suggestions = aiAssignTask(task, teamMembers);
    
    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: 'No suitable team members found for this task' },
        { status: 400 }
      );
    }
    
    let assignedTask: Task | null = null;
    let assignmentResult: AssignmentResult;
    
    if (autoAssign) {
      // Auto-assign to the best candidate
      const bestCandidate = suggestions[0];
      assignedTask = updateTaskAssignment(taskId, bestCandidate.memberId);
      
      assignmentResult = {
        success: true,
        message: `Task automatically assigned to ${bestCandidate.memberName}`,
        assignedTo: {
          id: bestCandidate.memberId,
          name: bestCandidate.memberName,
          confidence: bestCandidate.confidence
        },
        task: assignedTask
      };
    } else if (preferredMemberId) {
      // Assign to specific member if requested
      const preferredMember = suggestions.find(s => s.memberId === preferredMemberId);
      if (!preferredMember) {
        return NextResponse.json(
          { error: 'Preferred team member not available or suitable for this task' },
          { status: 400 }
        );
      }
      
      assignedTask = updateTaskAssignment(taskId, preferredMemberId);
      
      assignmentResult = {
        success: true,
        message: `Task assigned to ${preferredMember.memberName}`,
        assignedTo: {
          id: preferredMember.memberId,
          name: preferredMember.memberName,
          confidence: preferredMember.confidence
        },
        task: assignedTask
      };
    } else {
      // Return suggestions without assigning
      assignmentResult = {
        success: true,
        message: 'AI assignment suggestions generated',
        suggestions: suggestions.slice(0, 5), // Return top 5 suggestions
        task: task
      };
    }
    
    apiLogger.audit('AI task assignment', {
      taskId,
      userId: payload.sub,
      autoAssign,
      preferredMemberId,
      suggestionsCount: suggestions.length
    });
    
    return NextResponse.json(assignmentResult);
  } catch (error) {
    apiLogger.error('Error in AI task assignment', error);
    return NextResponse.json(
      { error: 'Failed to process AI assignment', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}