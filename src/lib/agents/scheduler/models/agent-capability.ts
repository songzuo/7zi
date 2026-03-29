/**
 * Agent Capability Model
 * Defines the capabilities and characteristics of AI agents in the scheduling system
 */

export type AgentProvider = 'minimax' | 'bailian' | 'volcengine' | 'self-claude';

export type TaskType = 
  | 'architecture' 
  | 'research' 
  | 'implementation' 
  | 'testing' 
  | 'devops' 
  | 'design' 
  | 'marketing' 
  | 'sales' 
  | 'finance' 
  | 'media' 
  | 'general';

export interface AgentCapabilities {
  /** Technologies and frameworks the agent is proficient in */
  techStack: string[];
  
  /** Types of tasks the agent can handle */
  taskTypes: TaskType[];
  
  /** Maximum concurrent tasks the agent can handle */
  concurrency: number;
  
  /** Average response time in seconds */
  avgResponseTime: number;
  
  /** Task success rate (0-1) */
  successRate: number;
  
  /** Specialized domains or areas */
  specializations?: string[];
}

export interface AgentCapability {
  /** Unique identifier for the agent */
  agentId: string;
  
  /** Human-readable name */
  name: string;
  
  /** AI provider */
  provider: AgentProvider;
  
  /** Agent capabilities */
  capabilities: AgentCapabilities;
  
  /** Current workload percentage (0-100) */
  currentLoad: number;
  
  /** Whether the agent is available for new tasks */
  availability: boolean;
  
  /** Last active timestamp (Unix timestamp) */
  lastActiveTime: number;
  
  /** Agent role in the team */
  role: string;
  
  /** Performance metrics */
  metrics?: {
    totalTasksCompleted: number;
    averageCompletionTime: number;
    errorRate: number;
  };
}

/**
 * Agent capability configuration for the 11 AI team members
 */
export const AGENT_CAPABILITIES_CONFIG: Record<string, Omit<AgentCapability, 'currentLoad' | 'availability' | 'lastActiveTime'>> = {
  'agent-expert': {
    agentId: 'agent-expert',
    name: '智能体世界专家',
    provider: 'minimax',
    role: '视角转换、未来布局',
    capabilities: {
      techStack: ['multi-agent-systems', 'ai-architecture', 'future-tech', 'strategic-planning'],
      taskTypes: ['architecture', 'research', 'general'],
      concurrency: 3,
      avgResponseTime: 8,
      successRate: 0.95,
      specializations: ['agent-orchestration', 'distributed-systems', 'emerging-tech']
    },
    metrics: {
      totalTasksCompleted: 45,
      averageCompletionTime: 15,
      errorRate: 0.05
    }
  },
  
  'consultant': {
    agentId: 'consultant',
    name: '咨询师',
    provider: 'minimax',
    role: '研究分析',
    capabilities: {
      techStack: ['research', 'analysis', 'data-science', 'documentation'],
      taskTypes: ['research', 'general'],
      concurrency: 4,
      avgResponseTime: 6,
      successRate: 0.97,
      specializations: ['market-analysis', 'technical-research', 'competitive-analysis']
    },
    metrics: {
      totalTasksCompleted: 78,
      averageCompletionTime: 12,
      errorRate: 0.03
    }
  },
  
  'architect': {
    agentId: 'architect',
    name: '架构师',
    provider: 'self-claude',
    role: '架构设计',
    capabilities: {
      techStack: ['typescript', 'react', 'nextjs', 'nodejs', 'architecture-patterns', 'system-design'],
      taskTypes: ['architecture', 'implementation'],
      concurrency: 2,
      avgResponseTime: 12,
      successRate: 0.96,
      specializations: ['microservices', 'scalability', 'performance-optimization']
    },
    metrics: {
      totalTasksCompleted: 56,
      averageCompletionTime: 20,
      errorRate: 0.04
    }
  },
  
  'executor': {
    agentId: 'executor',
    name: 'Executor',
    provider: 'volcengine',
    role: '执行实现',
    capabilities: {
      techStack: ['javascript', 'typescript', 'python', 'automation', 'testing'],
      taskTypes: ['implementation', 'testing'],
      concurrency: 5,
      avgResponseTime: 5,
      successRate: 0.94,
      specializations: ['code-implementation', 'automation', 'rapid-prototyping']
    },
    metrics: {
      totalTasksCompleted: 120,
      averageCompletionTime: 8,
      errorRate: 0.06
    }
  },
  
  'sysadmin': {
    agentId: 'sysadmin',
    name: '系统管理员',
    provider: 'bailian',
    role: '运维部署',
    capabilities: {
      techStack: ['docker', 'kubernetes', 'aws', 'linux', 'monitoring', 'ci-cd'],
      taskTypes: ['devops', 'implementation'],
      concurrency: 3,
      avgResponseTime: 7,
      successRate: 0.98,
      specializations: ['deployment', 'infrastructure', 'security']
    },
    metrics: {
      totalTasksCompleted: 67,
      averageCompletionTime: 10,
      errorRate: 0.02
    }
  },
  
  'tester': {
    agentId: 'tester',
    name: '测试员',
    provider: 'minimax',
    role: '测试调试',
    capabilities: {
      techStack: ['jest', 'vitest', 'playwright', 'testing', 'debugging'],
      taskTypes: ['testing', 'implementation'],
      concurrency: 4,
      avgResponseTime: 6,
      successRate: 0.95,
      specializations: ['unit-testing', 'e2e-testing', 'performance-testing']
    },
    metrics: {
      totalTasksCompleted: 95,
      averageCompletionTime: 9,
      errorRate: 0.05
    }
  },
  
  'designer': {
    agentId: 'designer',
    name: '设计师',
    provider: 'self-claude',
    role: 'UI设计',
    capabilities: {
      techStack: ['react', 'css', 'tailwind', 'figma', 'ux-design'],
      taskTypes: ['design', 'implementation'],
      concurrency: 3,
      avgResponseTime: 10,
      successRate: 0.93,
      specializations: ['ui-design', 'ux-optimization', 'responsive-design']
    },
    metrics: {
      totalTasksCompleted: 42,
      averageCompletionTime: 18,
      errorRate: 0.07
    }
  },
  
  'promoter': {
    agentId: 'promoter',
    name: '推广专员',
    provider: 'volcengine',
    role: '推广SEO',
    capabilities: {
      techStack: ['seo', 'content-marketing', 'analytics', 'social-media'],
      taskTypes: ['marketing', 'research'],
      concurrency: 4,
      avgResponseTime: 5,
      successRate: 0.92,
      specializations: ['seo-optimization', 'content-strategy', 'growth-hacking']
    },
    metrics: {
      totalTasksCompleted: 38,
      averageCompletionTime: 7,
      errorRate: 0.08
    }
  },
  
  'sales': {
    agentId: 'sales',
    name: '销售客服',
    provider: 'bailian',
    role: '销售客服',
    capabilities: {
      techStack: ['crm', 'communication', 'customer-success', 'analytics'],
      taskTypes: ['sales', 'general'],
      concurrency: 5,
      avgResponseTime: 4,
      successRate: 0.96,
      specializations: ['customer-support', 'sales-automation', 'lead-generation']
    },
    metrics: {
      totalTasksCompleted: 110,
      averageCompletionTime: 6,
      errorRate: 0.04
    }
  },
  
  'finance': {
    agentId: 'finance',
    name: '财务',
    provider: 'minimax',
    role: '财务会计',
    capabilities: {
      techStack: ['accounting', 'financial-analysis', 'budgeting', 'reporting'],
      taskTypes: ['finance', 'research'],
      concurrency: 2,
      avgResponseTime: 9,
      successRate: 0.98,
      specializations: ['budget-management', 'financial-reporting', 'cost-optimization']
    },
    metrics: {
      totalTasksCompleted: 32,
      averageCompletionTime: 14,
      errorRate: 0.02
    }
  },
  
  'media': {
    agentId: 'media',
    name: '媒体',
    provider: 'self-claude',
    role: '媒体宣传',
    capabilities: {
      techStack: ['content-creation', 'social-media', 'video', 'branding'],
      taskTypes: ['media', 'marketing'],
      concurrency: 3,
      avgResponseTime: 11,
      successRate: 0.91,
      specializations: ['content-production', 'brand-strategy', 'media-relations']
    },
    metrics: {
      totalTasksCompleted: 28,
      averageCompletionTime: 16,
      errorRate: 0.09
    }
  }
};

/**
 * Create an agent capability instance with default runtime values
 */
export function createAgentCapability(
  config: Omit<AgentCapability, 'currentLoad' | 'availability' | 'lastActiveTime'>
): AgentCapability {
  return {
    ...config,
    currentLoad: 0,
    availability: true,
    lastActiveTime: Date.now()
  };
}

/**
 * Initialize all agents from configuration
 */
export function initializeAgents(): Map<string, AgentCapability> {
  const agents = new Map<string, AgentCapability>();
  
  for (const [id, config] of Object.entries(AGENT_CAPABILITIES_CONFIG)) {
    agents.set(id, createAgentCapability(config));
  }
  
  return agents;
}
