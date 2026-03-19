/**
 * Tests for agent-communication/types.ts
 */

import { describe, it, expect } from 'vitest';
import {
  MessageType,
  MessagePriority,
  MessageStatus,
  PROTOCOL_VERSION,
  AgentMessageEnvelope,
  AgentEndpoint,
  MessageMetadata,
  MessageAck,
  TaskPayload,
  CollaborationPayload,
  DataPayload,
  NotificationPayload,
  HeartbeatPayload,
  CapabilityPayload,
  MeetingPayload,
  VotePayload,
  VoteOption,
  VoteResult,
  MessageHandler,
  MessageFilter,
  MessageTransformer,
  CommunicationConfig,
  CommunicationStats,
  MessageSubscription,
} from '../types';

describe('types.ts - MessageType', () => {
  it('should have all expected message types', () => {
    // Task related
    expect(MessageType.TASK_ASSIGN).toBe('task_assign');
    expect(MessageType.TASK_ACCEPT).toBe('task_accept');
    expect(MessageType.TASK_REJECT).toBe('task_reject');
    expect(MessageType.TASK_COMPLETE).toBe('task_complete');
    expect(MessageType.TASK_FAIL).toBe('task_fail');
    expect(MessageType.TASK_QUERY).toBe('task_query');
    expect(MessageType.TASK_UPDATE).toBe('task_update');

    // Collaboration related
    expect(MessageType.COLLAB_REQUEST).toBe('collab_request');
    expect(MessageType.COLLAB_ACCEPT).toBe('collab_accept');
    expect(MessageType.COLLAB_REJECT).toBe('collab_reject');
    expect(MessageType.COLLAB_SYNC).toBe('collab_sync');

    // Data related
    expect(MessageType.DATA_REQUEST).toBe('data_request');
    expect(MessageType.DATA_RESPONSE).toBe('data_response');
    expect(MessageType.DATA_PUSH).toBe('data_push');

    // Notification related
    expect(MessageType.NOTIFY_INFO).toBe('notify_info');
    expect(MessageType.NOTIFY_WARNING).toBe('notify_warning');
    expect(MessageType.NOTIFY_ERROR).toBe('notify_error');
    expect(MessageType.NOTIFY_SUCCESS).toBe('notify_success');

    // System related
    expect(MessageType.HEARTBEAT).toBe('heartbeat');
    expect(MessageType.HEARTBEAT_ACK).toBe('heartbeat_ack');
    expect(MessageType.STATUS_UPDATE).toBe('status_update');
    expect(MessageType.CAPABILITY_QUERY).toBe('capability_query');
    expect(MessageType.CAPABILITY_RESPONSE).toBe('capability_response');

    // Meeting related
    expect(MessageType.MEETING_INVITE).toBe('meeting_invite');
    expect(MessageType.MEETING_ACCEPT).toBe('meeting_accept');
    expect(MessageType.MEETING_REJECT).toBe('meeting_reject');
    expect(MessageType.MEETING_START).toBe('meeting_start');
    expect(MessageType.MEETING_END).toBe('meeting_end');
    expect(MessageType.MEETING_MESSAGE).toBe('meeting_message');

    // Vote related
    expect(MessageType.VOTE_START).toBe('vote_start');
    expect(MessageType.VOTE_CAST).toBe('vote_cast');
    expect(MessageType.VOTE_RESULT).toBe('vote_result');

    // Custom
    expect(MessageType.CUSTOM).toBe('custom');
  });

  it('should have all message types as strings', () => {
    Object.values(MessageType).forEach(type => {
      expect(typeof type).toBe('string');
    });
  });
});

describe('types.ts - MessagePriority', () => {
  it('should have all expected priority levels', () => {
    expect(MessagePriority.LOW).toBe('low');
    expect(MessagePriority.NORMAL).toBe('normal');
    expect(MessagePriority.HIGH).toBe('high');
    expect(MessagePriority.URGENT).toBe('urgent');
  });

  it('should have all priorities as strings', () => {
    Object.values(MessagePriority).forEach(priority => {
      expect(typeof priority).toBe('string');
    });
  });
});

describe('types.ts - MessageStatus', () => {
  it('should have all expected status values', () => {
    expect(MessageStatus.PENDING).toBe('pending');
    expect(MessageStatus.SENT).toBe('sent');
    expect(MessageStatus.DELIVERED).toBe('delivered');
    expect(MessageStatus.READ).toBe('read');
    expect(MessageStatus.FAILED).toBe('failed');
    expect(MessageStatus.EXPIRED).toBe('expired');
  });

  it('should have all statuses as strings', () => {
    Object.values(MessageStatus).forEach(status => {
      expect(typeof status).toBe('string');
    });
  });
});

describe('types.ts - PROTOCOL_VERSION', () => {
  it('should have a valid protocol version', () => {
    expect(PROTOCOL_VERSION).toBe('1.0.0');
    expect(typeof PROTOCOL_VERSION).toBe('string');
  });
});

describe('types.ts - AgentEndpoint', () => {
  it('should create endpoint with required fields', () => {
    const endpoint: AgentEndpoint = {
      agentId: 'agent-123',
    };
    expect(endpoint.agentId).toBe('agent-123');
  });

  it('should create endpoint with optional fields', () => {
    const endpoint: AgentEndpoint = {
      agentId: 'agent-123',
      role: 'worker',
      name: 'Worker Agent',
      sessionId: 'session-456',
    };
    expect(endpoint.agentId).toBe('agent-123');
    expect(endpoint.role).toBe('worker');
    expect(endpoint.name).toBe('Worker Agent');
    expect(endpoint.sessionId).toBe('session-456');
  });
});

describe('types.ts - MessageMetadata', () => {
  it('should create metadata with tags', () => {
    const metadata: MessageMetadata = {
      traceId: 'trace-123',
      spanId: 'span-456',
      tags: {
        environment: 'production',
        version: '1.0',
      },
    };
    expect(metadata.traceId).toBe('trace-123');
    expect(metadata.spanId).toBe('span-456');
    expect(metadata.tags).toBeDefined();
    expect(metadata.tags?.environment).toBe('production');
  });

  it('should create metadata with retry info', () => {
    const metadata: MessageMetadata = {
      retryCount: 3,
      maxRetries: 5,
      source: 'api-gateway',
    };
    expect(metadata.retryCount).toBe(3);
    expect(metadata.maxRetries).toBe(5);
    expect(metadata.source).toBe('api-gateway');
  });

  it('should allow custom metadata fields', () => {
    const metadata: MessageMetadata = {
      traceId: 'trace-123',
      customField: 'custom-value',
      customNumber: 42,
      customBoolean: true,
    };
    expect(metadata.customField).toBe('custom-value');
    expect(metadata.customNumber).toBe(42);
    expect(metadata.customBoolean).toBe(true);
  });
});

describe('types.ts - AgentMessageEnvelope', () => {
  it('should create minimal valid message', () => {
    const message: AgentMessageEnvelope = {
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date(),
      from: { agentId: 'agent-1' },
      to: { agentId: 'agent-2' },
      type: MessageType.TASK_ASSIGN,
      priority: MessagePriority.NORMAL,
      payload: { data: 'test' },
    };

    expect(message.messageId).toBe('msg-123');
    expect(message.from.agentId).toBe('agent-1');
    expect((Array.isArray(message.to) ? message.to[0] : message.to).agentId).toBe('agent-2');
    expect(message.type).toBe(MessageType.TASK_ASSIGN);
  });

  it('should create message with all optional fields', () => {
    const message: AgentMessageEnvelope = {
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date(),
      from: { agentId: 'agent-1', role: 'sender' },
      to: [
        { agentId: 'agent-2' },
        { agentId: 'agent-3' },
      ],
      type: MessageType.NOTIFY_INFO,
      priority: MessagePriority.HIGH,
      ttl: 3600,
      correlationId: 'corr-123',
      replyTo: 'agent-reply',
      payload: { data: 'test' },
      metadata: {
        traceId: 'trace-123',
        tags: { key: 'value' },
      },
    };

    expect(message.ttl).toBe(3600);
    expect(message.correlationId).toBe('corr-123');
    expect(message.replyTo).toBe('agent-reply');
    expect(Array.isArray(message.to)).toBe(true);
    expect(message.to).toHaveLength(2);
  });
});

describe('types.ts - MessageAck', () => {
  it('should create acknowledgment for success', () => {
    const ack: MessageAck = {
      messageId: 'msg-123',
      status: MessageStatus.DELIVERED,
      timestamp: new Date(),
    };
    expect(ack.messageId).toBe('msg-123');
    expect(ack.status).toBe(MessageStatus.DELIVERED);
    expect(ack.error).toBeUndefined();
  });

  it('should create acknowledgment with error', () => {
    const ack: MessageAck = {
      messageId: 'msg-123',
      status: MessageStatus.FAILED,
      timestamp: new Date(),
      error: {
        code: 'TIMEOUT',
        message: 'Request timeout',
      },
    };
    expect(ack.status).toBe(MessageStatus.FAILED);
    expect(ack.error?.code).toBe('TIMEOUT');
    expect(ack.error?.message).toBe('Request timeout');
  });
});

describe('types.ts - TaskPayload', () => {
  it('should create task payload with required fields', () => {
    const task: TaskPayload = {
      taskId: 'task-123',
      taskType: 'processing',
      title: 'Process Data',
      description: 'Process the input data',
      priority: 'high',
    };
    expect(task.taskId).toBe('task-123');
    expect(task.priority).toBe('high');
  });

  it('should create task payload with optional fields', () => {
    const task: TaskPayload = {
      taskId: 'task-123',
      taskType: 'processing',
      title: 'Process Data',
      description: 'Process the input data',
      priority: 'medium',
      deadline: new Date('2024-12-31'),
      dependencies: ['task-100', 'task-101'],
      parameters: { timeout: 5000 },
      context: { userId: 'user-1' },
    };
    expect(task.deadline).toBeDefined();
    expect(task.dependencies).toHaveLength(2);
    expect(task.parameters?.timeout).toBe(5000);
  });
});

describe('types.ts - CollaborationPayload', () => {
  it('should create collaboration payload', () => {
    const collab: CollaborationPayload = {
      collaborationId: 'collab-123',
      type: 'sync',
      resource: 'database',
      action: 'read',
      data: { query: 'SELECT *' },
      permissions: ['read', 'write'],
    };
    expect(collab.collaborationId).toBe('collab-123');
    expect(collab.type).toBe('sync');
    expect(collab.permissions).toContain('read');
  });
});

describe('types.ts - DataPayload', () => {
  it('should create data payload for query', () => {
    const data: DataPayload = {
      dataType: 'user',
      action: 'query',
      query: { status: 'active' },
      pagination: { page: 1, limit: 10 },
    };
    expect(data.dataType).toBe('user');
    expect(data.action).toBe('query');
    expect(data.query?.status).toBe('active');
  });

  it('should create data payload with results', () => {
    const data: DataPayload = {
      dataType: 'user',
      action: 'query',
      query: { status: 'active' },
      pagination: { page: 1, limit: 10, total: 100 },
    };
    expect(data.pagination?.total).toBe(100);
  });
});

describe('types.ts - NotificationPayload', () => {
  it('should create notification payload', () => {
    const notification: NotificationPayload = {
      title: 'System Update',
      content: 'System will be updated tonight',
      level: 'warning',
      action: {
        type: 'button',
        target: '/schedule',
        label: 'View Schedule',
      },
      persistent: true,
      expiresAt: new Date('2024-12-31'),
    };
    expect(notification.level).toBe('warning');
    expect(notification.action?.label).toBe('View Schedule');
    expect(notification.persistent).toBe(true);
  });
});

describe('types.ts - HeartbeatPayload', () => {
  it('should create heartbeat payload', () => {
    const heartbeat: HeartbeatPayload = {
      status: 'active',
      load: 75,
      queueSize: 10,
      uptime: 3600,
      metrics: {
        cpu: 80,
        memory: 60,
      },
    };
    expect(heartbeat.status).toBe('active');
    expect(heartbeat.load).toBe(75);
    expect(heartbeat.metrics?.cpu).toBe(80);
  });
});

describe('types.ts - CapabilityPayload', () => {
  it('should create capability payload', () => {
    const capability: CapabilityPayload = {
      capabilities: ['text-processing', 'image-analysis'],
      skills: ['summarization', 'classification'],
      limitations: ['max-input: 10MB'],
      preferences: { model: 'fast', language: 'en' },
    };
    expect(capability.capabilities).toHaveLength(2);
    expect(capability.skills).toContain('summarization');
    expect(capability.limitations?.[0]).toBe('max-input: 10MB');
  });
});

describe('types.ts - MeetingPayload', () => {
  it('should create meeting payload', () => {
    const meeting: MeetingPayload = {
      meetingId: 'meeting-123',
      title: 'Weekly Sync',
      description: 'Team synchronization meeting',
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T11:00:00Z'),
      participants: [
        { agentId: 'agent-1', name: 'Alice' },
        { agentId: 'agent-2', name: 'Bob' },
      ],
      agenda: ['Review progress', 'Plan next week'],
      type: 'standup',
    };
    expect(meeting.meetingId).toBe('meeting-123');
    expect(meeting.participants).toHaveLength(2);
    expect(meeting.agenda).toContain('Review progress');
  });
});

describe('types.ts - VotePayload and VoteOption', () => {
  it('should create vote payload', () => {
    const vote: VotePayload = {
      voteId: 'vote-123',
      topic: 'Choose framework',
      description: 'Vote for the best framework',
      options: [
        { id: 'opt-1', label: 'React' },
        { id: 'opt-2', label: 'Vue' },
      ],
      deadline: new Date('2024-12-31'),
      anonymous: true,
      quorum: 5,
    };
    expect(vote.voteId).toBe('vote-123');
    expect(vote.options).toHaveLength(2);
    expect(vote.anonymous).toBe(true);
  });

  it('should create vote option', () => {
    const option: VoteOption = {
      id: 'opt-1',
      label: 'React',
      description: 'React.js framework',
    };
    expect(option.id).toBe('opt-1');
    expect(option.label).toBe('React');
  });
});

describe('types.ts - VoteResult', () => {
  it('should create vote result', () => {
    const result: VoteResult = {
      voteId: 'vote-123',
      totalVotes: 10,
      results: [
        { optionId: 'opt-1', count: 7, percentage: 70 },
        { optionId: 'opt-2', count: 3, percentage: 30 },
      ],
      winner: 'opt-1',
      completedAt: new Date(),
    };
    expect(result.totalVotes).toBe(10);
    expect(result.results).toHaveLength(2);
    expect(result.winner).toBe('opt-1');
  });
});

describe('types.ts - Type Definitions', () => {
  it('should define MessageHandler as a function type', () => {
    const handler: MessageHandler = async (message) => {
      return undefined;
    };
    expect(typeof handler).toBe('function');
  });

  it('should define MessageFilter as a function type', () => {
    const filter: MessageFilter = (message) => {
      return message.type === MessageType.TASK_ASSIGN;
    };
    expect(typeof filter).toBe('function');
  });

  it('should define MessageTransformer as a function type', () => {
    const transformer: MessageTransformer = (message) => {
      return message;
    };
    expect(typeof transformer).toBe('function');
  });
});

describe('types.ts - CommunicationConfig', () => {
  it('should create communication config', () => {
    const config: CommunicationConfig = {
      endpoint: 'ws://localhost:8080',
      reconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      defaultTTL: 3600,
      maxMessageSize: 1024 * 1024,
      ackTimeout: 30000,
      heartbeatInterval: 30000,
      heartbeatTimeout: 60000,
      queueSize: 1000,
      persistMessages: true,
      encryptMessages: false,
      verifySignatures: false,
    };
    expect(config.endpoint).toBe('ws://localhost:8080');
    expect(config.reconnect).toBe(true);
    expect(config.heartbeatInterval).toBe(30000);
  });
});

describe('types.ts - CommunicationStats', () => {
  it('should create communication stats', () => {
    const stats: CommunicationStats = {
      messagesSent: 100,
      messagesReceived: 95,
      messagesFailed: 5,
      averageLatency: 150,
      queueSize: 10,
      lastHeartbeat: new Date(),
      uptime: 3600,
    };
    expect(stats.messagesSent).toBe(100);
    expect(stats.averageLatency).toBe(150);
    expect(stats.uptime).toBe(3600);
  });
});

describe('types.ts - MessageSubscription', () => {
  it('should create message subscription', () => {
    const filter: MessageFilter = (message) => message.type === MessageType.TASK_ASSIGN;
    const handler: MessageHandler = async () => undefined;
    const subscription: MessageSubscription = {
      id: 'sub-123',
      filter,
      handler,
      createdAt: new Date(),
    };
    expect(subscription.id).toBe('sub-123');
    expect(typeof subscription.filter).toBe('function');
    expect(typeof subscription.handler).toBe('function');
  });
});
