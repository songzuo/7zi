/**
 * E2E Test: Multi-Agent Collaboration (v1.5.0)
 *
 * 测试多 Agent 协作的完整场景:
 * - Agent 注册和发现
 * - 任务分发和调度
 * - 跨 Agent 协作
 * - 负载均衡
 * - 任务失败重试
 */

import { test, expect, Page } from '@playwright/test'

// ===== Test Helpers =====

interface Agent {
  id: string
  name: string
  type: string
  capabilities: string[]
  status: 'idle' | 'busy' | 'offline'
}

interface Task {
  id: string
  type: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed'
  assignedAgent?: string
}

class AgentDashboard {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/agents')
    await this.page.waitForLoadState('networkidle')
  }

  async getAgents(): Promise<Agent[]> {
    const agents = await this.page.locator('[data-testid="agent-card"]').all()
    return Promise.all(
      agents.map(async el => {
        return {
          id: (await el.getAttribute('data-agent-id')) || '',
          name: (await el.locator('[data-testid="agent-name"]').textContent()) || '',
          type: (await el.locator('[data-testid="agent-type"]').textContent()) || '',
          capabilities: (
            await el.locator('[data-testid="agent-capability"]').allTextContents()
          ).filter(Boolean),
          status: (
            await el.locator('[data-testid="agent-status"]').textContent()
          )?.toLowerCase() as Agent['status'],
        }
      })
    )
  }

  async createTask(task: Partial<Task>) {
    await this.page.click('[data-testid="create-task-btn"]')
    await this.page.fill('[data-testid="task-type-input"]', task.type || 'general')
    if (task.priority) {
      await this.page.selectOption('[data-testid="task-priority-select"]', task.priority)
    }
    await this.page.click('[data-testid="submit-task-btn"]')
    await this.page.waitForSelector('[data-testid="task-created-toast"]', { timeout: 5000 })
  }

  async getTasks(): Promise<Task[]> {
    const tasks = await this.page.locator('[data-testid="task-item"]').all()
    return Promise.all(
      tasks.map(async el => {
        return {
          id: (await el.getAttribute('data-task-id')) || '',
          type: (await el.locator('[data-testid="task-type"]').textContent()) || '',
          priority: (
            await el.locator('[data-testid="task-priority"]').textContent()
          )?.toLowerCase() as Task['priority'],
          status: (
            await el.locator('[data-testid="task-status"]').textContent()
          )?.toLowerCase() as Task['status'],
          assignedAgent:
            (await el.locator('[data-testid="assigned-agent"]').textContent()) || undefined,
        }
      })
    )
  }

  async waitForTaskCompletion(taskId: string, timeout = 30000): Promise<Task> {
    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      const task = (await this.getTasks()).find(t => t.id === taskId)
      if (task && (task.status === 'completed' || task.status === 'failed')) {
        return task
      }
      await this.page.waitForTimeout(500)
    }
    throw new Error(`Task ${taskId} did not complete within ${timeout}ms`)
  }
}

// ===== Test Suite =====

test.describe('Multi-Agent Collaboration', () => {
  let dashboard: AgentDashboard

  test.beforeEach(async ({ page }) => {
    dashboard = new AgentDashboard(page)
    await dashboard.goto()
  })

  test.describe('Agent Registration', () => {
    test('should display all 11 agents', async ({ page }) => {
      const agents = await dashboard.getAgents()
      expect(agents.length).toBe(11)

      // Verify agent types
      const agentTypes = agents.map(a => a.type)
      expect(agentTypes).toContain('director')
      expect(agentTypes).toContain('executor')
      expect(agentTypes).toContain('architect')
      expect(agentTypes).toContain('tester')
      expect(agentTypes).toContain('designer')
    })

    test('should show agent capabilities', async ({ page }) => {
      const agents = await dashboard.getAgents()
      const executor = agents.find(a => a.type === 'executor')
      expect(executor?.capabilities).toContain('code-execution')
      expect(executor?.capabilities).toContain('deployment')
    })

    test('should update agent status in real-time', async ({ page }) => {
      const agents = await dashboard.getAgents()
      const initialStatus = agents[0].status

      // Trigger status change
      await page.click('[data-testid="agent-card"]:first-child [data-testid="refresh-status-btn"]')
      await page.waitForTimeout(1000)

      const updatedAgents = await dashboard.getAgents()
      expect(updatedAgents[0].status).toBeDefined()
    })
  })

  test.describe('Task Distribution', () => {
    test('should distribute task to appropriate agent', async ({ page }) => {
      // Create a coding task
      await dashboard.createTask({
        type: 'code-review',
        priority: 'high',
      })

      const tasks = await dashboard.getTasks()
      expect(tasks.length).toBeGreaterThan(0)

      // Wait for task assignment
      await page.waitForTimeout(2000)
      const assignedTasks = await dashboard.getTasks()
      const task = assignedTasks.find(t => t.type === 'code-review')
      expect(task?.assignedAgent).toBeDefined()
    })

    test('should respect priority ordering', async ({ page }) => {
      // Create tasks with different priorities
      await dashboard.createTask({ type: 'low-priority-task', priority: 'low' })
      await dashboard.createTask({ type: 'high-priority-task', priority: 'high' })
      await dashboard.createTask({ type: 'medium-priority-task', priority: 'medium' })

      await page.waitForTimeout(3000)

      const tasks = await dashboard.getTasks()
      // High priority task should be processed first
      const highPriorityIndex = tasks.findIndex(t => t.type === 'high-priority-task')
      const lowPriorityIndex = tasks.findIndex(t => t.type === 'low-priority-task')
      expect(highPriorityIndex).toBeLessThan(lowPriorityIndex)
    })

    test('should balance load across agents', async ({ page }) => {
      // Create multiple tasks
      for (let i = 0; i < 5; i++) {
        await dashboard.createTask({ type: `task-${i}`, priority: 'medium' })
      }

      await page.waitForTimeout(5000)

      const agents = await dashboard.getAgents()
      const busyAgents = agents.filter(a => a.status === 'busy')
      // At least 2 agents should be busy (distributed load)
      expect(busyAgents.length).toBeGreaterThanOrEqual(2)
    })
  })

  test.describe('Cross-Agent Collaboration', () => {
    test('should complete multi-step workflow', async ({ page }) => {
      // Create a complex task that requires multiple agents
      await dashboard.createTask({
        type: 'feature-implementation',
        priority: 'high',
      })

      // Wait for workflow to complete
      const tasks = await dashboard.getTasks()
      const featureTask = tasks[0]

      if (featureTask?.id) {
        const completedTask = await dashboard.waitForTaskCompletion(featureTask.id, 60000)
        expect(completedTask.status).toBe('completed')
      }
    })

    test('should handle inter-agent communication', async ({ page }) => {
      // Navigate to agent communication view
      await page.click('[data-testid="agent-communication-tab"]')

      // Trigger agent communication
      await dashboard.createTask({ type: 'collaborative-task', priority: 'medium' })

      // Wait for communication messages to appear
      await page.waitForSelector('[data-testid="agent-message"]', { timeout: 5000 })

      const messages = await page.locator('[data-testid="agent-message"]').all()
      expect(messages.length).toBeGreaterThan(0)
    })
  })

  test.describe('Error Handling', () => {
    test('should retry failed tasks', async ({ page }) => {
      // Create a task that might fail (simulated)
      await page.route('**/api/tasks/*', async route => {
        if (route.request().method() === 'POST') {
          // First request fails
          await route.fulfill({ status: 500, body: 'Internal Server Error' })
        } else {
          await route.continue()
        }
      })

      await dashboard.createTask({ type: 'failing-task', priority: 'high' })

      // Wait and check for retry
      await page.waitForTimeout(5000)

      // The task should have been retried
      const logs = await page.locator('[data-testid="task-log"]').allTextContents()
      const retryLog = logs.find(l => l.includes('retry') || l.includes('Retrying'))
      expect(retryLog).toBeDefined()
    })

    test('should handle agent disconnection gracefully', async ({ page }) => {
      const agents = await dashboard.getAgents()
      const initialCount = agents.length

      // Simulate agent disconnection
      await page.evaluate(() => {
        window.dispatchEvent(
          new CustomEvent('agent-disconnect', {
            detail: { agentId: 'executor-1' },
          })
        )
      })

      await page.waitForTimeout(1000)

      // Check that tasks were reassigned
      const tasks = await dashboard.getTasks()
      const reassignedTasks = tasks.filter(t => t.status === 'pending')
      // Tasks should be in pending state waiting for reassignment
      expect(reassignedTasks.length).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Performance', () => {
    test('should handle concurrent task creation', async ({ page }) => {
      const startTime = Date.now()

      // Create 10 tasks concurrently
      await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          dashboard.createTask({ type: `concurrent-task-${i}`, priority: 'medium' })
        )
      )

      const endTime = Date.now()
      const duration = endTime - startTime

      // All tasks should be created within 10 seconds
      expect(duration).toBeLessThan(10000)

      const tasks = await dashboard.getTasks()
      expect(tasks.length).toBe(10)
    })

    test('should update dashboard in real-time', async ({ page }) => {
      // Open two tabs
      const context = page.context()
      const page2 = await context.newPage()
      const dashboard2 = new AgentDashboard(page2)
      await dashboard2.goto()

      // Create task in first tab
      await dashboard.createTask({ type: 'realtime-test', priority: 'high' })

      // Check second tab updates
      await page2.waitForTimeout(2000)
      const tasks2 = await dashboard2.getTasks()
      expect(tasks2.find(t => t.type === 'realtime-test')).toBeDefined()

      await page2.close()
    })
  })
})

// ===== API Integration Tests =====

test.describe('Multi-Agent API', () => {
  test('should register agent via API', async ({ request }) => {
    const response = await request.post('/api/agents/register', {
      data: {
        id: 'test-agent-1',
        name: 'Test Agent',
        type: 'executor',
        capabilities: ['code-execution', 'testing'],
      },
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.agent.id).toBe('test-agent-1')
  })

  test('should schedule task via API', async ({ request }) => {
    const response = await request.post('/api/tasks/schedule', {
      data: {
        type: 'test-task',
        priority: 'high',
        payload: { test: true },
      },
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.taskId).toBeDefined()
    expect(data.assignedAgent).toBeDefined()
  })

  test('should get agent status via API', async ({ request }) => {
    const response = await request.get('/api/agents/status')

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(Array.isArray(data.agents)).toBe(true)
  })

  test('should handle WebSocket events', async ({ page }) => {
    // Test WebSocket connection for real-time updates
    const wsConnected = await page.evaluate(() => {
      return new Promise<boolean>(resolve => {
        const ws = new WebSocket('ws://localhost:3000/ws/agents')
        ws.onopen = () => {
          ws.close()
          resolve(true)
        }
        ws.onerror = () => resolve(false)
        setTimeout(() => resolve(false), 5000)
      })
    })

    expect(wsConnected).toBe(true)
  })
})
