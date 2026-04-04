import { NextRequest, NextResponse } from 'next/server'
import { adaptiveLearner } from '@/lib/agents/learning/adaptive-learner'
import { createSuccessResponse, createErrorResponse, ErrorType } from '@/lib/api/error-handler'
import { authenticateJWT } from '@/lib/auth/api-auth'
import type { AgentLearningStats, CapabilityScore } from '@/lib/agents/learning/types'

interface WeightAdjustmentRequest {
  agentId: string
  taskType: string
  adjustment: number
  reason?: string
}

export async function POST(request: NextRequest) {
  const auth = await authenticateJWT(request)
  if (!auth.authenticated)
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body: WeightAdjustmentRequest = await request.json()
    if (!body.agentId)
      return NextResponse.json(
        { success: false, error: { type: ErrorType.VALIDATION, message: 'Agent ID is required' } },
        { status: 400 }
      )
    if (!body.taskType)
      return NextResponse.json(
        { success: false, error: { type: ErrorType.VALIDATION, message: 'Task type is required' } },
        { status: 400 }
      )
    if (typeof body.adjustment !== 'number')
      return NextResponse.json(
        {
          success: false,
          error: { type: ErrorType.VALIDATION, message: 'Adjustment must be a number' },
        },
        { status: 400 }
      )
    if (body.adjustment < -1 || body.adjustment > 1)
      return NextResponse.json(
        {
          success: false,
          error: { type: ErrorType.VALIDATION, message: 'Adjustment must be between -1.0 and 1.0' },
        },
        { status: 400 }
      )

    const prevStats: AgentLearningStats | undefined = adaptiveLearner.getAgentLearningStats(body.agentId) as AgentLearningStats | undefined
    const prevScore = prevStats?.capabilityScores.get(body.taskType)?.successRate || 0.5

    adaptiveLearner.adjustWeight({
      agentId: body.agentId,
      taskType: body.taskType,
      adjustment: body.adjustment,
      reason: body.reason || 'Manual adjustment',
    })

    const newStats: AgentLearningStats | undefined = adaptiveLearner.getAgentLearningStats(body.agentId) as AgentLearningStats | undefined
    const newScore = newStats?.capabilityScores.get(body.taskType)?.successRate || 0.5

    return createSuccessResponse({
      agentId: body.agentId,
      taskType: body.taskType,
      previousScore: Math.round(prevScore * 100) / 100,
      newScore: Math.round(newScore * 100) / 100,
      adjustment: body.adjustment,
      reason: body.reason || 'Manual adjustment',
      timestamp: Date.now(),
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found'))
      return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
    console.error('Agent Weight Adjustment error:', error)
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to adjust agent weight')
    )
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateJWT(request)
  if (!auth.authenticated)
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const rawStats = adaptiveLearner.getAgentLearningStats()
    const allStats: AgentLearningStats[] = agentId
      ? [rawStats as AgentLearningStats]
      : (rawStats as AgentLearningStats[])

    const adjustmentInfo = allStats.map((s: AgentLearningStats) => ({
      agentId: s.agentId,
      agentName: s.agentName,
      taskTypes: Array.from(s.capabilityScores.entries()).map(
        ([type, cap]: [string, CapabilityScore]) => ({
          taskType: type,
          currentScore: Math.round(cap.successRate * 100) / 100,
          sampleCount: cap.sampleCount,
          trend: cap.trend,
          canAdjust: true,
        })
      ),
      overallScore: Math.round(s.overallScore * 100) / 100,
      totalTasks: s.totalTasksCompleted,
    }))

    return createSuccessResponse({ agents: adjustmentInfo, count: adjustmentInfo.length })
  } catch (error) {
    console.error('Agent Adjustment GET error:', error)
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to get adjustment info')
    )
  }
}
