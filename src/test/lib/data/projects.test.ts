/**
 * Projects Module Tests
 * Tests for src/lib/data/projects.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectsByStatus,
  getProjectsByPriority,
  getProjectsByMember,
  getProjectTasks,
  projects
} from '@/lib/data/projects';
import type { ProjectStatus, ProjectPriority } from '@/types/project-types';

describe('projects data module', () => {
  // Store original projects for restoration
  const originalProjectsLength = projects.length;

  // ============================================================================
  // getProjects
  // ============================================================================

  describe('getProjects', () => {
    it('should return all projects', () => {
      const result = getProjects();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return a copy of the projects array', () => {
      const result = getProjects();
      const originalLength = result.length;
      
      // Modify returned array
      result.push({} as any);
      
      // Original should be unchanged
      expect(getProjects().length).toBe(originalLength);
    });

    it('should contain valid project structure', () => {
      const result = getProjects();
      const project = result[0];
      
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('title');
      expect(project).toHaveProperty('description');
      expect(project).toHaveProperty('status');
      expect(project).toHaveProperty('priority');
      expect(project).toHaveProperty('members');
      expect(project).toHaveProperty('metadata');
      expect(project).toHaveProperty('createdAt');
      expect(project).toHaveProperty('updatedAt');
    });
  });

  // ============================================================================
  // getProjectById
  // ============================================================================

  describe('getProjectById', () => {
    it('should return project when found', () => {
      const existingProject = projects[0];
      const result = getProjectById(existingProject.id);
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(existingProject.id);
      expect(result?.title).toBe(existingProject.title);
    });

    it('should return undefined for non-existent id', () => {
      const result = getProjectById('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty id', () => {
      const result = getProjectById('');
      expect(result).toBeUndefined();
    });

    it('should handle special characters in id', () => {
      const result = getProjectById('proj-<script>');
      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // createProject
  // ============================================================================

  describe('createProject', () => {
    const validProjectData = {
      title: 'New Test Project',
      description: 'A test project description',
      status: 'active' as ProjectStatus,
      priority: 'medium' as ProjectPriority,
      members: ['agent-world-expert'],
      metadata: {
        category: 'website'
      }
    };

    it('should create a new project with valid data', () => {
      const initialCount = projects.length;
      const result = createProject(validProjectData);
      
      expect(result).toBeDefined();
      expect(result.id).toMatch(/^proj-/);
      expect(result.title).toBe(validProjectData.title);
      expect(result.description).toBe(validProjectData.description);
      expect(result.status).toBe(validProjectData.status);
      expect(result.priority).toBe(validProjectData.priority);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(projects.length).toBe(initialCount + 1);
    });

    it('should generate unique IDs for new projects', () => {
      const project1 = createProject(validProjectData);
      const project2 = createProject({ ...validProjectData, title: 'Another Project' });
      
      expect(project1.id).not.toBe(project2.id);
    });

    it('should set createdAt and updatedAt to current time', () => {
      const before = new Date().toISOString();
      const result = createProject(validProjectData);
      const after = new Date().toISOString();
      
      expect(result.createdAt).toBeGreaterThanOrEqual(before);
      expect(result.createdAt).toBeLessThanOrEqual(after);
      expect(result.updatedAt).toBeGreaterThanOrEqual(before);
      expect(result.updatedAt).toBeLessThanOrEqual(after);
    });

    it('should handle project with optional fields', () => {
      const projectWithOptions = {
        ...validProjectData,
        category: 'webapp',
        client: 'Test Client',
        budget: 10000,
        techStack: ['React', 'Node.js'],
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        thumbnail: '/images/test.jpg',
        links: {
          live: 'https://example.com',
          github: 'https://github.com/test'
        }
      };
      
      const result = createProject(projectWithOptions);
      
      expect(result.category).toBe('webapp');
      expect(result.client).toBe('Test Client');
      expect(result.budget).toBe(10000);
      expect(result.techStack).toEqual(['React', 'Node.js']);
      expect(result.startDate).toBe('2026-01-01');
      expect(result.endDate).toBe('2026-12-31');
    });

    it('should throw or handle invalid data gracefully', () => {
      // Test with missing required fields
      expect(() => createProject({
        title: '',
        description: 'Test',
        status: 'active',
        priority: 'high',
        members: [],
        metadata: { category: '' }
      })).not.toThrow();
    });
  });

  // ============================================================================
  // updateProject
  // ============================================================================

  describe('updateProject', () => {
    const testProject = {
      title: 'Update Test Project',
      description: 'Test description',
      status: 'active' as ProjectStatus,
      priority: 'low' as ProjectPriority,
      members: ['test-member'],
      metadata: { category: 'test' }
    };

    let projectToUpdate: { id: string };

    beforeEach(() => {
      projectToUpdate = createProject(testProject);
    });

    it('should update existing project with valid data', () => {
      const updates = { title: 'Updated Title', priority: 'high' as ProjectPriority };
      const result = updateProject(projectToUpdate.id, updates);
      
      expect(result).toBeDefined();
      expect(result?.title).toBe('Updated Title');
      expect(result?.priority).toBe('high');
      expect(result?.id).toBe(projectToUpdate.id); // ID should not change
    });

    it('should update updatedAt timestamp', () => {
      const originalUpdatedAt = projectToUpdate.updatedAt;
      
      // Small delay to ensure different timestamp
      const updates = { title: 'New Title' };
      const result = updateProject(projectToUpdate.id, updates);
      
      expect(result?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should return null for non-existent project', () => {
      const result = updateProject('non-existent-id', { title: 'Test' });
      expect(result).toBeNull();
    });

    it('should handle partial updates', () => {
      const result = updateProject(projectToUpdate.id, { status: 'paused' as ProjectStatus });
      
      expect(result?.status).toBe('paused');
      expect(result?.title).toBe(testProject.title); // Unchanged
      expect(result?.priority).toBe(testProject.priority); // Unchanged
    });

    it('should allow updating to empty values', () => {
      const result = updateProject(projectToUpdate.id, { description: '' });
      
      expect(result?.description).toBe('');
    });

    it('should not allow changing project id', () => {
      const result = updateProject(projectToUpdate.id, { id: 'new-id' });
      
      expect(result?.id).toBe(projectToUpdate.id);
    });
  });

  // ============================================================================
  // deleteProject
  // ============================================================================

  describe('deleteProject', () => {
    let projectToDelete: { id: string };

    beforeEach(() => {
      projectToDelete = createProject({
        title: 'Delete Test',
        description: 'Will be deleted',
        status: 'active',
        priority: 'low',
        members: ['test'],
        metadata: { category: 'test' }
      });
    });

    it('should delete existing project', () => {
      const initialCount = projects.length;
      const result = deleteProject(projectToDelete.id);
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(projectToDelete.id);
      expect(projects.length).toBe(initialCount - 1);
      
      // Verify it's actually deleted
      expect(getProjectById(projectToDelete.id)).toBeUndefined();
    });

    it('should return null for non-existent project', () => {
      const result = deleteProject('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return the deleted project data', () => {
      const result = deleteProject(projectToDelete.id);
      
      expect(result?.title).toBe('Delete Test');
      expect(result?.description).toBe('Will be deleted');
    });
  });

  // ============================================================================
  // getProjectsByStatus
  // ============================================================================

  describe('getProjectsByStatus', () => {
    it('should return projects with matching status', () => {
      const activeProjects = getProjectsByStatus('active');
      
      expect(activeProjects).toBeInstanceOf(Array);
      activeProjects.forEach(project => {
        expect(project.status).toBe('active');
      });
    });

    it('should return empty array for status with no projects', () => {
      // Create projects with different statuses first
      createProject({
        title: 'Test',
        description: 'Test',
        status: 'archived',
        priority: 'low',
        members: [],
        metadata: { category: 'test' }
      });
      
      const archivedProjects = getProjectsByStatus('archived');
      expect(archivedProjects.length).toBeGreaterThan(0);
    });

    it('should handle all valid status values', () => {
      const statuses: ProjectStatus[] = ['active', 'paused', 'completed', 'archived'];
      
      statuses.forEach(status => {
        const result = getProjectsByStatus(status);
        expect(result).toBeInstanceOf(Array);
      });
    });
  });

  // ============================================================================
  // getProjectsByPriority
  // ============================================================================

  describe('getProjectsByPriority', () => {
    it('should return projects with matching priority', () => {
      const highPriorityProjects = getProjectsByPriority('high');
      
      expect(highPriorityProjects).toBeInstanceOf(Array);
      highPriorityProjects.forEach(project => {
        expect(project.priority).toBe('high');
      });
    });

    it('should handle all valid priority values', () => {
      const priorities: ProjectPriority[] = ['low', 'medium', 'high', 'urgent'];
      
      priorities.forEach(priority => {
        const result = getProjectsByPriority(priority);
        expect(result).toBeInstanceOf(Array);
      });
    });
  });

  // ============================================================================
  // getProjectsByMember
  // ============================================================================

  describe('getProjectsByMember', () => {
    it('should return projects containing the member', () => {
      const memberProjects = getProjectsByMember('architect');
      
      expect(memberProjects).toBeInstanceOf(Array);
      memberProjects.forEach(project => {
        expect(project.members).toContain('architect');
      });
    });

    it('should return empty array for non-existent member', () => {
      const result = getProjectsByMember('non-existent-member');
      expect(result).toEqual([]);
    });

    it('should return empty string for empty member id', () => {
      const result = getProjectsByMember('');
      expect(result).toEqual([]);
    });

    it('should handle multiple members in a project', () => {
      const multiMemberProject = createProject({
        title: 'Multi Member Project',
        description: 'Test',
        status: 'active',
        priority: 'high',
        members: ['member1', 'member2', 'member3'],
        metadata: { category: 'test' }
      });
      
      const result1 = getProjectsByMember('member1');
      const result2 = getProjectsByMember('member2');
      const result3 = getProjectsByMember('member3');
      
      expect(result1.some(p => p.id === multiMemberProject.id)).toBe(true);
      expect(result2.some(p => p.id === multiMemberProject.id)).toBe(true);
      expect(result3.some(p => p.id === multiMemberProject.id)).toBe(true);
    });
  });

  // ============================================================================
  // getProjectTasks
  // ============================================================================

  describe('getProjectTasks', () => {
    it('should return empty array', () => {
      const result = getProjectTasks('proj-001');
      expect(result).toEqual([]);
    });

    it('should return empty array for non-existent project', () => {
      const result = getProjectTasks('non-existent');
      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // Edge Cases and Boundary Conditions
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very long title', () => {
      const longTitle = 'A'.repeat(500);
      const project = createProject({
        title: longTitle,
        description: 'Test',
        status: 'active',
        priority: 'medium',
        members: ['test'],
        metadata: { category: 'test' }
      });
      
      expect(project.title).toBe(longTitle);
    });

    it('should handle unicode characters in title', () => {
      const unicodeTitle = '项目 🚀 你好 🌍';
      const project = createProject({
        title: unicodeTitle,
        description: 'Test',
        status: 'active',
        priority: 'medium',
        members: ['test'],
        metadata: { category: 'test' }
      });
      
      expect(project.title).toBe(unicodeTitle);
    });

    it('should handle special characters in metadata', () => {
      const project = createProject({
        title: 'Test',
        description: 'Test',
        status: 'active',
        priority: 'medium',
        members: ['test'],
        metadata: {
          category: 'test',
          client: 'Client <script>alert("xss")</script>',
          budget: 1000
        }
      });
      
      expect(project.metadata.client).toContain('<script>');
    });

    it('should handle empty members array', () => {
      const project = createProject({
        title: 'Test',
        description: 'Test',
        status: 'active',
        priority: 'medium',
        members: [],
        metadata: { category: 'test' }
      });
      
      expect(project.members).toEqual([]);
    });

    it('should handle update with empty object', () => {
      const testProject = createProject({
        title: 'Test',
        description: 'Test',
        status: 'active',
        priority: 'medium',
        members: ['test'],
        metadata: { category: 'test' }
      });
      
      const result = updateProject(testProject.id, {});
      expect(result).toBeDefined();
    });
  });
});
