/**
 * A2A Agent Card - 7zi Agent capability declaration
 */

import { AgentCard } from './types';

/**
 * 7zi Agent Card - Public declaration of agent capabilities
 * This is the core of A2A protocol - describes what the agent can do
 */
export function createAgentCard(baseUrl: string = 'http://localhost:3000'): AgentCard {
  const protocolVersion = '0.3.0';
  const agentVersion = '1.0.0';

  return {
    name: '7zi Agent',
    description: 'A2A-compliant AI agent for intelligent task processing, chat, and analysis. Part of the 7zi ecosystem.',
    version: agentVersion,
    protocolVersion,
    url: `${baseUrl}/api/a2a/jsonrpc`,

    // Skills - what this agent can do
    skills: [
      {
        id: 'chat',
        name: 'Chat',
        description: 'Interactive conversation and Q&A capabilities',
        tags: ['chat', 'conversation', 'question-answering'],
        examples: [
          'Hello, how are you?',
          'Can you help me with something?',
          'Tell me about yourself',
        ],
        inputModes: ['text/plain'],
        outputModes: ['text/plain'],
      },
      {
        id: 'analyze',
        name: 'Analyze',
        description: 'Analyze and process information, documents, or data',
        tags: ['analysis', 'processing', 'information'],
        examples: [
          'Analyze this document',
          'What are the key points?',
          'Summarize this for me',
        ],
        inputModes: ['text/plain', 'application/json'],
        outputModes: ['text/plain', 'application/json'],
      },
      {
        id: 'task',
        name: 'Task Management',
        description: 'Create, manage, and track tasks with status updates',
        tags: ['task', 'management', 'workflow'],
        examples: [
          'Create a new task',
          'Check my task status',
          'Cancel my task',
        ],
        inputModes: ['text/plain'],
        outputModes: ['text/plain', 'application/json'],
      },
    ],

    // Capabilities
    capabilities: {
      streaming: true,           // Supports SSE streaming
      pushNotifications: false,  // Webhook notifications (not implemented yet)
      stateTransitionHistory: true,  // Maintains message history
      extendedAgentCard: true,   // Has extended card for authenticated users
    },

    // Default input/output modes
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['text/plain', 'application/json'],

    // Additional interfaces (multiple transport support)
    additionalInterfaces: [
      {
        url: `${baseUrl}/api/a2a/jsonrpc`,
        transport: 'JSONRPC',
      },
      {
        url: `${baseUrl}/api/a2a/rest`,
        transport: 'HTTP+JSON',
      },
    ],

    // Security schemes (OpenAPI-style)
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer token authentication',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API Key authentication',
      },
    },

    // Security requirements (none required for public access)
    security: [],

    // Documentation
    documentationUrl: `${baseUrl}/docs/a2a`,

    // Provider info
    provider: {
      organization: '7zi',
      url: 'https://7zi.com',
    },
  };
}

/**
 * Extended Agent Card - for authenticated users
 * Contains additional capabilities visible only to authenticated clients
 */
export function createExtendedAgentCard(baseUrl: string = 'http://localhost:3000'): AgentCard {
  const baseCard = createAgentCard(baseUrl);

  return {
    ...baseCard,
    skills: [
      ...baseCard.skills,
      {
        id: 'admin',
        name: 'Admin Operations',
        description: 'Administrative operations for authenticated users',
        tags: ['admin', 'management', 'configuration'],
        examples: [
          'List all tasks',
          'Cleanup old tasks',
          'View system metrics',
        ],
        inputModes: ['text/plain', 'application/json'],
        outputModes: ['application/json'],
      },
    ],
  };
}

// Default agent card instance
let defaultAgentCard: AgentCard | null = null;
let extendedAgentCard: AgentCard | null = null;

export function getAgentCard(baseUrl?: string): AgentCard {
  if (!defaultAgentCard || baseUrl) {
    defaultAgentCard = createAgentCard(baseUrl || process.env.A2A_BASE_URL || 'http://localhost:3000');
  }
  return defaultAgentCard;
}

export function getExtendedAgentCard(baseUrl?: string): AgentCard {
  if (!extendedAgentCard || baseUrl) {
    extendedAgentCard = createExtendedAgentCard(baseUrl || process.env.A2A_BASE_URL || 'http://localhost:3000');
  }
  return extendedAgentCard;
}

// Reset cards (useful for testing)
export function resetAgentCards(): void {
  defaultAgentCard = null;
  extendedAgentCard = null;
}