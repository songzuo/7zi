import { NextRequest, NextResponse } from 'next/server';
import { adaptiveLearner } from '@/lib/agents/learning/adaptive-learner';
import { agentScheduler } from '@/lib/agents/scheduler/scheduler';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/error-handler';
import { authenticateJWT } from '@/lib/auth/api-auth';

interface RouteParams { params: Promise<{ agentId: string }>; }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateJWT(request);
  if (!auth.authenticated) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { agentId } = await params;

  try {
    const sa = agentScheduler.getAgent(agentId);
    const ls = adaptiveLearner.getAgentLearningStats(agentId);

    const rating = (sr: number, sc: number): string => sc < 5 ? 'insufficient_data' : sr >= 0.95 ? 'excellent' : sr >= 0.85 ? 'good' : sr >= 0.7 ? 'average' : sr >= 0.5 ? 'below_average' : 'needs_improvement';

    return createSuccessResponse({
      agentId,
      agentName: sa?.name || (ls as any).agentName,
      status: sa?.status || 'unknown',
      registration: sa ? { type: sa.type, capabilities: sa.capabilities, createdAt: sa.createdAt, lastHeartbeat: sa.lastHeartbeat } : null,
      scores: {
        overall: Math.round((ls as any).overallScore * 100) / 100,
        reliability: Math.round((ls as any).reliabilityScore * 100) / 100,
        speed: Math.round((ls as any).speedScore * 100) / 100,
        quality: Math.round((ls as any).qualityScore * 100) / 100,
      },
      capabilities: Object.fromEntries(Array.from((ls as any).capabilityScores.entries() as Iterable<[string, any]>).map(([type, cap]) => [type, {
        avgCompletionTime: Math.round(cap.avgCompletionTime),
        successRate: Math.round(cap.successRate * 100) / 100,
        sampleCount: cap.sampleCount,
        lastTaskTime: cap.lastTaskTime,
        trend: cap.trend,
        performance: rating(cap.successRate, cap.sampleCount),
      }])),
      current: { load: (ls as any).currentLoad, avgResponseTime: Math.round((ls as any).avgResponseTime), successRate: Math.round((ls as any).successRate * 100) / 100 },
      tasks: { completed: (ls as any).totalTasksCompleted, failed: (ls as any).totalTasksFailed, total: (ls as any).totalTasksCompleted + (ls as any).totalTasksFailed },
      prediction: { estimatedResponseTime: Math.round((ls as any).avgResponseTime), confidence: (ls as any).totalTasksCompleted >= 10 ? 0.8 : 0.5 },
      lastUpdated: (ls as any).lastUpdated,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });
    console.error('Agent Learning Detail error:', error);
    return createErrorResponse(error instanceof Error ? error : new Error('Failed to get agent learning stats'));
  }
}
