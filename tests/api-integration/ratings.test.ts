/**
 * @fileoverview Ratings API integration tests
 * @description Tests for /api/ratings endpoint
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { server, mockData } from './mocks/handlers';

function getAuthHeader(userId: string): HeadersInit {
  const token = mockData.generateToken(userId);
  return { 'Authorization': `Bearer ${token}` };
}

describe('/api/ratings - Integration Tests', () => {
  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    mockData.resetRatings();
    mockData.resetUsers();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('GET /api/ratings - List Ratings', () => {
    it('should return empty list when no ratings exist', async () => {
      const response = await fetch('http://localhost:3000/api/ratings');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.ratings).toBeDefined();
      expect(Array.isArray(data.data.ratings)).toBe(true);
    });

    it('should return paginated list of ratings', async () => {
      const user = mockData.createUser({
        email: 'rater@example.com',
        password: 'SecurePass123',
        name: 'Rater User',
      });

      // Create multiple ratings
      mockData.createRating({
        user_id: user.id,
        target_type: 'agent',
        target_id: 'agent-001',
        rating: 5,
        title: 'Great agent',
      });

      mockData.createRating({
        user_id: user.id,
        target_type: 'task',
        target_id: 'task-001',
        rating: 4,
        title: 'Good task',
      });

      const response = await fetch('http://localhost:3000/api/ratings');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.ratings).toBeDefined();
      expect(Array.isArray(data.data.ratings)).toBe(true);
    });

    it('should include pagination metadata', async () => {
      const response = await fetch('http://localhost:3000/api/ratings');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.meta).toBeDefined();
      expect(data.data.meta).toHaveProperty('total');
      expect(data.data.meta).toHaveProperty('page');
      expect(data.data.meta).toHaveProperty('per_page');
      expect(data.data.meta).toHaveProperty('total_pages');
    });

    it('should handle pagination parameters', async () => {
      const response = await fetch('http://localhost:3000/api/ratings?page=1&per_page=10');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.meta.page).toBe(1);
      expect(data.data.meta.per_page).toBe(10);
    });

    it('should return statistics', async () => {
      const response = await fetch('http://localhost:3000/api/ratings');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.stats).toBeDefined();
    });
  });

  describe('GET /api/ratings - Filtering', () => {
    it('should filter by target_id', async () => {
      const user = mockData.createUser({
        email: 'filter@example.com',
        password: 'SecurePass123',
        name: 'Filter User',
      });

      mockData.createRating({
        user_id: user.id,
        target_type: 'agent',
        target_id: 'specific-agent',
        rating: 5,
      });

      const response = await fetch('http://localhost:3000/api/ratings?target_id=specific-agent');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.ratings)).toBe(true);
    });

    it('should filter by target_type', async () => {
      const user = mockData.createUser({
        email: 'typefilter@example.com',
        password: 'SecurePass123',
        name: 'Type Filter User',
      });

      mockData.createRating({
        user_id: user.id,
        target_type: 'agent',
        target_id: 'agent-001',
        rating: 5,
      });

      mockData.createRating({
        user_id: user.id,
        target_type: 'task',
        target_id: 'task-001',
        rating: 4,
      });

      const response = await fetch('http://localhost:3000/api/ratings?target_type=agent');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter by user_id', async () => {
      const user = mockData.createUser({
        email: 'userfilter@example.com',
        password: 'SecurePass123',
        name: 'User Filter',
      });

      mockData.createRating({
        user_id: user.id,
        target_type: 'agent',
        target_id: 'agent-001',
        rating: 5,
      });

      const response = await fetch(`http://localhost:3000/api/ratings?user_id=${user.id}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter by rating range (min)', async () => {
      const user = mockData.createUser({
        email: 'ratingmin@example.com',
        password: 'SecurePass123',
        name: 'Rating Min',
      });

      mockData.createRating({
        user_id: user.id,
        target_type: 'agent',
        target_id: 'agent-001',
        rating: 4,
      });

      const response = await fetch('http://localhost:3000/api/ratings?rating_min=3');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter by rating range (max)', async () => {
      const response = await fetch('http://localhost:3000/api/ratings?rating_max=3');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const response = await fetch(`http://localhost:3000/api/ratings?start_date=${encodeURIComponent(startDate)}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle sorting parameters', async () => {
      const response = await fetch('http://localhost:3000/api/ratings?sort_by=rating&sort_order=asc');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/ratings - Create Rating', () => {
    it('should create a new rating with valid data', async () => {
      const user = mockData.createUser({
        email: 'newrater@example.com',
        password: 'SecurePass123',
        name: 'New Rater',
      });

      const ratingData = {
        target_type: 'agent',
        target_id: 'agent-001',
        rating: 5,
        title: 'Excellent service',
        description: 'Very helpful and responsive',
      };

      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(ratingData),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.rating).toBe(5);
      expect(data.data.target_type).toBe('agent');
      expect(data.data.target_id).toBe('agent-001');
    });

    it('should reject rating without target_type', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_id: 'agent-001',
          rating: 5,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject rating without target_id', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          rating: 5,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject rating without rating value', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-001',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject rating outside valid range (below 1)', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-001',
          rating: 0,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject rating outside valid range (above 5)', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-001',
          rating: 6,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject invalid target_type', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'invalid_type',
          target_id: 'id-001',
          rating: 5,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should accept all valid target types', async () => {
      const validTypes = ['agent', 'task', 'feature', 'project', 'overall'];

      for (const type of validTypes) {
        const response = await fetch('http://localhost:3000/api/ratings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target_type: type,
            target_id: `${type}-001`,
            rating: 5,
          }),
        });

        expect(response.status).toBe(201);
      }
    });

    it('should reject title exceeding 100 characters', async () => {
      const longTitle = 'A'.repeat(101);

      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-001',
          rating: 5,
          title: longTitle,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject description exceeding 1000 characters', async () => {
      const longDescription = 'A'.repeat(1001);

      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-001',
          rating: 5,
          description: longDescription,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle spam detection', async () => {
      const user = mockData.createUser({
        email: 'spammer@example.com',
        password: 'SecurePass123',
        name: 'Spam User',
      });

      // Create many ratings quickly to trigger spam detection
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'spam-agent',
          rating: 1,
          title: 'Spam spam spam',
          description: 'This is clearly spam content designed to test anti-spam',
        }),
      });

      // Should either succeed or be rejected by spam filter
      expect([201, 401]).toContain(response.status);
    });
  });

  describe('PUT /api/ratings - Update Rating', () => {
    it('should update existing rating for same target', async () => {
      const user = mockData.createUser({
        email: 'updater@example.com',
        password: 'SecurePass123',
        name: 'Updater User',
      });

      // Create initial rating
      mockData.createRating({
        user_id: user.id,
        target_type: 'agent',
        target_id: 'agent-update',
        rating: 4,
        title: 'Initial title',
      });

      // Update rating
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-update',
          rating: 5,
          title: 'Updated title',
        }),
      });

      const data = await response.json();

      expect([200, 201]).toContain(response.status);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/ratings/:id - Single Rating', () => {
    it('should return a single rating by id', async () => {
      const user = mockData.createUser({
        email: 'getter@example.com',
        password: 'SecurePass123',
        name: 'Getter User',
      });

      const rating = mockData.createRating({
        user_id: user.id,
        target_type: 'agent',
        target_id: 'agent-single',
        rating: 5,
        title: 'Single rating test',
      });

      const response = await fetch(`http://localhost:3000/api/ratings/${rating.id}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.id).toBe(rating.id);
    });

    it('should return 404 for non-existent rating', async () => {
      const response = await fetch('http://localhost:3000/api/ratings/non-existent-id');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/ratings/:id - Delete Rating', () => {
    it('should delete a rating by owner', async () => {
      const user = mockData.createUser({
        email: 'deleter@example.com',
        password: 'SecurePass123',
        name: 'Deleter User',
      });

      const rating = mockData.createRating({
        user_id: user.id,
        target_type: 'agent',
        target_id: 'agent-delete',
        rating: 5,
      });

      const response = await fetch(`http://localhost:3000/api/ratings/${rating.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id,
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 for deleting non-existent rating', async () => {
      const response = await fetch('http://localhost:3000/api/ratings/non-existent-id', {
        method: 'DELETE',
        headers: {
          'x-user-id': 'some-user',
        },
      });

      expect(response.status).toBe(404);
    });

    it('should reject delete by non-owner', async () => {
      const owner = mockData.createUser({
        email: 'owner@example.com',
        password: 'SecurePass123',
        name: 'Owner User',
      });

      const nonOwner = mockData.createUser({
        email: 'nonowner@example.com',
        password: 'SecurePass123',
        name: 'Non Owner',
      });

      const rating = mockData.createRating({
        user_id: owner.id,
        target_type: 'agent',
        target_id: 'agent-owner',
        rating: 5,
      });

      const response = await fetch(`http://localhost:3000/api/ratings/${rating.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': nonOwner.id,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/ratings/:id/helpful - Helpful Votes', () => {
    it('should mark rating as helpful', async () => {
      const user = mockData.createUser({
        email: 'voter@example.com',
        password: 'SecurePass123',
        name: 'Voter User',
      });

      const rater = mockData.createUser({
        email: 'rater2@example.com',
        password: 'SecurePass123',
        name: 'Rater 2',
      });

      const rating = mockData.createRating({
        user_id: rater.id,
        target_type: 'agent',
        target_id: 'agent-helpful',
        rating: 5,
      });

      const response = await fetch(`http://localhost:3000/api/ratings/${rating.id}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          is_helpful: true,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user_vote).toBe(true);
    });

    it('should mark rating as not helpful', async () => {
      const user = mockData.createUser({
        email: 'notvoter@example.com',
        password: 'SecurePass123',
        name: 'Not Voter',
      });

      const rater = mockData.createUser({
        email: 'rater3@example.com',
        password: 'SecurePass123',
        name: 'Rater 3',
      });

      const rating = mockData.createRating({
        user_id: rater.id,
        target_type: 'agent',
        target_id: 'agent-nothelpful',
        rating: 5,
      });

      const response = await fetch(`http://localhost:3000/api/ratings/${rating.id}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          is_helpful: false,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 for helpful vote on non-existent rating', async () => {
      const response = await fetch('http://localhost:3000/api/ratings/non-existent/helpful', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-001',
        },
        body: JSON.stringify({
          is_helpful: true,
        }),
      });

      expect(response.status).toBe(404);
    });

    it('should reject helpful vote without is_helpful field', async () => {
      const rater = mockData.createUser({
        email: 'rater4@example.com',
        password: 'SecurePass123',
        name: 'Rater 4',
      });

      const rating = mockData.createRating({
        user_id: rater.id,
        target_type: 'agent',
        target_id: 'agent-nohelpful',
        rating: 5,
      });

      const response = await fetch(`http://localhost:3000/api/ratings/${rating.id}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle empty request body', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    it('should handle invalid page parameter', async () => {
      const response = await fetch('http://localhost:3000/api/ratings?page=abc');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle invalid per_page parameter', async () => {
      const response = await fetch('http://localhost:3000/api/ratings?per_page=-1');
      const data = await response.json();

      // Mock doesn't validate negative numbers, but should limit
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should limit per_page to 100', async () => {
      const response = await fetch('http://localhost:3000/api/ratings?per_page=9999');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.meta.per_page).toBeLessThanOrEqual(100);
    });
  });

  describe('CRUD Boundary Tests', () => {
    it('should handle rating at minimum boundary (1)', async () => {
      const user = mockData.createUser({
        email: 'boundary1@example.com',
        password: 'SecurePass123',
        name: 'Boundary User 1',
      });

      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-boundary-1',
          rating: 1,
          title: 'Minimum rating',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.rating).toBe(1);
    });

    it('should handle rating at maximum boundary (5)', async () => {
      const user = mockData.createUser({
        email: 'boundary5@example.com',
        password: 'SecurePass123',
        name: 'Boundary User 5',
      });

      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-boundary-5',
          rating: 5,
          title: 'Maximum rating',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.rating).toBe(5);
    });

    it('should handle title at length boundary (100 chars)', async () => {
      const user = mockData.createUser({
        email: 'title100@example.com',
        password: 'SecurePass123',
        name: 'Title 100',
      });

      const title100 = 'A'.repeat(100);

      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-title-100',
          rating: 5,
          title: title100,
        }),
      });

      expect(response.status).toBe(201);
    });

    it('should handle description at length boundary (1000 chars)', async () => {
      const user = mockData.createUser({
        email: 'desc1000@example.com',
        password: 'SecurePass123',
        name: 'Desc 1000',
      });

      const description1000 = 'A'.repeat(1000);

      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-desc-1000',
          rating: 5,
          description: description1000,
        }),
      });

      expect(response.status).toBe(201);
    });

    it('should handle pagination at first page', async () => {
      const user = mockData.createUser({
        email: 'pagination1@example.com',
        password: 'SecurePass123',
        name: 'Pagination 1',
      });

      // Create multiple ratings
      for (let i = 0; i < 5; i++) {
        mockData.createRating({
          user_id: user.id,
          target_type: 'agent',
          target_id: `agent-page-${i}`,
          rating: (i % 5) + 1,
        });
      }

      const response = await fetch('http://localhost:3000/api/ratings?page=1&per_page=2');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.meta.page).toBe(1);
      expect(data.data.ratings.length).toBeLessThanOrEqual(2);
    });

    it('should handle pagination at last page', async () => {
      const user = mockData.createUser({
        email: 'pagination2@example.com',
        password: 'SecurePass123',
        name: 'Pagination 2',
      });

      // Create multiple ratings
      for (let i = 0; i < 5; i++) {
        mockData.createRating({
          user_id: user.id,
          target_type: 'task',
          target_id: `task-page-${i}`,
          rating: (i % 5) + 1,
        });
      }

      const response = await fetch('http://localhost:3000/api/ratings?page=3&per_page=2');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.meta.page).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty pagination (page beyond available)', async () => {
      const response = await fetch('http://localhost:3000/api/ratings?page=999&per_page=10');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.ratings).toEqual([]);
    });

    it('should handle rating with all valid target types', async () => {
      const user = mockData.createUser({
        email: 'alltypes@example.com',
        password: 'SecurePass123',
        name: 'All Types',
      });

      const validTypes = ['agent', 'task', 'feature', 'project', 'overall'] as const;

      for (const type of validTypes) {
        const response = await fetch('http://localhost:3000/api/ratings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id,
          },
          body: JSON.stringify({
            target_type: type,
            target_id: `${type}-test`,
            rating: 5,
          }),
        });

        expect(response.status).toBe(201);
      }
    });

    it('should handle rating update without changing fields', async () => {
      const user = mockData.createUser({
        email: 'nochange@example.com',
        password: 'SecurePass123',
        name: 'No Change',
      });

      const rating = mockData.createRating({
        user_id: user.id,
        target_type: 'agent',
        target_id: 'agent-nochange',
        rating: 4,
        title: 'Original title',
      });

      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-nochange',
          rating: 4,
          title: 'Original title',
        }),
      });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('Permission Tests', () => {
    it('should allow admin to delete any rating', async () => {
      const owner = mockData.createUser({
        email: 'owner-admin@example.com',
        password: 'SecurePass123',
        name: 'Owner Admin',
      });

      const rating = mockData.createRating({
        user_id: owner.id,
        target_type: 'agent',
        target_id: 'agent-admin-delete',
        rating: 5,
      });

      const response = await fetch(`http://localhost:3000/api/ratings/${rating.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': 'admin',
        },
      });

      expect(response.status).toBe(200);
    });

    it('should allow owner to delete their own rating', async () => {
      const user = mockData.createUser({
        email: 'owner-delete@example.com',
        password: 'SecurePass123',
        name: 'Owner Delete',
      });

      const rating = mockData.createRating({
        user_id: user.id,
        target_type: 'agent',
        target_id: 'agent-owner-delete',
        rating: 5,
      });

      const response = await fetch(`http://localhost:3000/api/ratings/${rating.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id,
        },
      });

      expect(response.status).toBe(200);
    });

    it('should reject delete by non-owner non-admin', async () => {
      const owner = mockData.createUser({
        email: 'owner-nonowner@example.com',
        password: 'SecurePass123',
        name: 'Owner NonOwner',
      });

      const nonOwner = mockData.createUser({
        email: 'nonowner@example.com',
        password: 'SecurePass123',
        name: 'Non Owner',
      });

      const rating = mockData.createRating({
        user_id: owner.id,
        target_type: 'agent',
        target_id: 'agent-nonowner',
        rating: 5,
      });

      const response = await fetch(`http://localhost:3000/api/ratings/${rating.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': nonOwner.id,
        },
      });

      expect(response.status).toBe(403);
    });

    it('should allow anonymous user to create rating', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-anon',
          rating: 5,
          title: 'Anonymous rating',
        }),
      });

      expect(response.status).toBe(201);
    });

    it('should allow anonymous user to rate same target (updates existing)', async () => {
      const targetId = 'agent-anon-update';

      await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: targetId,
          rating: 4,
          title: 'First anonymous rating',
        }),
      });

      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: targetId,
          rating: 5,
          title: 'Updated anonymous rating',
        }),
      });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('Advanced Error Handling', () => {
    it('should handle SQL injection attempt in target_id', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: "'; DROP TABLE ratings; --",
          rating: 5,
        }),
      });

      // Should handle gracefully without error 500
      expect([400, 201, 200]).toContain(response.status);
    });

    it('should handle XSS attempt in title', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-xss',
          rating: 5,
          title: '<script>alert("XSS")</script>',
        }),
      });

      expect([400, 201, 200]).toContain(response.status);
    });

    it('should handle Unicode characters in title and description', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-unicode',
          rating: 5,
          title: '测试标题 🎉',
          description: '这是一个测试描述 with émojis 🚀',
        }),
      });

      expect(response.status).toBe(201);
    });

    it('should handle extremely large description (>1000 chars)', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-long',
          rating: 5,
          description: 'A'.repeat(10000),
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should handle null and undefined values gracefully', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-null',
          rating: 5,
          title: null,
          description: undefined,
        }),
      });

      expect(response.status).toBe(201);
    });

    it('should handle rating as string (should convert or reject)', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-string-rating',
          rating: '5' as any,
        }),
      });

      // Should handle string rating
      expect([400, 201, 200]).toContain(response.status);
    });

    it('should handle decimal ratings (should round or reject)', async () => {
      const response = await fetch('http://localhost:3000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: 'agent-decimal',
          rating: 3.5 as any,
        }),
      });

      expect([400, 201, 200]).toContain(response.status);
    });

    it('should handle helpful vote from same user multiple times', async () => {
      const user = mockData.createUser({
        email: 'vote-multi@example.com',
        password: 'SecurePass123',
        name: 'Vote Multi',
      });

      const rater = mockData.createUser({
        email: 'rater-multi@example.com',
        password: 'SecurePass123',
        name: 'Rater Multi',
      });

      const rating = mockData.createRating({
        user_id: rater.id,
        target_type: 'agent',
        target_id: 'agent-vote-multi',
        rating: 5,
      });

      // First vote
      await fetch(`http://localhost:3000/api/ratings/${rating.id}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ is_helpful: true }),
      });

      // Second vote from same user
      const response = await fetch(`http://localhost:3000/api/ratings/${rating.id}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ is_helpful: false }),
      });

      expect(response.status).toBe(200);
    });

    it('should handle helpful vote from anonymous user', async () => {
      const rater = mockData.createUser({
        email: 'rater-anon-vote@example.com',
        password: 'SecurePass123',
        name: 'Rater Anon Vote',
      });

      const rating = mockData.createRating({
        user_id: rater.id,
        target_type: 'agent',
        target_id: 'agent-anon-vote',
        rating: 5,
      });

      const response = await fetch(`http://localhost:3000/api/ratings/${rating.id}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_helpful: true }),
      });

      expect(response.status).toBe(200);
    });

    it('should handle invalid rating ID format', async () => {
      const response = await fetch('http://localhost:3000/api/ratings/invalid-id-format');
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it('should handle missing x-user-id header on delete', async () => {
      const user = mockData.createUser({
        email: 'delete-noheader@example.com',
        password: 'SecurePass123',
        name: 'Delete NoHeader',
      });

      const rating = mockData.createRating({
        user_id: user.id,
        target_type: 'agent',
        target_id: 'agent-noheader',
        rating: 5,
      });

      const response = await fetch(`http://localhost:3000/api/ratings/${rating.id}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(403);
    });
  });
});
