/**
 * A2A Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  TaskState,
  TaskStatus,
  Part,
  Message,
  Artifact,
  Task,
  Skill,
  AgentCapabilities,
  SecurityScheme,
  AgentCard,
  SendMessageRequest,
  SendMessageConfiguration,
  GetTaskRequest,
  ListTasksRequest,
  ListTasksResponse,
  CancelTaskRequest,
  PushNotificationConfig,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  StreamEvent,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  A2AErrorCodes,
} from '../types';

describe('A2A Types', () => {
  describe('TaskState', () => {
    it('should support all task states', () => {
      const states: TaskState[] = [
        'submitted',
        'working',
        'input-required',
        'auth-required',
        'completed',
        'canceled',
        'failed',
        'rejected',
      ];

      expect(states.length).toBeGreaterThan(0);
    });
  });

  describe('A2AErrorCodes', () => {
    it('should have JSON-RPC standard errors', () => {
      expect(A2AErrorCodes.PARSE_ERROR).toBe(-32700);
      expect(A2AErrorCodes.INVALID_REQUEST).toBe(-32600);
      expect(A2AErrorCodes.METHOD_NOT_FOUND).toBe(-32601);
      expect(A2AErrorCodes.INVALID_PARAMS).toBe(-32602);
      expect(A2AErrorCodes.INTERNAL_ERROR).toBe(-32603);
    });

    it('should have A2A specific errors', () => {
      expect(A2AErrorCodes.TASK_NOT_FOUND).toBe(-32001);
      expect(A2AErrorCodes.TASK_NOT_CANCELABLE).toBe(-32002);
      expect(A2AErrorCodes.PUSH_NOTIFICATION_NOT_SUPPORTED).toBe(-32003);
      expect(A2AErrorCodes.UNSUPPORTED_OPERATION).toBe(-32004);
      expect(A2AErrorCodes.CONTENT_TYPE_NOT_SUPPORTED).toBe(-32005);
      expect(A2AErrorCodes.INVALID_AGENT_RESPONSE).toBe(-32006);
      expect(A2AErrorCodes.EXTENDED_AGENT_CARD_NOT_CONFIGURED).toBe(-32007);
      expect(A2AErrorCodes.EXTENSION_SUPPORT_REQUIRED).toBe(-32008);
      expect(A2AErrorCodes.VERSION_NOT_SUPPORTED).toBe(-32009);
    });
  });

  describe('Part', () => {
    it('should create text part', () => {
      const part: Part = {
        kind: 'text',
        text: 'Hello, world!',
      };

      expect(part.kind).toBe('text');
      expect(part.text).toBe('Hello, world!');
    });

    it('should create file part', () => {
      const part: Part = {
        kind: 'file',
        file: {
          name: 'document.pdf',
          mimeType: 'application/pdf',
          bytes: 'base64encodedbytes',
        },
      };

      expect(part.kind).toBe('file');
      expect(part.file?.name).toBe('document.pdf');
      expect(part.file?.mimeType).toBe('application/pdf');
    });

    it('should create data part', () => {
      const part: Part = {
        kind: 'data',
        data: {
          temperature: 23.5,
          humidity: 65,
        },
      };

      expect(part.kind).toBe('data');
      expect(part.data).toEqual({
        temperature: 23.5,
        humidity: 65,
      });
    });
  });

  describe('Message', () => {
    it('should create user message', () => {
      const message: Message = {
        kind: 'message',
        messageId: 'msg-123',
        role: 'user',
        parts: [
          { kind: 'text', text: 'Hello!' },
        ],
        createdAt: '2024-01-01T00:00:00Z',
      };

      expect(message.kind).toBe('message');
      expect(message.role).toBe('user');
      expect(message.parts).toHaveLength(1);
    });

    it('should create agent message', () => {
      const message: Message = {
        kind: 'message',
        messageId: 'msg-456',
        role: 'agent',
        parts: [
          { kind: 'text', text: 'Response' },
        ],
        createdAt: '2024-01-01T00:00:00Z',
      };

      expect(message.role).toBe('agent');
    });

    it('should support contextId', () => {
      const message: Message = {
        kind: 'message',
        messageId: 'msg-789',
        role: 'user',
        parts: [{ kind: 'text', text: 'Test' }],
        contextId: 'context-123',
        createdAt: '2024-01-01T00:00:00Z',
      };

      expect(message.contextId).toBe('context-123');
    });

    it('should support referenceTaskIds', () => {
      const message: Message = {
        kind: 'message',
        messageId: 'msg-101',
        role: 'user',
        parts: [{ kind: 'text', text: 'Follow-up' }],
        referenceTaskIds: ['task-1', 'task-2'],
        createdAt: '2024-01-01T00:00:00Z',
      };

      expect(message.referenceTaskIds).toEqual(['task-1', 'task-2']);
    });
  });

  describe('Artifact', () => {
    it('should create artifact with parts', () => {
      const artifact: Artifact = {
        artifactId: 'artifact-1',
        name: 'Generated Report',
        description: 'A summary report',
        parts: [
          { kind: 'text', text: 'Report content' },
        ],
        metadata: {
          generatedBy: 'agent-1',
        },
      };

      expect(artifact.artifactId).toBe('artifact-1');
      expect(artifact.name).toBe('Generated Report');
      expect(artifact.description).toBe('A summary report');
      expect(artifact.parts).toHaveLength(1);
      expect(artifact.metadata?.generatedBy).toBe('agent-1');
    });

    it('should create minimal artifact', () => {
      const artifact: Artifact = {
        artifactId: 'artifact-2',
        parts: [{ kind: 'text', text: 'Content' }],
      };

      expect(artifact.artifactId).toBe('artifact-2');
      expect(artifact.name).toBeUndefined();
      expect(artifact.description).toBeUndefined();
    });
  });

  describe('Task', () => {
    it('should create task with all fields', () => {
      const task: Task = {
        kind: 'task',
        id: 'task-123',
        contextId: 'context-456',
        status: {
          state: 'working',
          timestamp: '2024-01-01T00:00:00Z',
          message: 'Processing...',
        },
        history: [],
        artifacts: [],
        metadata: {
          priority: 'high',
        },
      };

      expect(task.kind).toBe('task');
      expect(task.id).toBe('task-123');
      expect(task.contextId).toBe('context-456');
      expect(task.status.state).toBe('working');
      expect(task.history).toEqual([]);
      expect(task.artifacts).toEqual([]);
    });

    it('should support different task states', () => {
      const states: TaskState[] = [
        'submitted',
        'working',
        'input-required',
        'auth-required',
        'completed',
        'canceled',
        'failed',
        'rejected',
      ];

      states.forEach((state) => {
        const task: Task = {
          kind: 'task',
          id: `task-${state}`,
          status: {
            state,
            timestamp: '2024-01-01T00:00:00Z',
          },
        };

        expect(task.status.state).toBe(state);
      });
    });
  });

  describe('Skill', () => {
    it('should create skill with all fields', () => {
      const skill: Skill = {
        id: 'skill-1',
        name: 'Text Generation',
        description: 'Generate text based on prompts',
        tags: ['nlp', 'generation'],
        examples: [
          'Write a poem about spring',
          'Summarize this article',
        ],
        inputModes: ['text/plain'],
        outputModes: ['text/plain', 'text/markdown'],
      };

      expect(skill.id).toBe('skill-1');
      expect(skill.name).toBe('Text Generation');
      expect(skill.tags).toEqual(['nlp', 'generation']);
      expect(skill.examples).toHaveLength(2);
      expect(skill.inputModes).toEqual(['text/plain']);
      expect(skill.outputModes).toEqual(['text/plain', 'text/markdown']);
    });

    it('should create minimal skill', () => {
      const skill: Skill = {
        id: 'skill-2',
        name: 'Basic Skill',
      };

      expect(skill.id).toBe('skill-2');
      expect(skill.name).toBe('Basic Skill');
      expect(skill.description).toBeUndefined();
      expect(skill.tags).toBeUndefined();
    });
  });

  describe('AgentCard', () => {
    it('should create minimal agent card', () => {
      const agentCard: AgentCard = {
        name: 'Test Agent',
        version: '1.0.0',
        protocolVersion: '0.3.0',
        url: 'https://example.com/agent',
        skills: [],
      };

      expect(agentCard.name).toBe('Test Agent');
      expect(agentCard.version).toBe('1.0.0');
      expect(agentCard.protocolVersion).toBe('0.3.0');
      expect(agentCard.url).toBe('https://example.com/agent');
      expect(agentCard.skills).toEqual([]);
    });

    it('should create full agent card', () => {
      const skill: Skill = {
        id: 'skill-1',
        name: 'Test Skill',
      };

      const capabilities: AgentCapabilities = {
        streaming: true,
        pushNotifications: true,
        stateTransitionHistory: true,
        extendedAgentCard: true,
      };

      const securityScheme: SecurityScheme = {
        type: 'http',
        description: 'Bearer token authentication',
        scheme: 'bearer',
      };

      const agentCard: AgentCard = {
        name: 'Full Agent',
        description: 'An agent with all fields',
        version: '2.0.0',
        protocolVersion: '0.3.0',
        url: 'https://example.com/agent',
        skills: [skill],
        capabilities,
        defaultInputModes: ['text/plain'],
        defaultOutputModes: ['text/plain', 'application/json'],
        securitySchemes: {
          bearerAuth: securityScheme,
        },
        security: [
          { bearerAuth: [] },
        ],
        documentationUrl: 'https://docs.example.com',
        provider: {
          organization: 'Example Org',
          url: 'https://example.com',
        },
      };

      expect(agentCard.name).toBe('Full Agent');
      expect(agentCard.capabilities?.streaming).toBe(true);
      expect(agentCard.securitySchemes?.bearerAuth).toBeDefined();
      expect(agentCard.provider?.organization).toBe('Example Org');
    });
  });

  describe('SendMessageRequest', () => {
    it('should create send message request', () => {
      const message: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
      };

      const configuration: SendMessageConfiguration = {
        blocking: true,
        historyLength: 10,
      };

      const request: SendMessageRequest = {
        message,
        configuration,
        metadata: {
          priority: 'high',
        },
      };

      expect(request.message.messageId).toBe('msg-1');
      expect(request.configuration?.blocking).toBe(true);
      expect(request.metadata?.priority).toBe('high');
    });
  });

  describe('ListTasksRequest', () => {
    it('should create list tasks request', () => {
      const request: ListTasksRequest = {
        contextId: 'context-123',
        status: 'completed',
        pageSize: 20,
        pageToken: 'token123',
        historyLength: 5,
        includeArtifacts: true,
      };

      expect(request.contextId).toBe('context-123');
      expect(request.status).toBe('completed');
      expect(request.pageSize).toBe(20);
      expect(request.pageToken).toBe('token123');
      expect(request.historyLength).toBe(5);
      expect(request.includeArtifacts).toBe(true);
    });

    it('should create minimal list tasks request', () => {
      const request: ListTasksRequest = {};

      expect(request.contextId).toBeUndefined();
      expect(request.status).toBeUndefined();
    });
  });

  describe('ListTasksResponse', () => {
    it('should create list tasks response', () => {
      const task: Task = {
        kind: 'task',
        id: 'task-1',
        status: {
          state: 'completed',
          timestamp: '2024-01-01T00:00:00Z',
        },
      };

      const response: ListTasksResponse = {
        tasks: [task],
        nextPageToken: 'next-page-token',
        pageSize: 20,
        totalSize: 100,
      };

      expect(response.tasks).toHaveLength(1);
      expect(response.nextPageToken).toBe('next-page-token');
      expect(response.pageSize).toBe(20);
      expect(response.totalSize).toBe(100);
    });
  });

  describe('TaskStatusUpdateEvent', () => {
    it('should create status update event', () => {
      const event: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: 'task-123',
        contextId: 'context-456',
        status: {
          state: 'completed',
          timestamp: '2024-01-01T00:00:00Z',
          message: 'Task completed successfully',
        },
        final: true,
        metadata: {
          duration: 5000,
        },
      };

      expect(event.kind).toBe('status-update');
      expect(event.taskId).toBe('task-123');
      expect(event.status.state).toBe('completed');
      expect(event.final).toBe(true);
    });
  });

  describe('TaskArtifactUpdateEvent', () => {
    it('should create artifact update event', () => {
      const artifact: Artifact = {
        artifactId: 'artifact-1',
        parts: [{ kind: 'text', text: 'Artifact content' }],
      };

      const event: TaskArtifactUpdateEvent = {
        kind: 'artifact-update',
        taskId: 'task-123',
        contextId: 'context-456',
        artifact,
        append: true,
        lastChunk: false,
        metadata: {
          chunkIndex: 1,
        },
      };

      expect(event.kind).toBe('artifact-update');
      expect(event.taskId).toBe('task-123');
      expect(event.artifact.artifactId).toBe('artifact-1');
      expect(event.append).toBe(true);
      expect(event.lastChunk).toBe(false);
    });
  });

  describe('JsonRpcRequest', () => {
    it('should create JSON-RPC request', () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'message/send',
        params: {
          message: {
            kind: 'message',
            messageId: 'msg-1',
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello' }],
          },
        },
        id: 'request-123',
      };

      expect(request.jsonrpc).toBe('2.0');
      expect(request.method).toBe('message/send');
      expect(request.id).toBe('request-123');
      expect(request.params).toBeDefined();
    });

    it('should create notification (no id)', () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/cancel',
        params: {
          id: 'task-123',
        },
      };

      expect(request.id).toBeUndefined();
    });
  });

  describe('JsonRpcResponse', () => {
    it('should create success response', () => {
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        result: { taskId: 'task-123' },
        id: 'request-123',
      };

      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toEqual({ taskId: 'task-123' });
      expect(response.id).toBe('request-123');
      expect(response.error).toBeUndefined();
    });

    it('should create error response', () => {
      const error: JsonRpcError = {
        code: -32601,
        message: 'Method not found',
        data: { method: 'unknown/method' },
      };

      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        error,
        id: 'request-123',
      };

      expect(response.jsonrpc).toBe('2.0');
      expect(response.error?.code).toBe(-32601);
      expect(response.error?.message).toBe('Method not found');
      expect(response.result).toBeUndefined();
    });

    it('should create error response with null id', () => {
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
        },
        id: null,
      };

      expect(response.id).toBe(null);
    });
  });

  describe('PushNotificationConfig', () => {
    it('should create push notification config', () => {
      const config: PushNotificationConfig = {
        id: 'push-123',
        url: 'https://example.com/push',
        token: 'token456',
        authentication: {
          schemes: ['bearer'],
          credentials: 'secret-token',
        },
      };

      expect(config.id).toBe('push-123');
      expect(config.url).toBe('https://example.com/push');
      expect(config.token).toBe('token456');
      expect(config.authentication?.schemes).toEqual(['bearer']);
    });
  });

  describe('StreamEvent', () => {
    it('should accept task as stream event', () => {
      const task: Task = {
        kind: 'task',
        id: 'task-123',
        status: {
          state: 'working',
          timestamp: '2024-01-01T00:00:00Z',
        },
      };

      const event: StreamEvent = task;

      expect(event.kind).toBe('task');
    });

    it('should accept message as stream event', () => {
      const message: Message = {
        kind: 'message',
        messageId: 'msg-123',
        role: 'agent',
        parts: [{ kind: 'text', text: 'Response' }],
        createdAt: '2024-01-01T00:00:00Z',
      };

      const event: StreamEvent = message;

      expect(event.kind).toBe('message');
    });

    it('should accept status update as stream event', () => {
      const statusEvent: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: 'task-123',
        status: {
          state: 'working',
          timestamp: '2024-01-01T00:00:00Z',
        },
        final: false,
      };

      const event: StreamEvent = statusEvent;

      expect(event.kind).toBe('status-update');
    });

    it('should accept artifact update as stream event', () => {
      const artifactEvent: TaskArtifactUpdateEvent = {
        kind: 'artifact-update',
        taskId: 'task-123',
        artifact: {
          artifactId: 'artifact-1',
          parts: [{ kind: 'text', text: 'Content' }],
        },
      };

      const event: StreamEvent = artifactEvent;

      expect(event.kind).toBe('artifact-update');
    });
  });
});
