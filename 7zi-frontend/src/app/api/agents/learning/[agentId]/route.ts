import { NextRequest, NextResponse } from 'next/server'
import { adaptiveLearner } from '@/lib/agents/learning/adaptive-learner'
import { agentScheduler } from '@/lib/agents/scheduler/scheduler'
import { createSuccessResponse, createErrorResponse } from '@/lib/api/error-handler'
import { authenticateJWT } from '@/lib/auth/api-auth'
import type { AgentLearningStats, CapabilityScore } from '@/lib/agents/learning/types'
import type { TaskStatus } from '@/lib/agents/scheduler/types'

interface RouteParams {
  params: Promise<{ agentId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateJWT(request)
  if (!auth.authenticated)
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { agentId } = await params

  try {
    const sa = agentScheduler.getAgent(agentId)
    const ls: AgentLearningStats | undefined = adaptiveLearner.getAgentLearningStats(agentId) as AgentLearningStats | undefined

    const rating = (sr: number, sc: number): string =>
      sc < 5
        ? 'insufficient_data'
        : sr >= 0.95
          ? 'excellent'
          : sr >= 0.85
            ? 'good'
            : sr >= 0.7
              ? 'average'
              : sr >= 0.5
                ? 'below_average'
                : 'needs_improvement'

    return createSuccessResponse({
      agentId,
      agentName: sa?.name || ls?.agentName || agentId,
      status: sa?.status || 'unknown',
      registration: sa
        ? {
            type: sa.type,
            capabilities: sa.capabilities,
            createdAt: sa.createdAt,
            lastHeartbeat: sa.lastHeartbeat,
          }
        : null,
      scores: {
        overall: ls ? Math.round(ls.overallScore * 100) / 100 : 0,
        reliability: ls ? Math.round(ls.reliabilityScore * 100) / 100 : 0,
        speed: ls ? Math.round(ls.speedScore * 100) / 100 : 0,
        quality: ls ? Math.round(ls.qualityScore * 100) / 100 : 0,
      },
      capabilities: ls ? Object.fromEntries(
        Array.from(ls.capabilityScores.entries()).map(
          ([type, cap]: [string, CapabilityScore]) => [
            type,
            {
              avgCompletionTime: Math.round(cap.avgCompletionTime),
              successRate: Math.round(cap.successRate * 100) / 100,
              sampleCount: cap.sampleCount,
              lastTaskTime: cap.lastTaskTime,
              trend: cap.trend,
              performance: rating(cap.successRate, cap.sampleCount),
            },
          ]
        )
      ) : {},
      current: {
        load: ls?.currentLoad ?? 0,
        avgResponseTime: ls ? Math.round(ls.avgResponseTime) : 0,
        successRate: ls ? Math.round(ls.successRate * 100) / 100 : 0,
      },
      tasks: {
        completed: ls?.totalTasksCompleted ?? 0,
        failed: ls?.totalTasksFailed ?? 0,
        total: ls ? ls.totalTasksCompleted + ls.totalTasksFailed : 0,
      },
      prediction: {
        estimatedResponseTime: ls ? Math.round(ls.avgResponseTime) : 0,
        confidence: ls && ls.totalTasksCompleted >= 10 ? 0.8 : 0.5,
      },
      lastUpdated: ls?.lastUpdated ?? Date.now(),
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found'))
      return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
    console.error('Agent Learning Detail error:', error)
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to get agent learning stats')
    )
  }
}
