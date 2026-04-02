/**
 * @fileoverview Test fixtures for E2E tests
 * Provides mock data and test utilities for Playwright tests
 */

import { test as base } from '@playwright/test'

/**
 * Custom test fixture with auth and data helpers
 */
export const test = base.extend<{
  authenticatedPage: (typeof base.prototype)['page']
  testData: TestData
}>({
  authenticatedPage: async ({ page }, use) => {
    // Login before test
    await page.goto('/zh/login')
    await page.fill('input[type="email"], input[name="email"]', 'test@7zi.com')
    await page.fill('input[type="password"], input[name="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard', { timeout: 5000 })

    await use(page)

    // Cleanup after test
    await page.goto('/zh/logout')
  },
  testData: async ({}, use) => {
    const data = new TestData()
    await use(data)
  },
})

export const expect = test.expect

/**
 * Test data factory
 */
class TestData {
  // User test data
  users = {
    admin: {
      email: 'admin@7zi.com',
      password: 'admin123456',
      name: 'Admin User',
      role: 'admin',
    },
    user: {
      email: 'test@7zi.com',
      password: 'test123456',
      name: 'Test User',
      role: 'user',
    },
  }

  // Task test data
  tasks = {
    pending: {
      title: 'Test Task - Pending',
      description: 'This is a pending test task',
      priority: 'medium',
      status: 'pending',
      assignee: 'test@7zi.com',
    },
    inProgress: {
      title: 'Test Task - In Progress',
      description: 'This is an in-progress test task',
      priority: 'high',
      status: 'in_progress',
      assignee: 'test@7zi.com',
    },
    completed: {
      title: 'Test Task - Completed',
      description: 'This is a completed test task',
      priority: 'low',
      status: 'completed',
      assignee: 'test@7zi.com',
    },
  }

  // Team members test data
  teamMembers = [
    {
      id: 'agent-1',
      name: '智能体世界专家',
      role: 'Expert Agent',
      provider: 'MiniMax',
      status: 'active',
    },
    {
      id: 'agent-2',
      name: '咨询师',
      role: 'Consultant Agent',
      provider: 'MiniMax',
      status: 'active',
    },
    {
      id: 'agent-3',
      name: '架构师',
      role: 'Architect Agent',
      provider: 'Self-Claude',
      status: 'active',
    },
    {
      id: 'agent-4',
      name: 'Executor',
      role: 'Executor Agent',
      provider: 'Volcengine',
      status: 'active',
    },
  ]

  // URLs
  urls = {
    home: '/',
    login: '/zh/login',
    register: '/zh/register',
    dashboard: '/dashboard',
    tasks: '/tasks',
    team: '/team',
    settings: '/settings',
    about: '/about',
    contact: '/contact',
    blog: '/blog',
  }

  /**
   * Generate a unique task title
   */
  generateTaskTitle(prefix: string = 'Test Task'): string {
    return `${prefix} - ${Date.now()}`
  }

  /**
   * Get a random team member
   */
  getRandomTeamMember() {
    return this.teamMembers[Math.floor(Math.random() * this.teamMembers.length)]
  }

  /**
   * Get task by status
   */
  getTaskByStatus(status: string) {
    return this.tasks[status as keyof typeof this.tasks]
  }

  /**
   * Get user by role
   */
  getUserByRole(role: string) {
    return this.users[role as keyof typeof this.users]
  }

  /**
   * Generate test form data
   */
  generateFormData(data: Record<string, any>) {
    return {
      ...data,
      _timestamp: Date.now(),
    }
  }
}
