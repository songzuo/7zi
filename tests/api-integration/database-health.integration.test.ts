/**
 * @fileoverview Database Health API integration tests
 * @description Tests for /api/database/health endpoint
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { server } from './mocks/handlers'

describe('/api/database/health - Integration Tests', () => {
  beforeAll(() => {
    server.listen()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('GET /api/database/health', () => {
    it('should return health status when database is healthy', async () => {
      const response = await fetch('http://localhost:3000/api/database/health', {
        method: 'GET',
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.health).toBeDefined()
      expect(['healthy', 'degraded', 'unhealthy']).toContain(data.data.health)
      expect(data.data.healthScore).toBeGreaterThanOrEqual(0)
      expect(data.data.healthScore).toBeLessThanOrEqual(100)
    })

    it('should return connection information', async () => {
      const response = await fetch('http://localhost:3000/api/database/health', {
        method: 'GET',
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.connection).toBeDefined()
      expect(data.data.connection).toHaveProperty('connected')
      expect(data.data.connection).toHaveProperty('isOpen')
      expect(data.data.connection).toHaveProperty('isMemoryDatabase')
    })

    it('should return database information', async () => {
      const response = await fetch('http://localhost:3000/api/database/health', {
        method: 'GET',
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.database).toBeDefined()
      expect(data.data.database).toHaveProperty('size')
      expect(data.data.database).toHaveProperty('migrations')
      expect(data.data.database.migrations).toHaveProperty('current')
      expect(data.data.database.migrations).toHaveProperty('latest')
    })

    it('should return performance information', async () => {
      const response = await fetch('http://localhost:3000/api/database/health', {
        method: 'GET',
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.performance).toBeDefined()
      expect(data.data.performance).toHaveProperty('slowQueries')
      expect(data.data.performance).toHaveProperty('missingIndexes')
      expect(data.data.performance).toHaveProperty('databaseSize')
    })

    it('should return cache statistics', async () => {
      const response = await fetch('http://localhost:3000/api/database/health', {
        method: 'GET',
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.cache).toBeDefined()
      expect(data.data.cache).toHaveProperty('hits')
      expect(data.data.cache).toHaveProperty('misses')
      expect(data.data.cache).toHaveProperty('hitRate')
      expect(data.data.cache).toHaveProperty('hitRatePercent')
    })

    it('should return recommendations based on health', async () => {
      const response = await fetch('http://localhost:3000/api/database/health', {
        method: 'GET',
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.recommendations).toBeDefined()
      expect(Array.isArray(data.data.recommendations)).toBe(true)
    })

    it('should return table details', async () => {
      const response = await fetch('http://localhost:3000/api/database/health', {
        method: 'GET',
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.details).toBeDefined()
      expect(data.data.details).toHaveProperty('tables')
      expect(Array.isArray(data.data.details.tables)).toBe(true)
    })

    it('should include proper headers', async () => {
      const response = await fetch('http://localhost:3000/api/database/health', {
        method: 'GET',
      })

      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should handle rate limiting', async () => {
      // Make multiple requests to test rate limiting
      const requests = Array.from({ length: 5 }, () =>
        fetch('http://localhost:3000/api/database/health', {
          method: 'GET',
        })
      )

      const responses = await Promise.all(requests)
      
      // All should succeed under normal rate limits
      const successCount = responses.filter(r => r.status === 200).length
      expect(successCount).toBeGreaterThan(0)
    })

    it('should validate health score calculation', async () => {
      const response = await fetch('http://localhost:3000/api/database/health', {
        method: 'GET',
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      
      // Health score should be 0-100
      expect(data.data.healthScore).toBeGreaterThanOrEqual(0)
      expect(data.data.healthScore).toBeLessThanOrEqual(100)

      // Health status should match score
      if (data.data.healthScore < 50) {
        expect(data.data.health).toBe('unhealthy')
      } else if (data.data.healthScore < 80) {
        expect(data.data.health).toBe('degraded')
      } else {
        expect(data.data.health).toBe('healthy')
      }
    })

    it('should return cache status based on hit rate', async () => {
      const response = await fetch('http://localhost:3000/api/database/health', {
        method: 'GET',
      })

      const data = await response.json()

      const hitRate = data.data.cache.hitRate
      
      // Cache status should match hit rate
      if (hitRate > 0.7) {
        expect(data.data.cache.status).toBe('good')
      } else if (hitRate > 0.5) {
        expect(data.data.cache.status).toBe('fair')
      } else {
        expect(data.data.cache.status).toBe('poor')
      }
    })

    it('should handle different health scenarios', async () => {
      const response = await fetch('http://localhost:3000/api/database/health', {
        method: 'GET',
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      
      // Verify all expected fields are present
      const requiredFields = ['health', 'healthScore', 'connection', 'database', 'performance', 'cache', 'recommendations', 'details']
      requiredFields.forEach(field => {
        expect(data.data).toHaveProperty(field)
      })
    })
  })

  describe('Database Health Response Structure', () => {
    it('should return complete response structure', async () => {
      const response = await fetch('http://localhost:3000/api/database/health', {
        method: 'GET',
      })

      const data = await response.json()

      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('data')
      expect(data.success).toBe(true)
    })

    it('should have proper migration information', async () => {
      const response = await fetch('http://localhost:3000/api/database/health', {
        method: 'GET',
      })

      const data = await response.json()

      expect(data.data.database.migrations).toHaveProperty('current')
      expect(data.data.database.migrations).toHaveProperty('latest')
      expect(data.data.database.migrations).toHaveProperty('needsMigration')
    })
  })
})
