/**
 * @fileoverview 项目数据客户端版本
 * @module lib/data/projects
 * 
 * @description
 * 提供客户端安全的项目数据（不包含 Node.js fs 模块）
 * 仅用于前端展示，实际数据操作通过 API 进行
 */

import type { Project } from '@/types/project-types';

// 静态项目数据（用于客户端展示）
// 实际项目数据通过 /api/projects API 获取
export const projects: Project[] = [
  {
    id: 'proj-001',
    slug: 'ai-analytics-dashboard',
    title: 'AI-Powered Analytics Dashboard',
    description: 'A comprehensive analytics platform that leverages machine learning to provide actionable insights and predictive analytics for business intelligence.',
    status: 'active',
    priority: 'high',
    category: 'website',
    thumbnail: '/images/portfolio/ai-dashboard-thumb.jpg',
    images: [],
    techStack: ['React', 'Node.js', 'Python', 'TensorFlow'],
    client: 'TechCorp Solutions',
    duration: '6 months',
    highlights: ['ML-powered insights', 'Real-time analytics', 'Predictive modeling'],
    links: {
      live: 'https://example.com',
      github: 'https://github.com/example'
    },
    startDate: '2026-03-01',
    endDate: '2026-09-01',
    budget: 50000,
    teamMembers: [],
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    createdBy: 'system'
  },
  {
    id: 'proj-002',
    slug: 'mobile-ecommerce',
    title: 'Mobile E-commerce Platform',
    description: 'A fully responsive e-commerce platform optimized for mobile devices with seamless payment integration and personalized shopping experience.',
    status: 'active',
    priority: 'medium',
    category: 'app',
    thumbnail: '/images/portfolio/ecommerce-thumb.jpg',
    images: [],
    techStack: ['React Native', 'Node.js', 'MongoDB', 'Stripe'],
    client: 'ShopEasy Inc.',
    duration: '4 months',
    highlights: ['Mobile-first design', 'Payment integration', 'Personalized recommendations'],
    links: {
      live: 'https://example.com',
      github: 'https://github.com/example'
    },
    startDate: '2026-02-15',
    endDate: '2026-06-15',
    budget: 35000,
    teamMembers: [],
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-02-15T09:00:00Z',
    createdBy: 'system'
  },
  {
    id: 'proj-003',
    slug: 'blockchain-supply-chain',
    title: 'Blockchain Supply Chain Tracker',
    description: 'A decentralized supply chain management system using blockchain technology to ensure transparency, traceability, and security.',
    status: 'paused',
    priority: 'high',
    category: 'website',
    thumbnail: '/images/portfolio/blockchain-thumb.jpg',
    images: [],
    techStack: ['Solidity', 'Ethereum', 'React', 'Node.js'],
    client: 'Global Logistics Partners',
    duration: '8 months',
    highlights: ['Blockchain transparency', 'Real-time tracking', 'Smart contracts'],
    links: {
      live: 'https://example.com',
      github: 'https://github.com/example'
    },
    startDate: '2026-01-10',
    endDate: '2026-09-10',
    budget: 75000,
    teamMembers: [],
    createdAt: '2026-01-10T11:00:00Z',
    updatedAt: '2026-01-10T11:00:00Z',
    createdBy: 'system'
  }
];

/**
 * 获取所有项目
 */
export function getProjects(): Project[] {
  return [...projects];
}

/**
 * 根据ID获取项目
 */
export function getProjectById(id: string): Project | undefined {
  return projects.find(project => project.id === id);
}
