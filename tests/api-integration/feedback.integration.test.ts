/**
 * @fileoverview Feedback API integration tests
 * @description Tests for /api/feedback/* endpoints using MSW
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { server, mockData } from './mocks/handlers';

describe('/api/feedback - Integration Tests', () => {
  beforeAll(() => {
    server.listen({
      onUnhandledRequest: 'warn',
    });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    server.resetHandlers();
    mockData.resetFeedbacks();
  });

  describe('GET /api/feedback', () => {
    it('should return feedback list with valid structure', async () => {
      const response = await fetch('http://localhost:3000/api/feedback');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('feedbacks');
      expect(data.data).toHaveProperty('meta');
      expect(data.data).toHaveProperty('stats');
    });

    it('should return feedbacks array', async () => {
      const response = await fetch('http://localhost:3000/api/feedback');
      const data = await response.json();

      expect(Array.isArray(data.data.feedbacks)).toBe(true);
      expect(data.data.feedbacks.length).toBeGreaterThan(0);
    });

    it('should return feedback with correct properties', async () => {
      const response = await fetch('http://localhost:3000/api/feedback');
      const data = await response.json();

      if (data.data.feedbacks.length > 0) {
        const feedback = data.data.feedbacks[0];
        expect(feedback).toHaveProperty('id');
        expect(feedback).toHaveProperty('user_id');
        expect(feedback).toHaveProperty('type');
        expect(feedback).toHaveProperty('rating');
        expect(feedback).toHaveProperty('title');
        expect(feedback).toHaveProperty('description');
        expect(feedback).toHaveProperty('status');
        expect(feedback).toHaveProperty('priority');
        expect(feedback).toHaveProperty('created_at');
        expect(feedback).toHaveProperty('updated_at');
      }
    });

    it('should return pagination metadata', async () => {
      const response = await fetch('http://localhost:3000/api/feedback');
      const data = await response.json();

      expect(data.data.meta).toHaveProperty('total');
      expect(data.data.meta).toHaveProperty('page');
      expect(data.data.meta).toHaveProperty('per_page');
      expect(data.data.meta).toHaveProperty('total_pages');
    });

    it('should return statistics', async () => {
      const response = await fetch('http://localhost:3000/api/feedback');
      const data = await response.json();

      expect(data.data.stats).toHaveProperty('total');
      expect(data.data.stats).toHaveProperty('byStatus');
      expect(data.data.stats).toHaveProperty('byType');
      expect(data.data.stats).toHaveProperty('byPriority');
      expect(data.data.stats).toHaveProperty('averageRating');
    });

    it('should handle page query parameter', async () => {
      const response = await fetch('http://localhost:3000/api/feedback?page=2');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.meta.page).toBe(2);
    });

    it('should handle per_page query parameter', async () => {
      const response = await fetch('http://localhost:3000/api/feedback?per_page=50');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.meta.per_page).toBe(50);
    });

    it('should handle status filter', async () => {
      const response = await fetch('http://localhost:3000/api/feedback?status=pending');
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.feedbacks.forEach((feedback: any) => {
        expect(feedback.status).toBe('pending');
      });
    });

    it('should handle type filter', async () => {
      const response = await fetch('http://localhost:3000/api/feedback?type=bug_report');
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.feedbacks.forEach((feedback: any) => {
        expect(feedback.type).toBe('bug_report');
      });
    });

    it('should limit per_page to maximum 100', async () => {
      const response = await fetch('http://localhost:3000/api/feedback?per_page=1000');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.meta.per_page).toBe(100);
    });

    it('should use default pagination values', async () => {
      const response = await fetch('http://localhost:3000/api/feedback');
      const data = await response.json();

      expect(data.data.meta.page).toBe(1);
      expect(data.data.meta.per_page).toBe(20);
    });
  });

  describe('POST /api/feedback', () => {
    const validFeedback = {
      type: 'bug_report',
      rating: 4,
      title: 'Test feedback',
      description: 'This is a test feedback description',
      email: 'test@example.com',
    };

    it('should create feedback with valid data', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validFeedback),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.type).toBe(validFeedback.type);
      expect(data.data.rating).toBe(validFeedback.rating);
      expect(data.data.title).toBe(validFeedback.title);
      expect(data.data.description).toBe(validFeedback.description);
    });

    it('should reject feedback without type', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: validFeedback.rating,
          title: validFeedback.title,
          description: validFeedback.description,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject feedback without rating', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: validFeedback.type,
          title: validFeedback.title,
          description: validFeedback.description,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject feedback without title', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: validFeedback.type,
          rating: validFeedback.rating,
          description: validFeedback.description,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject feedback without description', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: validFeedback.type,
          rating: validFeedback.rating,
          title: validFeedback.title,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject rating < 1', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validFeedback,
          rating: 0,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject rating > 5', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validFeedback,
          rating: 6,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should accept rating = 1', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validFeedback,
          rating: 1,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.rating).toBe(1);
    });

    it('should accept rating = 5', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validFeedback,
          rating: 5,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.rating).toBe(5);
    });

    it('should reject title > 100 characters', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validFeedback,
          title: 'A'.repeat(101),
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should accept title = 100 characters', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validFeedback,
          title: 'A'.repeat(100),
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it('should reject description > 1000 characters', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validFeedback,
          description: 'A'.repeat(1001),
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should accept description = 1000 characters', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validFeedback,
          description: 'A'.repeat(1000),
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it('should handle optional email field', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validFeedback,
          email: 'user@example.com',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.email).toBe('user@example.com');
    });

    it('should handle optional metadata field', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validFeedback,
          metadata: {
            browser: 'chrome',
            os: 'windows',
          },
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.metadata).toBeDefined();
    });

    it('should handle optional user_id field', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validFeedback,
          user_id: 'user-123',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.user_id).toBe('user-123');
    });

    it('should set default status to pending', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validFeedback),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.status).toBe('pending');
    });

    it('should set default priority to medium', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validFeedback),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.priority).toBe('medium');
    });

    it('should include created_at timestamp', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validFeedback),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.created_at).toBeDefined();
      expect(new Date(data.data.created_at)).toBeInstanceOf(Date);
    });

    it('should include updated_at timestamp', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validFeedback),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.updated_at).toBeDefined();
      expect(new Date(data.data.updated_at)).toBeInstanceOf(Date);
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/feedback/[id]', () => {
    it('should return single feedback by ID', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/feedback-1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('user_id');
      expect(data.data).toHaveProperty('type');
      expect(data.data).toHaveProperty('rating');
      expect(data.data).toHaveProperty('title');
      expect(data.data).toHaveProperty('description');
    });

    it('should return 404 for non-existent feedback', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/nonexistent');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('NOT_FOUND');
    });

    it('should include all feedback properties', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/feedback-1');
      const data = await response.json();

      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('user_id');
      expect(data.data).toHaveProperty('type');
      expect(data.data).toHaveProperty('rating');
      expect(data.data).toHaveProperty('title');
      expect(data.data).toHaveProperty('description');
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('priority');
      expect(data.data).toHaveProperty('created_at');
      expect(data.data).toHaveProperty('updated_at');
    });
  });

  describe('PATCH /api/feedback/[id]', () => {
    const adminUpdate = {
      admin_id: 'admin',
      status: 'in_review',
      priority: 'high',
      admin_notes: 'Reviewing this feedback',
    };

    it('should update feedback with admin access', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/feedback-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminUpdate),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe(adminUpdate.status);
      expect(data.data.priority).toBe(adminUpdate.priority);
      expect(data.data.admin_notes).toBe(adminUpdate.admin_notes);
    });

    it('should reject update without admin access', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/feedback-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: 'user',
          status: 'in_review',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('FORBIDDEN');
      expect(data.error.message).toContain('Admin access required');
    });

    it('should update status only', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/feedback-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: 'admin',
          status: 'resolved',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('resolved');
    });

    it('should update priority only', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/feedback-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: 'admin',
          priority: 'low',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.priority).toBe('low');
    });

    it('should update admin_notes only', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/feedback-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: 'admin',
          admin_notes: 'Additional notes',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.admin_notes).toBe('Additional notes');
    });

    it('should update metadata', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/feedback-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: 'admin',
          metadata: {
            reviewed: true,
            reviewer: 'admin',
          },
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.metadata).toBeDefined();
    });

    it('should return 404 for non-existent feedback', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/nonexistent', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: 'admin',
          status: 'in_review',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('NOT_FOUND');
    });

    it('should include updated_at timestamp after update', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/feedback-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: 'admin',
          status: 'in_review',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.updated_at).toBeDefined();
      expect(new Date(data.data.updated_at)).toBeInstanceOf(Date);
    });

    it('should handle partial updates', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/feedback-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: 'admin',
          status: 'reviewed',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('reviewed');
    });
  });

  describe('DELETE /api/feedback/[id]', () => {
    it('should delete feedback successfully', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/feedback-1', {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('message');
      expect(data.data.message).toContain('deleted');
    });

    it('should return 404 for non-existent feedback', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/nonexistent', {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('NOT_FOUND');
    });

    it('should include feedback ID in response', async () => {
      const response = await fetch('http://localhost:3000/api/feedback/feedback-1', {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe('feedback-1');
    });
  });

  describe('/api/feedback - Statistics', () => {
    it('should return total count in stats', async () => {
      const response = await fetch('http://localhost:3000/api/feedback');
      const data = await response.json();

      expect(data.data.stats.total).toBeGreaterThan(0);
      expect(typeof data.data.stats.total).toBe('number');
    });

    it('should return byStatus breakdown', async () => {
      const response = await fetch('http://localhost:3000/api/feedback');
      const data = await response.json();

      expect(data.data.stats.byStatus).toHaveProperty('pending');
      expect(data.data.stats.byStatus).toHaveProperty('in_review');
      expect(data.data.stats.byStatus).toHaveProperty('resolved');
      expect(data.data.stats.byStatus).toHaveProperty('closed');
    });

    it('should return byType breakdown', async () => {
      const response = await fetch('http://localhost:3000/api/feedback');
      const data = await response.json();

      expect(data.data.stats.byType).toHaveProperty('bug_report');
      expect(data.data.stats.byType).toHaveProperty('feature_request');
      expect(data.data.stats.byType).toHaveProperty('general_feedback');
    });

    it('should return byPriority breakdown', async () => {
      const response = await fetch('http://localhost:3000/api/feedback');
      const data = await response.json();

      expect(data.data.stats.byPriority).toHaveProperty('high');
      expect(data.data.stats.byPriority).toHaveProperty('medium');
      expect(data.data.stats.byPriority).toHaveProperty('low');
    });

    it('should return averageRating', async () => {
      const response = await fetch('http://localhost:3000/api/feedback');
      const data = await response.json();

      expect(typeof data.data.stats.averageRating).toBe('number');
      expect(data.data.stats.averageRating).toBeGreaterThanOrEqual(1);
      expect(data.data.stats.averageRating).toBeLessThanOrEqual(5);
    });
  });

  describe('/api/feedback - Response Headers', () => {
    it('should return JSON content type', async () => {
      const response = await fetch('http://localhost:3000/api/feedback');

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('/api/feedback - Edge Cases', () => {
    it('should handle empty filter values', async () => {
      const response = await fetch('http://localhost:3000/api/feedback?status=');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle page = 0 gracefully', async () => {
      const response = await fetch('http://localhost:3000/api/feedback?page=0');
      const data = await response.json();

      // Should still work, just default to page 1
      expect(response.status).toBe(200);
    });

    it('should handle large per_page value', async () => {
      const response = await fetch('http://localhost:3000/api/feedback?per_page=9999');
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should cap at max 100
      expect(data.data.meta.per_page).toBe(100);
    });

    it('should handle invalid filter values', async () => {
      const response = await fetch('http://localhost:3000/api/feedback?status=invalid_status');
      const data = await response.json();

      // Should still return 200, just no results
      expect(response.status).toBe(200);
      expect(Array.isArray(data.data.feedbacks)).toBe(true);
    });
  });

  describe('/api/feedback - Data Consistency', () => {
    it('should return consistent data structure across requests', async () => {
      const response1 = await fetch('http://localhost:3000/api/feedback');
      const response2 = await fetch('http://localhost:3000/api/feedback');

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(Object.keys(data1.data)).toEqual(Object.keys(data2.data));
      expect(typeof data1.data.stats.total).toBe('number');
      expect(typeof data2.data.stats.total).toBe('number');
    });

    it('should handle multiple rapid requests', async () => {
      const responses = await Promise.all([
        fetch('http://localhost:3000/api/feedback'),
        fetch('http://localhost:3000/api/feedback'),
        fetch('http://localhost:3000/api/feedback'),
      ]);

      const data = await Promise.all(responses.map(r => r.json()));

      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(data.every(d => d.success === true)).toBe(true);
    });
  });
});
