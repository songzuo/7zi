import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/team/members
 * 获取团队成员列表
 */
export async function GET(request: NextRequest) {
  // Mock 数据 - 11人AI团队
  const members = [
    { id: '1', name: '智能体专家', role: '视角转换', status: 'online', currentTask: '分析市场趋势' },
    { id: '2', name: '咨询师', role: '研究分析', status: 'online', currentTask: '用户调研报告' },
    { id: '3', name: '架构师', role: '系统设计', status: 'busy', currentTask: '数据库优化' },
    { id: '4', name: 'Executor', role: '执行实现', status: 'online', currentTask: '开发新功能' },
    { id: '5', name: '系统管理员', role: '运维部署', status: 'away' },
    { id: '6', name: '测试员', role: '质量保障', status: 'online', currentTask: '自动化测试' },
    { id: '7', name: '设计师', role: 'UI/UX', status: 'offline' },
    { id: '8', name: '推广专员', role: '市场推广', status: 'online' },
    { id: '9', name: '销售客服', role: '客户支持', status: 'online' },
    { id: '10', name: '财务', role: '会计审计', status: 'online' },
    { id: '11', name: '媒体', role: '内容创作', status: 'online' },
  ];

  const stats = {
    total: members.length,
    online: members.filter(m => m.status === 'online').length,
    busy: members.filter(m => m.status === 'busy').length,
    away: members.filter(m => m.status === 'away').length,
    offline: members.filter(m => m.status === 'offline').length,
  };

  return NextResponse.json({
    success: true,
    data: {
      members,
      stats,
    },
  });
}