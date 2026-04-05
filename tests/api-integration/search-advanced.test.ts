/**
 * @fileoverview Advanced Search API integration tests
 * @description Tests for /api/search/advanced endpoint
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { server, mockData } from './mocks/handlers'

function getAuthHeader(userId: string): HeadersInit {
  const token = mockData.generateToken(userId)
  return { Authorization: `Bearer ${token}` }
}

describe('/api/search/advanced - Integration Tests', () => {
  beforeAll(() => {
    server.listen()
  })

  beforeEach(() => {
    mockData.resetUsers()
    mockData.resetTasks()
    mockData.resetProjects()
    mockData.resetMembers()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  describe('GET /api/search/advanced - Basic Advanced Search', () => {
    it('should return results with default parameters', async () => {
      const user = mockData.createUser({
        email: 'searcher@example.com',
        password: 'SecurePass123',
        name: 'Search User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.results).toBeDefined()
      expect(Array.isArray(data.data.results)).toBe(true)
      expect(data.data).toHaveProperty('total')
      expect(data.data).toHaveProperty('page')
      expect(data.data).toHaveProperty('pageSize')
      expect(data.data).toHaveProperty('hasMore')
    })

    it('should handle empty query gracefully', async () => {
      const user = mockData.createUser({
        email: 'emptyquery@example.com',
        password: 'SecurePass123',
        name: 'Empty Query User',
      })

      const response = await fetch('http://localhost:3000/api/search/advanced?q=', {
        method: 'GET',
        headers: getAuthHeader(user.id),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.results).toBeDefined()
    })

    it('should search across multiple fields', async () => {
      const user = mockData.createUser({
        email: 'multifield@example.com',
        password: 'SecurePass123',
        name: 'Multi Field User',
      })

      // Create test data
      mockData.createTaskFull({
        title: 'Fix login authentication bug',
        description: 'Users cannot login with correct credentials',
        priority: 'high',
        status: 'open',
        createdBy: user.id,
      })

      mockData.createProjectFull({
        name: 'Authentication System',
        description: 'Improve login and security',
        owner: user.id,
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=login',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.total).toBeGreaterThan(0)
    })
  })

  describe('GET /api/search/advanced - Boolean Operations', () => {
    it('should support AND boolean operator', async () => {
      const user = mockData.createUser({
        email: 'andsearch@example.com',
        password: 'SecurePass123',
        name: 'AND Search User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=login+bug&operator=AND',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.results).toBeDefined()
    })

    it('should support OR boolean operator', async () => {
      const user = mockData.createUser({
        email: 'orsearch@example.com',
        password: 'SecurePass123',
        name: 'OR Search User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=bug|error&operator=OR',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should support NOT boolean operator', async () => {
      const user = mockData.createUser({
        email: 'notsearch@example.com',
        password: 'SecurePass123',
        name: 'NOT Search User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=bug+-error&operator=NOT',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should support complex boolean queries', async () => {
      const user = mockData.createUser({
        email: 'complexbool@example.com',
        password: 'SecurePass123',
        name: 'Complex Boolean User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=(login+OR+auth)+AND+bug+-fixed',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should support field-specific boolean queries', async () => {
      const user = mockData.createUser({
        email: 'fieldbool@example.com',
        password: 'SecurePass123',
        name: 'Field Boolean User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=fields:priority:high+AND+status:open',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/search/advanced - Multi-field Search', () => {
    it('should search in title field only', async () => {
      const user = mockData.createUser({
        email: 'titlesearch@example.com',
        password: 'SecurePass123',
        name: 'Title Search User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&field=title',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should search in description field only', async () => {
      const user = mockData.createUser({
        email: 'descsearch@example.com',
        password: 'SecurePass123',
        name: 'Description Search User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&field=description',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should search across multiple specified fields', async () => {
      const user = mockData.createUser({
        email: 'multifieldsearch@example.com',
        password: 'SecurePass123',
        name: 'Multi Field Search User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&field=title,description,name',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should support field-specific queries with syntax', async () => {
      const user = mockData.createUser({
        email: 'fieldsyntax@example.com',
        password: 'SecurePass123',
        name: 'Field Syntax User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=title:fix+description:bug',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/search/advanced - Filter Parameters', () => {
    it('should filter by content type', async () => {
      const user = mockData.createUser({
        email: 'typefilter@example.com',
        password: 'SecurePass123',
        name: 'Type Filter User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&type=task',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.results.every((r: any) => r.type === 'task')).toBe(true)
    })

    it('should filter by status', async () => {
      const user = mockData.createUser({
        email: 'statusfilter@example.com',
        password: 'SecurePass123',
        name: 'Status Filter User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&status=open',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should filter by priority', async () => {
      const user = mockData.createUser({
        email: 'priorityfilter@example.com',
        password: 'SecurePass123',
        name: 'Priority Filter User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&priority=high',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should filter by assignee', async () => {
      const user = mockData.createUser({
        email: 'assigneefilter@example.com',
        password: 'SecurePass123',
        name: 'Assignee Filter User',
      })

      const member = mockData.createMember({
        name: 'John Doe',
        email: 'john@example.com',
      })

      const response = await fetch(
        `http://localhost:3000/api/search/advanced?q=test&assignee=${member.id}`,
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should support multiple filters simultaneously', async () => {
      const user = mockData.createUser({
        email: 'multifilter@example.com',
        password: 'SecurePass123',
        name: 'Multi Filter User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&status=open&priority=high&type=task',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should filter by date range', async () => {
      const user = mockData.createUser({
        email: 'datefilter@example.com',
        password: 'SecurePass123',
        name: 'Date Filter User',
      })

      const startDate = new Date('2024-01-01').toISOString()
      const endDate = new Date('2024-12-31').toISOString()

      const response = await fetch(
        `http://localhost:3000/api/search/advanced?q=test&startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/search/advanced - Pagination', () => {
    it('should support pagination with page parameter', async () => {
      const user = mockData.createUser({
        email: 'pagination@example.com',
        password: 'SecurePass123',
        name: 'Pagination User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&page=1',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.page).toBe(1)
      expect(data.data).toHaveProperty('hasMore')
    })

    it('should support custom page size', async () => {
      const user = mockData.createUser({
        email: 'pagesize@example.com',
        password: 'SecurePass123',
        name: 'Page Size User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&page=1&pageSize=20',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.pageSize).toBe(20)
      expect(data.data.results.length).toBeLessThanOrEqual(20)
    })

    it('should limit results when page size is too large', async () => {
      const user = mockData.createUser({
        email: 'pagesizecap@example.com',
        password: 'SecurePass123',
        name: 'Page Size Cap User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&page=1&pageSize=1000',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      // Max page size should be enforced (e.g., 100)
      expect(data.data.results.length).toBeLessThanOrEqual(100)
    })

    it('should handle page beyond available results', async () => {
      const user = mockData.createUser({
        email: 'pagebeyond@example.com',
        password: 'SecurePass123',
        name: 'Page Beyond User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&page=999',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.results).toEqual([])
      expect(data.data.hasMore).toBe(false)
    })

    it('should provide accurate total count', async () => {
      const user = mockData.createUser({
        email: 'totalcount@example.com',
        password: 'SecurePass123',
        name: 'Total Count User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.total).toBeGreaterThanOrEqual(0)
      expect(typeof data.data.total).toBe('number')
    })

    it('should provide accurate hasMore indicator', async () => {
      const user = mockData.createUser({
        email: 'hasmore@example.com',
        password: 'SecurePass123',
        name: 'HasMore User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(typeof data.data.hasMore).toBe('boolean')
    })
  })

  describe('GET /api/search/advanced - Sorting', () => {
    it('should support sorting by relevance (default)', async () => {
      const user = mockData.createUser({
        email: 'relevancesort@example.com',
        password: 'SecurePass123',
        name: 'Relevance Sort User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&sortBy=relevance',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should support sorting by date created', async () => {
      const user = mockData.createUser({
        email: 'datesort@example.com',
        password: 'SecurePass123',
        name: 'Date Sort User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&sortBy=created',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should support sorting by date updated', async () => {
      const user = mockData.createUser({
        email: 'updatedsort@example.com',
        password: 'SecurePass123',
        name: 'Updated Sort User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&sortBy=updated',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should support ascending order', async () => {
      const user = mockData.createUser({
        email: 'asc@example.com',
        password: 'SecurePass123',
        name: 'Ascending User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&sortBy=created&order=asc',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should support descending order', async () => {
      const user = mockData.createUser({
        email: 'desc@example.com',
        password: 'SecurePass123',
        name: 'Descending User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&sortBy=created&order=desc',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should support sorting by custom fields', async () => {
      const user = mockData.createUser({
        email: 'customsort@example.com',
        password: 'SecurePass123',
        name: 'Custom Sort User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test&sortBy=priority&order=desc',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/search/advanced - Search Result Format', () => {
    it('should return properly formatted search results', async () => {
      const user = mockData.createUser({
        email: 'resultformat@example.com',
        password: 'SecurePass123',
        name: 'Result Format User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      if (data.data.results.length > 0) {
        const result = data.data.results[0]
        expect(result).toHaveProperty('id')
        expect(result).toHaveProperty('type')
        expect(result).toHaveProperty('title')
        expect(result).toHaveProperty('snippet')
        expect(result).toHaveProperty('relevance')
      }
    })

    it('should include highlighting in snippets', async () => {
      const user = mockData.createUser({
        email: 'highlighting@example.com',
        password: 'SecurePass123',
        name: 'Highlighting User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=bug',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      if (data.data.results.length > 0) {
        const result = data.data.results[0]
        // Snippets should contain <mark> tags for highlighting
        if (result.snippet) {
          expect(result.snippet).toMatch(/<mark>|<strong>/)
        }
      }
    })

    it('should include relevance scores', async () => {
      const user = mockData.createUser({
        email: 'relevance@example.com',
        password: 'SecurePass123',
        name: 'Relevance User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)

      if (data.data.results.length > 0) {
        data.data.results.forEach((result: any) => {
          expect(result).toHaveProperty('relevance')
          expect(typeof result.relevance).toBe('number')
          expect(result.relevance).toBeGreaterThanOrEqual(0)
          expect(result.relevance).toBeLessThanOrEqual(1)
        })
      }
    })
  })

  describe('GET /api/search/advanced - Edge Cases', () => {
    it('should handle special characters in query', async () => {
      const user = mockData.createUser({
        email: 'specialchars@example.com',
        password: 'SecurePass123',
        name: 'Special Chars User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=C%2B%2B+OR+java%23',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle very long queries', async () => {
      const user = mockData.createUser({
        email: 'longquery@example.com',
        password: 'SecurePass123',
        name: 'Long Query User',
      })

      const longQuery = 'test '.repeat(100)

      const response = await fetch(
        `http://localhost:3000/api/search/advanced?q=${encodeURIComponent(longQuery)}`,
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      // Either 200 (handled) or 400 (query too long)
      expect([200, 400]).toContain(response.status)
    })

    it('should handle empty results gracefully', async () => {
      const user = mockData.createUser({
        email: 'emptyresults@example.com',
        password: 'SecurePass123',
        name: 'Empty Results User',
      })

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=nonexistentuniquequery12345',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.results).toEqual([])
      expect(data.data.total).toBe(0)
      expect(data.data.hasMore).toBe(false)
    })

    it('should require authentication for advanced search', async () => {
      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test',
        {
          method: 'GET',
        }
      )

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/search/advanced - Performance', () => {
    it('should respond within reasonable time for simple queries', async () => {
      const user = mockData.createUser({
        email: 'performancesimple@example.com',
        password: 'SecurePass123',
        name: 'Performance Simple User',
      })

      const startTime = Date.now()

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=test',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const endTime = Date.now()
      const duration = endTime - startTime

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Should respond within 5 seconds
      expect(duration).toBeLessThan(5000)
    })

    it('should respond within reasonable time for complex queries', async () => {
      const user = mockData.createUser({
        email: 'performancecomplex@example.com',
        password: 'SecurePass123',
        name: 'Performance Complex User',
      })

      const startTime = Date.now()

      const response = await fetch(
        'http://localhost:3000/api/search/advanced?q=(login+OR+auth)+AND+bug+-fixed+priority:high+status:open',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const endTime = Date.now()
      const duration = endTime - startTime

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Should respond within 10 seconds for complex query
      expect(duration).toBeLessThan(10000)
    })
  })
})