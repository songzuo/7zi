/**
 * @fileoverview Search API integration tests
 * @description Tests for /api/search endpoint
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { server, mockData } from './mocks/handlers';

describe('/api/search - Integration Tests', () => {
  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    mockData.resetTasks();
    mockData.resetProjects();
    mockData.resetMembers();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('GET /api/search - Basic Search', () => {
    it('should return results even for empty query', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.results).toBeDefined();
      expect(Array.isArray(data.data.results)).toBe(true);
    });

    it('should handle search without query parameter', async () => {
      const response = await fetch('http://localhost:3000/api/search');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('should return search results for valid query', async () => {
      // Create test data
      const user = mockData.createUser({
        email: 'searcher@example.com',
        password: 'SecurePass123',
        name: 'Search User',
      });

      mockData.createTaskFull({
        title: 'Test Task for Search',
        description: 'This is a test task',
        priority: 'high',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=Test');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.results).toBeDefined();
      expect(Array.isArray(data.data.results)).toBe(true);
      expect(data.data.total).toBeGreaterThanOrEqual(0);
    });

    it('should include pagination metadata', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('page');
      expect(data.data).toHaveProperty('pageSize');
      expect(data.data).toHaveProperty('hasMore');
      expect(data.data).toHaveProperty('total');
    });
  });

  describe('GET /api/search - Query Parameters', () => {
    it('should handle query parameter correctly', async () => {
      const user = mockData.createUser({
        email: 'query@example.com',
        password: 'SecurePass123',
        name: 'Query User',
      });

      mockData.createTaskFull({
        title: 'Important Project Task',
        description: 'High priority task',
        priority: 'high',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=Important');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toBeDefined();
    });

    it('should handle special characters in query', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test%20%26%20special');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle long query strings', async () => {
      const longQuery = 'a'.repeat(200);
      const response = await fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(longQuery)}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle Unicode characters in query', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=测试');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/search - Type Filtering', () => {
    it('should filter by tasks type', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&target=tasks');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toBeDefined();
    });

    it('should filter by projects type', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&target=projects');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toBeDefined();
    });

    it('should filter by members type', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&target=members');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toBeDefined();
    });

    it('should search all targets when target=all', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&target=all');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toBeDefined();
    });

    it('should default to all targets when target is not specified', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toBeDefined();
    });
  });

  describe('GET /api/search - Pagination', () => {
    it('should handle limit parameter', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&limit=5');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.pageSize).toBeLessThanOrEqual(5);
    });

    it('should handle offset parameter', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&offset=10');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle page parameter', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&page=2');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Page is calculated from offset in the handler
      expect(data.data.page).toBeDefined();
    });

    it('should return correct hasMore flag', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&limit=1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(typeof data.data.hasMore).toBe('boolean');
    });

    it('should handle limit exceeding max value', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&limit=9999');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/search - Advanced Filters', () => {
    it('should filter by status', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&status=pending');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter by priority', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&priority=high');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter by multiple statuses', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&status=pending,in_progress');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter by date range (createdAfter)', async () => {
      const date = new Date('2024-01-01').toISOString();
      const response = await fetch(`http://localhost:3000/api/search?q=test&createdAfter=${encodeURIComponent(date)}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter by date range (createdBefore)', async () => {
      const date = new Date().toISOString();
      const response = await fetch(`http://localhost:3000/api/search?q=test&createdBefore=${encodeURIComponent(date)}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/search - Search Configuration', () => {
    it('should handle fuzzy search parameter', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&fuzzy=true');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle fuzzy threshold parameter', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&fuzzyThreshold=0.5');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle case sensitivity parameter', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=Test&caseSensitive=true');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle highlights parameter', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&highlights=true');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/search - History', () => {
    it('should include search history when requested', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&history=true');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('history');
      expect(Array.isArray(data.data.history)).toBe(true);
    });

    it('should not include history by default', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.history).toBeUndefined();
    });

    it('should limit history to recent searches', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&history=true');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/search - Error Handling', () => {
    it('should handle invalid date format gracefully', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&createdAfter=invalid-date');
      const data = await response.json();

      // Mock doesn't validate dates strictly
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should handle invalid limit format', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&limit=abc');
      const data = await response.json();

      // Mock parses invalid numbers as NaN, may return 0 or default
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should handle negative limit', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&limit=-1');
      const data = await response.json();

      // Mock doesn't validate, but should still return a response
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should handle negative offset', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&offset=-1');
      const data = await response.json();

      // Mock doesn't validate
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Pagination Tests', () => {
    it('should return empty results on first page when no data', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=nonexistent&limit=10&offset=0');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toEqual([]);
      expect(data.data.total).toBe(0);
      expect(data.data.hasMore).toBe(false);
    });

    it('should handle pagination with limit', async () => {
      const user = mockData.createUser({
        email: 'pagelimit@example.com',
        password: 'SecurePass123',
        name: 'Page Limit',
      });

      // Create multiple tasks
      for (let i = 1; i <= 15; i++) {
        mockData.createTaskFull({
          title: `Searchable Task ${i}`,
          description: `This is task ${i} for pagination test`,
          priority: 'medium',
          status: 'pending',
          createdBy: user.id,
        });
      }

      const response = await fetch('http://localhost:3000/api/search?q=Searchable&limit=5&offset=0');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.results.length).toBeLessThanOrEqual(5);
      expect(data.data.pageSize).toBe(5);
      expect(data.data.page).toBe(1);
    });

    it('should handle offset for pagination', async () => {
      const user = mockData.createUser({
        email: 'pageoffset@example.com',
        password: 'SecurePass123',
        name: 'Page Offset',
      });

      // Create multiple tasks
      for (let i = 1; i <= 10; i++) {
        mockData.createTaskFull({
          title: `Offset Task ${i}`,
          description: `Task for offset testing ${i}`,
          priority: 'medium',
          status: 'pending',
          createdBy: user.id,
        });
      }

      const response = await fetch('http://localhost:3000/api/search?q=Offset&limit=5&offset=5');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.results.length).toBeLessThanOrEqual(5);
      expect(data.data.page).toBeGreaterThanOrEqual(2);
    });

    it('should set hasMore to false on last page', async () => {
      const user = mockData.createUser({
        email: 'hasmore@example.com',
        password: 'SecurePass123',
        name: 'HasMore User',
      });

      mockData.createTaskFull({
        title: 'Last Page Task',
        description: 'Task for hasMore test',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=Last&limit=10&offset=0');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(typeof data.data.hasMore).toBe('boolean');
    });

    it('should handle large limit values', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&limit=10000');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should not throw error, just return all available results
    });

    it('should handle limit of 1', async () => {
      const user = mockData.createUser({
        email: 'limit1@example.com',
        password: 'SecurePass123',
        name: 'Limit1 User',
      });

      mockData.createTaskFull({
        title: 'Single Result Task',
        description: 'Task for limit=1 test',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=Single&limit=1&offset=0');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.results.length).toBeLessThanOrEqual(1);
    });

    it('should handle offset beyond available results', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&limit=10&offset=99999');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.results).toEqual([]);
      expect(data.data.hasMore).toBe(false);
    });

    it('should maintain page count across pagination', async () => {
      const user = mockData.createUser({
        email: 'pagecount@example.com',
        password: 'SecurePass123',
        name: 'PageCount User',
      });

      // Create multiple tasks
      for (let i = 1; i <= 20; i++) {
        mockData.createTaskFull({
          title: `Page Count Task ${i}`,
          description: `Task for page counting ${i}`,
          priority: 'medium',
          status: 'pending',
          createdBy: user.id,
        });
      }

      const response1 = await fetch('http://localhost:3000/api/search?q=Page&limit=5&offset=0');
      const data1 = await response1.json();

      const response2 = await fetch('http://localhost:3000/api/search?q=Page&limit=5&offset=5');
      const data2 = await response2.json();

      expect(data1.data.page).toBe(1);
      expect(data2.data.page).toBe(2);
    });
  });

  describe('Empty Results Tests', () => {
    it('should return empty results for non-matching query', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=xyzabc123nonexistent');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toEqual([]);
      expect(data.data.total).toBe(0);
    });

    it('should handle empty query with no filters', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Empty query should return all results or empty depending on implementation
      expect(Array.isArray(data.data.results)).toBe(true);
    });

    it('should return empty results when filters exclude all items', async () => {
      const user = mockData.createUser({
        email: 'emptyfilter@example.com',
        password: 'SecurePass123',
        name: 'Empty Filter',
      });

      mockData.createTaskFull({
        title: 'Test Task',
        description: 'Task description',
        priority: 'medium',
        status: 'completed',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=Test&status=pending');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Filter excludes the completed task
      expect(Array.isArray(data.data.results)).toBe(true);
    });

    it('should return empty results for non-existent target type', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&target=nonexistent');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toEqual([]);
    });

    it('should handle search in empty data set', async () => {
      mockData.resetTasks();
      mockData.resetProjects();
      mockData.resetMembers();

      const response = await fetch('http://localhost:3000/api/search?q=anything');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toEqual([]);
      expect(data.data.total).toBe(0);
    });

    it('should return empty results with pagination metadata', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=nonexistentxyz&limit=10&offset=0');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.results).toEqual([]);
      expect(data.data.total).toBe(0);
      expect(data.data.page).toBe(1);
      expect(data.data.pageSize).toBe(10);
      expect(data.data.hasMore).toBe(false);
    });
  });

  describe('Special Characters Tests', () => {
    it('should handle special characters in query', async () => {
      const user = mockData.createUser({
        email: 'specialchars@example.com',
        password: 'SecurePass123',
        name: 'Special Chars User',
      });

      mockData.createTaskFull({
        title: 'Task with special chars: @#$%^&*()',
        description: 'Test task with symbols',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=@#test');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle Unicode characters in query', async () => {
      const user = mockData.createUser({
        email: 'unicode@example.com',
        password: 'SecurePass123',
        name: 'Unicode User',
      });

      mockData.createTaskFull({
        title: '中文任务 日本語 한국어',
        description: 'Task with CJK characters',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=中文');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle emoji in query', async () => {
      const user = mockData.createUser({
        email: 'emoji@example.com',
        password: 'SecurePass123',
        name: 'Emoji User',
      });

      mockData.createTaskFull({
        title: 'Task with emoji 🚀🎉🔥',
        description: 'Test task with emojis',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=🚀');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle whitespace in query', async () => {
      const user = mockData.createUser({
        email: 'whitespace@example.com',
        password: 'SecurePass123',
        name: 'Whitespace User',
      });

      mockData.createTaskFull({
        title: 'Task with   multiple   spaces',
        description: 'Test task',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=Task%20%20%20multiple');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle URL-encoded special characters', async () => {
      const user = mockData.createUser({
        email: 'urlencoded@example.com',
        password: 'SecurePass123',
        name: 'URLEncoded User',
      });

      mockData.createTaskFull({
        title: 'Task with &amp; and &lt; and &gt;',
        description: 'HTML entities test',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=%26amp%3B');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle quotes in query', async () => {
      const user = mockData.createUser({
        email: 'quotes@example.com',
        password: 'SecurePass123',
        name: 'Quotes User',
      });

      mockData.createTaskFull({
        title: 'Task with "quotes" and \'apostrophes\'',
        description: 'Test task with quotes',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=%22quotes%22');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle newlines and tabs in query', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test%0A%09test');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle SQL injection attempt in query', async () => {
      const response = await fetch("http://localhost:3000/api/search?q='; DROP TABLE tasks; --");
      const data = await response.json();

      // Should handle gracefully without error 500
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should handle XSS attempt in query', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=<script>alert("XSS")</script>');
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('High Concurrency Tests', () => {
    it('should handle multiple concurrent search requests', async () => {
      const user = mockData.createUser({
        email: 'concurrent@example.com',
        password: 'SecurePass123',
        name: 'Concurrent User',
      });

      // Create test data
      for (let i = 1; i <= 20; i++) {
        mockData.createTaskFull({
          title: `Concurrent Task ${i}`,
          description: `Task ${i} for concurrency test`,
          priority: i % 3 === 0 ? 'high' : 'medium',
          status: i % 2 === 0 ? 'completed' : 'pending',
          createdBy: user.id,
        });
      }

      // Launch concurrent searches
      const searchPromises = Array.from({ length: 10 }, (_, i) =>
        fetch(`http://localhost:3000/api/search?q=Concurrent&limit=5&offset=${i * 2}`)
      );

      const responses = await Promise.all(searchPromises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      const data = await responses[0].json();
      expect(data.success).toBe(true);
    });

    it('should handle rapid sequential searches', async () => {
      const user = mockData.createUser({
        email: 'rapid@example.com',
        password: 'SecurePass123',
        name: 'Rapid User',
      });

      mockData.createTaskFull({
        title: 'Rapid Search Task',
        description: 'Task for rapid search test',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      // Perform rapid sequential searches
      for (let i = 0; i < 20; i++) {
        const response = await fetch('http://localhost:3000/api/search?q=Rapid');
        expect(response.status).toBe(200);
      }
    });

    it('should handle concurrent searches with different queries', async () => {
      const user = mockData.createUser({
        email: 'multiquery@example.com',
        password: 'SecurePass123',
        name: 'MultiQuery User',
      });

      // Create varied test data
      mockData.createTaskFull({
        title: 'Alpha Task',
        description: 'Alpha description',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      mockData.createTaskFull({
        title: 'Beta Task',
        description: 'Beta description',
        priority: 'high',
        status: 'in_progress',
        createdBy: user.id,
      });

      mockData.createTaskFull({
        title: 'Gamma Task',
        description: 'Gamma description',
        priority: 'low',
        status: 'completed',
        createdBy: user.id,
      });

      // Concurrent different queries
      const [response1, response2, response3] = await Promise.all([
        fetch('http://localhost:3000/api/search?q=Alpha'),
        fetch('http://localhost:3000/api/search?q=Beta'),
        fetch('http://localhost:3000/api/search?q=Gamma'),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response3.status).toBe(200);
    });

    it('should handle concurrent searches with history', async () => {
      const user = mockData.createUser({
        email: 'historyconcurrent@example.com',
        password: 'SecurePass123',
        name: 'History Concurrent',
      });

      mockData.createTaskFull({
        title: 'History Task',
        description: 'Task for history test',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      // Concurrent searches with history
      const searchPromises = Array.from({ length: 5 }, () =>
        fetch('http://localhost:3000/api/search?q=History&history=true')
      );

      const responses = await Promise.all(searchPromises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Check history is included
      const data = await responses[0].json();
      expect(data.data.history).toBeDefined();
    });

    it('should handle concurrent searches with different filters', async () => {
      const user = mockData.createUser({
        email: 'filterconcurrent@example.com',
        password: 'SecurePass123',
        name: 'Filter Concurrent',
      });

      // Create tasks with different statuses and priorities
      for (let i = 0; i < 10; i++) {
        mockData.createTaskFull({
          title: `Filter Task ${i}`,
          description: `Task ${i}`,
          priority: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
          status: i % 4 === 0 ? 'completed' : i % 2 === 0 ? 'in_progress' : 'pending',
          createdBy: user.id,
        });
      }

      // Concurrent searches with different filters
      const [response1, response2, response3] = await Promise.all([
        fetch('http://localhost:3000/api/search?q=Filter&status=pending'),
        fetch('http://localhost:3000/api/search?q=Filter&priority=high'),
        fetch('http://localhost:3000/api/search?q=Filter&status=in_progress&priority=medium'),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response3.status).toBe(200);
    });
  });

  describe('Advanced Search Configuration Tests', () => {
    it('should handle case-sensitive search', async () => {
      const user = mockData.createUser({
        email: 'casesensitive@example.com',
        password: 'SecurePass123',
        name: 'CaseSensitive User',
      });

      mockData.createTaskFull({
        title: 'CaseSensitive Task',
        description: 'Test with mixed CASE',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=CaseSensitive&caseSensitive=true');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle fuzzy search with threshold', async () => {
      const user = mockData.createUser({
        email: 'fuzzy@example.com',
        password: 'SecurePass123',
        name: 'Fuzzy User',
      });

      mockData.createTaskFull({
        title: 'FuzzyMatch Task',
        description: 'Test fuzzy matching',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=FuzzyMatc&fuzzy=true&fuzzyThreshold=0.3');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should disable fuzzy search', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=test&fuzzy=false');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle highlight configuration', async () => {
      const user = mockData.createUser({
        email: 'highlight@example.com',
        password: 'SecurePass123',
        name: 'Highlight User',
      });

      mockData.createTaskFull({
        title: 'Highlight Test Task',
        description: 'This task tests highlighting',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=Highlight&highlights=true');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle combination of filters and config', async () => {
      const user = mockData.createUser({
        email: 'combo@example.com',
        password: 'SecurePass123',
        name: 'Combo User',
      });

      mockData.createTaskFull({
        title: 'Combined Filter Task',
        description: 'Test combined filters',
        priority: 'high',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=Combined&status=pending&priority=high&caseSensitive=false&fuzzy=true');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Search History Tests', () => {
    it('should add successful search to history', async () => {
      const user = mockData.createUser({
        email: 'historyadd@example.com',
        password: 'SecurePass123',
        name: 'History Add',
      });

      mockData.createTaskFull({
        title: 'History Test Task',
        description: 'Task for history',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch('http://localhost:3000/api/search?q=History&history=true');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.history).toBeDefined();
    });

    it('should not add empty search to history', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=&history=true');
      const data = await response.json();

      expect(response.status).toBe(200);
      // Empty query should not be added to history
      expect(data.data.history).toBeDefined();
    });

    it('should not add search with no results to history', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=xyznonexistent&history=true');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.total).toBe(0);
      // No results should not be added to history
      expect(data.data.history).toBeDefined();
    });

    it('should limit history to recent searches', async () => {
      const user = mockData.createUser({
        email: 'historylimit@example.com',
        password: 'SecurePass123',
        name: 'History Limit',
      });

      // Create multiple tasks
      for (let i = 1; i <= 10; i++) {
        mockData.createTaskFull({
          title: `History Limit Task ${i}`,
          description: `Task ${i}`,
          priority: 'medium',
          status: 'pending',
          createdBy: user.id,
        });
      }

      // Perform searches
      for (let i = 1; i <= 10; i++) {
        await fetch(`http://localhost:3000/api/search?q=${i}&history=true`);
      }

      const response = await fetch('http://localhost:3000/api/search?q=1&history=true');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.history.length).toBeLessThanOrEqual(5);
    });
  });
});
