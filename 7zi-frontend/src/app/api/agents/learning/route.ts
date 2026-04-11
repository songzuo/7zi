import { NextRequest } from 'next/server'
import { adaptiveLearner } from '@/lib/agents/learning/adaptive-learner'
import { agentScheduler } from '@/lib/agents/scheduler/scheduler'
import { createSuccessResponse, createErrorResponse, createUnauthorizedError } from '@/lib/api/error-handler'
import { authenticateJWT } from '@/lib/auth/api-auth'
import { createHotDataCache, CachePresets } from '@/lib/cache'

// Cache for agent learning stats (medium TTL since stats don't change every second)
const agentLearningCache = createHotDataCache<unknown>(CachePresets.MEDIUM)

export async function GET(request: NextRequest) {
  const auth = await authenticateJWT(request)
  if (!auth.authenticated)
    return createUnauthorizedError('Authentication required')

  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') || 'day') as 'hour' | 'day' | 'week' | 'month'
    const includeSystem = searchParams.get('includeSystem') === 'true'

    // Generate cache key based on request params
    const cacheKey = {
      endpoint: 'agents-learning',
      params: { period, includeSystem },
      version: '1',
    }

    // Check cache first
    const cachedResult = agentLearningCache.get(cacheKey)
    if (cachedResult) {
      return createSuccessResponse(cachedResult)
    }

    const allAgentStats = adaptiveLearner.getAgentLearningStats()
    const schedulerAgents = agentScheduler.getAllAgents()

    const agentsWithStats = (Array.isArray(allAgentStats) ? allAgentStats : [allAgentStats]).map(
      stats => {
        const sa = schedulerAgents.find(a => a.id === stats.agentId)
        return {
          agentId: stats.agentId,
          agentName: sa?.name || stats.agentName,
          status: sa?.status || 'offline',
          scores: {
            overall: Math.round(stats.overallScore * 100) / 100,
            reliability: Math.round(stats.reliabilityScore * 100) / 100,
            speed: Math.round(stats.speedScore * 100) / 100,
            quality: Math.round(stats.qualityScore * 100) / 100,
          },
          capabilities: Object.fromEntries(
            Array.from(stats.capabilityScores.entries()).map(([type, cap]) => [
              type,
              {
                avgCompletionTime: Math.round(cap.avgCompletionTime),
                successRate: Math.round(cap.successRate * 100) / 100,
                sampleCount: cap.sampleCount,
                trend: cap.trend,
              },
            ])
          ),
          currentLoad: stats.currentLoad,
          avgResponseTime: Math.round(stats.avgResponseTime),
          successRate: Math.round(stats.successRate * 100) / 100,
          tasksCompleted: stats.totalTasksCompleted,
          tasksFailed: stats.totalTasksFailed,
          lastUpdated: stats.lastUpdated,
        }
      }
    )

    const agentsWithoutStats = schedulerAgents
      .filter(a => !agentsWithStats.find(s => s.agentId === a.id))
      .map(agent => ({
        agentId: agent.id,
        agentName: agent.name,
        status: agent.status,
        scores: { overall: 0.5, reliability: 0.5, speed: 0.5, quality: 0.5 },
        capabilities: {},
        currentLoad: agent.status === 'busy' ? 1 : 0,
        avgResponseTime: 0,
        successRate: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
        lastUpdated: agent.updatedAt,
      }))

    const allAgents = [...agentsWithStats, ...agentsWithoutStats]
    const response: Record<string, unknown> = { agents: allAgents, count: allAgents.length, period }
    if (includeSystem) {
      response.system = adaptiveLearner.getSystemStats()
      response.aggregated = adaptiveLearner.getAggregatedStats(period)
    }

    // Cache the response
    agentLearningCache.set(cacheKey, response)

    return createSuccessResponse(response)
  } catch (error) {
    console.error('Agent Learning API error:', error)
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to get agent learning stats')
    )
  }
}
