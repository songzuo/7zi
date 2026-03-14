/**
 * @fileoverview 项目数据持久化存储
 * @module lib/data/projects
 * 
 * @description
 * 提供项目的持久化存储功能。数据存储在 data/projects.json 文件中，
 * 确保服务器重启后数据不丢失。
 */

import type { Project, ProjectStatus, ProjectPriority, ProjectTeamMember } from '@/types/project-types';
import type { Task } from '@/lib/types/task-types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// 数据文件路径
const DATA_FILE = path.join(process.cwd(), 'data', 'projects.json');

// 定义项目数据类型
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

// 初始示例数据
const initialProjects: ProjectData[] = [
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

// 内存缓存
let projectsCache: ProjectData[] | null = null;

/**
 * 从文件加载项目数据
 */
function loadProjects(): ProjectData[] {
  if (projectsCache) {
    return projectsCache;
  }
  
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      projectsCache = JSON.parse(data);
      return projectsCache!;
    }
  } catch (error) {
    console.error('Error loading projects from file:', error);
  }
  
  // 如果文件不存在，使用初始数据并保存
  projectsCache = [...initialProjects];
  saveProjects(projectsCache);
  return projectsCache;
}

/**
 * 保存项目数据到文件
 */
function saveProjects(projects: ProjectData[]): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
  } catch (error) {
    console.error('Error saving projects to file:', error);
  }
}

/**
 * 同步缓存到文件
 */
function syncToFile(): void {
  if (projectsCache) {
    saveProjects(projectsCache);
  }
}

// 初始化时加载数据
loadProjects();

/**
 * 项目列表 (导出用于兼容)
 * 注意：直接修改此数组不会保存到文件，请使用 createProject/updateProject/deleteProject
 */
export const projects: ProjectData[] = [];

// 初始化 projects 导出
projects.push(...loadProjects());

/**
 * 获取所有项目
 */
export function getProjects(): ProjectData[] {
  return [...loadProjects()];
}

/**
 * 根据ID获取项目
 */
export function getProjectById(id: string): ProjectData | undefined {
  const projects = loadProjects();
  return projects.find(project => project.id === id);
}

/**
 * 创建新项目
 */
export function createProject(project: Omit<ProjectData, 'id' | 'createdAt' | 'updatedAt'>): ProjectData {
  const projects = loadProjects();
  
  const newProject: ProjectData = {
    ...project,
    id: `proj-${uuidv4().split('-')[0]}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  projects.push(newProject);
  projectsCache = projects;
  syncToFile();
  
  return newProject;
}

/**
 * 更新现有项目
 */
export function updateProject(id: string, updates: Partial<ProjectData>): ProjectData | null {
  const projects = loadProjects();
  const index = projects.findIndex(project => project.id === id);
  
  if (index === -1) {
    return null;
  }
  
  const updatedProject = {
    ...projects[index],
    ...updates,
    id, // 确保ID不变
    updatedAt: new Date().toISOString()
  };
  
  projects[index] = updatedProject;
  projectsCache = projects;
  syncToFile();
  
  return updatedProject;
}

/**
 * 删除项目
 */
export function deleteProject(id: string): ProjectData | null {
  const projects = loadProjects();
  const index = projects.findIndex(project => project.id === id);
  
  if (index === -1) {
    return null;
  }
  
  const deletedProject = projects.splice(index, 1)[0];
  projectsCache = projects;
  syncToFile();
  
  return deletedProject;
}

/**
 * 按状态获取项目
 */
export function getProjectsByStatus(status: ProjectStatus): ProjectData[] {
  const projects = loadProjects();
  return projects.filter(project => project.status === status);
}

/**
 * 按优先级获取项目
 */
export function getProjectsByPriority(priority: ProjectPriority): ProjectData[] {
  const projects = loadProjects();
  return projects.filter(project => project.priority === priority);
}

/**
 * 按成员获取项目
 */
export function getProjectsByMember(memberId: string): ProjectData[] {
  const projects = loadProjects();
  return projects.filter(project => project.members.includes(memberId));
}

/**
 * 获取特定项目的任务
 */
export function getProjectTasks(projectId: string): Task[] {
  // 这将在 tasks 数据模块中实现
  return [];
}
