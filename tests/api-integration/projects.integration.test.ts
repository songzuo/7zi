/**
 * @fileoverview Projects API integration tests
 * @description Tests for /api/projects endpoints using MSW handlers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { server, mockData } from './mocks/handlers';

function getAuthHeader(userId: string): HeadersInit {
  const token = mockData.generateToken(userId);
  return { 'Authorization': `Bearer ${token}` };
}

describe('/api/projects - Integration Tests', () => {
  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    mockData.resetProjects();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('POST /api/projects', () => {
    it('should create a project with valid data', async () => {
      const user = mockData.createUser({
        email: 'owner@example.com',
        password: 'SecurePass123',
        name: 'Project Owner',
      });

      const response = await fetch('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'New Project',
          description: 'Project description',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Project');
      expect(data.data.description).toBe('Project description');
      expect(data.data.ownerId).toBe(user.id);
      expect(data.data.status).toBe('active');
    });

    it('should reject project creation without auth token', async () => {
      const response = await fetch('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'No Auth Project' }),
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject project creation without name', async () => {
      const user = mockData.createUser({
        email: 'owner@example.com',
        password: 'SecurePass123',
        name: 'Project Owner',
      });

      const response = await fetch('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({ description: 'No name' }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject project with empty name', async () => {
      const user = mockData.createUser({
        email: 'owner@example.com',
        password: 'SecurePass123',
        name: 'Project Owner',
      });

      const response = await fetch('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({ name: '   ' }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should create project with optional status', async () => {
      const user = mockData.createUser({
        email: 'owner@example.com',
        password: 'SecurePass123',
        name: 'Project Owner',
      });

      const response = await fetch('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Archived Project',
          status: 'archived',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.status).toBe('archived');
    });
  });

  describe('GET /api/projects', () => {
    beforeEach(() => {
      const user1 = mockData.createUser({
        email: 'owner1@example.com',
        password: 'SecurePass123',
        name: 'Owner 1',
      });
      const user2 = mockData.createUser({
        email: 'owner2@example.com',
        password: 'SecurePass123',
        name: 'Owner 2',
      });
      mockData.generateToken(user1.id);
      mockData.generateToken(user2.id);

      mockData.createProject({ name: 'Project A', ownerId: user1.id, status: 'active' });
      mockData.createProject({ name: 'Project B', ownerId: user1.id, status: 'archived' });
      mockData.createProject({ name: 'Project C', ownerId: user2.id, status: 'active' });
    });

    it('should return list of projects', async () => {
      const response = await fetch('http://localhost:3000/api/projects');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items).toBeDefined();
      expect(Array.isArray(data.data.items)).toBe(true);
      expect(data.data.total).toBeDefined();
    });

    it('should filter projects by ownerId', async () => {
      const users = Array.from(mockData.getAllUsers());
      const user1 = users.find(u => u.email === 'owner1@example.com');

      const response = await fetch(`http://localhost:3000/api/projects?ownerId=${user1!.id}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.items.forEach((project: any) => {
        expect(project.ownerId).toBe(user1!.id);
      });
    });

    it('should filter projects by status', async () => {
      const response = await fetch('http://localhost:3000/api/projects?status=active');
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.items.forEach((project: any) => {
        expect(project.status).toBe('active');
      });
    });

    it('should filter by status archived', async () => {
      const response = await fetch('http://localhost:3000/api/projects?status=archived');
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.items.forEach((project: any) => {
        expect(project.status).toBe('archived');
      });
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return a project by id', async () => {
      const user = mockData.createUser({
        email: 'getuser@example.com',
        password: 'SecurePass123',
        name: 'Get User',
      });
      mockData.generateToken(user.id);

      const project = mockData.createProject({
        name: 'Single Project',
        description: 'Description',
        ownerId: user.id,
      });

      const response = await fetch(`http://localhost:3000/api/projects/${project.id}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(project.id);
      expect(data.data.name).toBe('Single Project');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await fetch('http://localhost:3000/api/projects/non-existent-id');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project name', async () => {
      const user = mockData.createUser({
        email: 'updateuser@example.com',
        password: 'SecurePass123',
        name: 'Update User',
      });
      const token = getAuthHeader(user.id);

      const project = mockData.createProject({
        name: 'Original Name',
        ownerId: user.id,
      });

      const response = await fetch(`http://localhost:3000/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...token,
        },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Name');
    });

    it('should update project description', async () => {
      const user = mockData.createUser({
        email: 'updateuser@example.com',
        password: 'SecurePass123',
        name: 'Update User',
      });
      const token = getAuthHeader(user.id);

      const project = mockData.createProject({
        name: 'Desc Project',
        ownerId: user.id,
      });

      const response = await fetch(`http://localhost:3000/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...token,
        },
        body: JSON.stringify({ description: 'New description' }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.description).toBe('New description');
    });

    it('should update project status to archived', async () => {
      const user = mockData.createUser({
        email: 'updateuser@example.com',
        password: 'SecurePass123',
        name: 'Update User',
      });
      const token = getAuthHeader(user.id);

      const project = mockData.createProject({
        name: 'Status Project',
        ownerId: user.id,
        status: 'active',
      });

      const response = await fetch(`http://localhost:3000/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...token,
        },
        body: JSON.stringify({ status: 'archived' }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('archived');
    });

    it('should reject update without auth', async () => {
      const user = mockData.createUser({
        email: 'updateuser@example.com',
        password: 'SecurePass123',
        name: 'Update User',
      });

      const project = mockData.createProject({
        name: 'Auth Project',
        ownerId: user.id,
      });

      const response = await fetch(`http://localhost:3000/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacked' }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 when updating non-existent project', async () => {
      const user = mockData.createUser({
        email: 'updateuser@example.com',
        password: 'SecurePass123',
        name: 'Update User',
      });

      const response = await fetch('http://localhost:3000/api/projects/non-existent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({ name: 'Update' }),
      });

      expect(response.status).toBe(404);
    });

    it('should reject update with empty name', async () => {
      const user = mockData.createUser({
        email: 'updateuser@example.com',
        password: 'SecurePass123',
        name: 'Update User',
      });
      const token = getAuthHeader(user.id);

      const project = mockData.createProject({
        name: 'Name Project',
        ownerId: user.id,
      });

      const response = await fetch(`http://localhost:3000/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...token,
        },
        body: JSON.stringify({ name: '' }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete an existing project', async () => {
      const user = mockData.createUser({
        email: 'deleteuser@example.com',
        password: 'SecurePass123',
        name: 'Delete User',
      });
      mockData.generateToken(user.id);

      const project = mockData.createProject({
        name: 'To Delete',
        ownerId: user.id,
      });

      const response = await fetch(`http://localhost:3000/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(project.id);

      // Verify deletion
      const getResponse = await fetch(`http://localhost:3000/api/projects/${project.id}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent project', async () => {
      const response = await fetch('http://localhost:3000/api/projects/non-existent', {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });
});
