import type { Project, ProjectStatus, ProjectPriority, ProjectTeamMember } from '@/types/project-types';
import type { Task } from '@/lib/types/task-types';
import { v4 as uuidv4 } from 'uuid';

// Define a simpler project data type for in-memory storage
export interface ProjectData {
  id: string;
  slug?: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  category?: string;
  thumbnail?: string;
  images?: string[];
  techStack?: string[];
  client?: string;
  duration?: string;
  highlights?: string[];
  links?: {
    live?: string;
    github?: string;
  };
  startDate?: string;
  endDate?: string;
  budget?: number;
  members: string[];
  teamMembers?: ProjectTeamMember[];
  metadata: {
    category: string;
    client?: string;
    budget?: number;
    thumbnail?: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// In-memory storage for projects (in production, this would be a database)
export const projects: ProjectData[] = [
  {
    id: 'proj-001',
    title: 'AI-Powered Analytics Dashboard',
    description: 'A comprehensive analytics platform that leverages machine learning to provide actionable insights and predictive analytics for business intelligence.',
    status: 'active',
    priority: 'high',
    startDate: '2026-03-01T00:00:00Z',
    endDate: '2026-09-01T00:00:00Z',
    members: ['agent-world-expert', 'architect', 'executor'],
    metadata: {
      category: 'website',
      client: 'TechCorp Solutions',
      budget: 50000,
      thumbnail: '/images/portfolio/ai-dashboard-thumb.jpg'
    },
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'proj-002',
    title: 'Mobile E-commerce Platform',
    description: 'A fully responsive e-commerce platform optimized for mobile devices with seamless payment integration and personalized shopping experience.',
    status: 'active',
    priority: 'medium',
    startDate: '2026-02-15T00:00:00Z',
    endDate: '2026-06-15T00:00:00Z',
    members: ['designer', 'executor', 'promoter'],
    metadata: {
      category: 'app',
      client: 'ShopEasy Inc.',
      budget: 35000,
      thumbnail: '/images/portfolio/ecommerce-thumb.jpg'
    },
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-02-15T09:00:00Z'
  },
  {
    id: 'proj-003',
    title: 'Blockchain Supply Chain Tracker',
    description: 'A decentralized supply chain management system using blockchain technology to ensure transparency, traceability, and security.',
    status: 'paused',
    priority: 'high',
    startDate: '2026-01-10T00:00:00Z',
    endDate: '2026-09-10T00:00:00Z',
    members: ['consultant', 'architect', 'executor'],
    metadata: {
      category: 'website',
      client: 'Global Logistics Partners',
      budget: 75000,
      thumbnail: '/images/portfolio/blockchain-thumb.jpg'
    },
    createdAt: '2026-01-10T11:00:00Z',
    updatedAt: '2026-01-10T11:00:00Z'
  }
];

/**
 * Get all projects
 */
export function getProjects(): ProjectData[] {
  return [...projects];
}

/**
 * Get project by ID
 */
export function getProjectById(id: string): ProjectData | undefined {
  return projects.find(project => project.id === id);
}

/**
 * Create a new project
 */
export function createProject(project: Omit<ProjectData, 'id' | 'createdAt' | 'updatedAt'>): ProjectData {
  const newProject: ProjectData = {
    ...project,
    id: `proj-${uuidv4().split('-')[0]}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  projects.push(newProject);
  return newProject;
}

/**
 * Update an existing project
 */
export function updateProject(id: string, updates: Partial<ProjectData>): ProjectData | null {
  const index = projects.findIndex(project => project.id === id);
  if (index === -1) {
    return null;
  }
  
  const updatedProject = {
    ...projects[index],
    ...updates,
    id, // Ensure ID doesn't change
    updatedAt: new Date().toISOString()
  };
  
  projects[index] = updatedProject;
  return updatedProject;
}

/**
 * Delete a project
 */
export function deleteProject(id: string): ProjectData | null {
  const index = projects.findIndex(project => project.id === id);
  if (index === -1) {
    return null;
  }
  
  const deletedProject = projects.splice(index, 1)[0];
  return deletedProject;
}

/**
 * Get projects by status
 */
export function getProjectsByStatus(status: ProjectStatus): ProjectData[] {
  return projects.filter(project => project.status === status);
}

/**
 * Get projects by priority
 */
export function getProjectsByPriority(priority: ProjectPriority): ProjectData[] {
  return projects.filter(project => project.priority === priority);
}

/**
 * Get projects by member
 */
export function getProjectsByMember(memberId: string): ProjectData[] {
  return projects.filter(project => project.members.includes(memberId));
}

/**
 * Get tasks for a specific project
 */
export function getProjectTasks(projectId: string): Task[] {
  // This will be implemented in the tasks data module
  // For now, return empty array
  return [];
}