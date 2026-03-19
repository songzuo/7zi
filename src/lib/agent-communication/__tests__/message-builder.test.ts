/**
 * Tests for agent-communication/message-builder.ts
 */

import { describe, it, expect, vi } from 'vitest';
import {
  MessageBuilder,
  Message,
  MessageParser,
} from '../message-builder';
import {
  MessageType,
  MessagePriority,
  AgentMessageEnvelope,
  AgentEndpoint,
  TaskPayload,
  CollaborationPayload,
  DataPayload,
  NotificationPayload,
  HeartbeatPayload,
  CapabilityPayload,
  MeetingPayload,
  VotePayload,
} from '../types';

// Helper types for testing
type MessagePayload =
  | TaskPayload
  | CollaborationPayload
  | DataPayload
  | NotificationPayload
  | HeartbeatPayload
  | CapabilityPayload
  | MeetingPayload
  | VotePayload
  | Record<string, unknown>;

describe('MessageBuilder - Basic Construction', () => {
  it('should create a new message builder', () => {
    const builder = MessageBuilder.create();
    expect(builder).toBeInstanceOf(MessageBuilder);
  });

  it('should create message with default values', () => {
    const builder = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .type(MessageType.TASK_ASSIGN)
      .payload({ data: 'test' });

    const message = builder.build();

    expect(message.version).toBe('1.0.0');
    expect(message.messageId).toBeDefined();
    expect(message.timestamp).toBeInstanceOf(Date);
    expect(message.priority).toBe(MessagePriority.NORMAL);
    expect(message.from.agentId).toBe('agent-1');
    expect((Array.isArray(message.to) ? message.to[0] : message.to).agentId).toBe('agent-2');
    expect(message.type).toBe(MessageType.TASK_ASSIGN);
  });

  it('should create message from existing message', () => {
    const original: AgentMessageEnvelope = {
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date('2024-01-01'),
      from: { agentId: 'agent-1' },
      to: { agentId: 'agent-2' },
      type: MessageType.TASK_ASSIGN,
      priority: MessagePriority.HIGH,
      payload: { data: 'original' },
    };

    const builder = MessageBuilder.from(original);
    const newMessage = builder.build();

    expect(newMessage.messageId).not.toBe(original.messageId);
    expect(newMessage.timestamp.getTime()).toBeGreaterThan(original.timestamp.getTime());
    expect(newMessage.correlationId).toBe(original.messageId);
    expect(newMessage.replyTo).toBe('agent-1');
    expect(newMessage.from).toEqual(original.from);
    expect(newMessage.to).toEqual(original.to);
  });

  it('should create reply to existing message', () => {
    const original: AgentMessageEnvelope = {
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date(),
      from: { agentId: 'agent-1' },
      to: { agentId: 'agent-2' },
      type: MessageType.TASK_ASSIGN,
      priority: MessagePriority.NORMAL,
      payload: { data: 'original' },
    };

    const reply = MessageBuilder.from(original)
      .payload({ data: 'reply' })
      .type(MessageType.TASK_COMPLETE)
      .build();

    expect(reply.correlationId).toBe('msg-123');
    expect(reply.replyTo).toBe('agent-1');
    expect(reply.type).toBe(MessageType.TASK_COMPLETE);
  });
});

describe('MessageBuilder - Fluent API', () => {
  it('should chain all methods', () => {
    const message = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .type(MessageType.TASK_ASSIGN)
      .priority(MessagePriority.HIGH)
      .payload({ task: 'test' })
      .correlationId('corr-123')
      .replyTo('agent-reply')
      .ttl(3600)
      .metadata({ traceId: 'trace-123' })
      .build();

    expect(message.from.agentId).toBe('agent-1');
    expect((Array.isArray(message.to) ? message.to[0] : message.to).agentId).toBe('agent-2');
    expect(message.priority).toBe(MessagePriority.HIGH);
    expect(message.correlationId).toBe('corr-123');
    expect(message.replyTo).toBe('agent-reply');
    expect(message.ttl).toBe(3600);
    expect(message.metadata?.traceId).toBe('trace-123');
  });

  it('should set high priority with shortcut', () => {
    const message = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .highPriority()
      .build();

    expect(message.priority).toBe(MessagePriority.HIGH);
  });

  it('should set urgent priority with shortcut', () => {
    const message = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .urgent()
      .build();

    expect(message.priority).toBe(MessagePriority.URGENT);
  });
});

describe('MessageBuilder - From and To Methods', () => {
  it('should set from as string', () => {
    const message = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .build();

    expect(message.from.agentId).toBe('agent-1');
  });

  it('should set from as AgentEndpoint', () => {
    const endpoint: AgentEndpoint = {
      agentId: 'agent-1',
      role: 'worker',
      name: 'Worker Agent',
    };

    const message = MessageBuilder.create()
      .from(endpoint)
      .to('agent-2')
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .build();

    expect(message.from.agentId).toBe('agent-1');
    expect(message.from.role).toBe('worker');
    expect(message.from.name).toBe('Worker Agent');
  });

  it('should set to as string', () => {
    const message = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .build();

    expect((Array.isArray(message.to) ? message.to[0] : message.to).agentId).toBe('agent-2');
  });

  it('should set to as AgentEndpoint', () => {
    const endpoint: AgentEndpoint = {
      agentId: 'agent-2',
      role: 'manager',
      name: 'Manager Agent',
    };

    const message = MessageBuilder.create()
      .from('agent-1')
      .to(endpoint)
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .build();

    expect((Array.isArray(message.to) ? message.to[0] : message.to).agentId).toBe('agent-2');
    expect((Array.isArray(message.to) ? message.to[0] : message.to).role).toBe('manager');
  });

  it('should set to as array of strings', () => {
    const message = MessageBuilder.create()
      .from('agent-1')
      .to(['agent-2', 'agent-3', 'agent-4'])
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .build();

    expect(Array.isArray(message.to)).toBe(true);
    expect(message.to).toHaveLength(3);
    expect((message.to as AgentEndpoint[])[0].agentId).toBe('agent-2');
  });

  it('should set to as array of AgentEndpoints', () => {
    const endpoints: AgentEndpoint[] = [
      { agentId: 'agent-2', role: 'manager' },
      { agentId: 'agent-3', role: 'worker' },
    ];

    const message = MessageBuilder.create()
      .from('agent-1')
      .to(endpoints)
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .build();

    expect(Array.isArray(message.to)).toBe(true);
    expect(message.to).toHaveLength(2);
    expect((message.to as AgentEndpoint[])[0].role).toBe('manager');
  });

  it('should throw error for empty recipient list', () => {
    expect(() => {
      MessageBuilder.create()
        .from('agent-1')
        .to([])
        .type(MessageType.TASK_ASSIGN)
        .payload({})
        .build();
    }).toThrow('Recipient list cannot be empty');
  });

  it('should add single recipient with addTo', () => {
    const message = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .addTo('agent-3')
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .build();

    expect(Array.isArray(message.to)).toBe(true);
    expect(message.to).toHaveLength(2);
    expect((message.to as AgentEndpoint[])[0].agentId).toBe('agent-2');
    expect((message.to as AgentEndpoint[])[1].agentId).toBe('agent-3');
  });

  it('should add multiple recipients with addTo', () => {
    const message = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .addTo('agent-3')
      .addTo('agent-4')
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .build();

    expect(Array.isArray(message.to)).toBe(true);
    expect(message.to).toHaveLength(3);
  });

  it('should add AgentEndpoint with addTo', () => {
    const endpoint: AgentEndpoint = {
      agentId: 'agent-3',
      role: 'observer',
    };

    const message = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .addTo(endpoint)
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .build();

    expect(Array.isArray(message.to)).toBe(true);
    expect(message.to).toHaveLength(2);
    expect((message.to as AgentEndpoint[])[1].role).toBe('observer');
  });
});

describe('MessageBuilder - Metadata Methods', () => {
  it('should set metadata', () => {
    const metadata = {
      traceId: 'trace-123',
      source: 'api-gateway',
      tags: { key: 'value' },
    };

    const message = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .metadata(metadata)
      .build();

    expect(message.metadata).toEqual(metadata);
  });

  it('should add metadata field', () => {
    const message = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .addMetadata('traceId', 'trace-123')
      .addMetadata('source', 'api-gateway')
      .build();

    expect(message.metadata?.traceId).toBe('trace-123');
    expect(message.metadata?.source).toBe('api-gateway');
  });

  it('should set traceId', () => {
    const message = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .traceId('trace-123')
      .build();

    expect(message.metadata?.traceId).toBe('trace-123');
  });

  it('should add tag', () => {
    const message = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .addTag('environment', 'production')
      .addTag('version', '1.0.0')
      .build();

    expect(message.metadata?.tags).toBeDefined();
    expect(message.metadata?.tags?.environment).toBe('production');
    expect(message.metadata?.tags?.version).toBe('1.0.0');
  });

  it('should add tag to existing metadata', () => {
    const message = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .metadata({ traceId: 'trace-123' })
      .addTag('key', 'value')
      .build();

    expect(message.metadata?.traceId).toBe('trace-123');
    expect(message.metadata?.tags?.key).toBe('value');
  });
});

describe('MessageBuilder - TTL and Validation', () => {
  it('should set TTL', () => {
    const message = MessageBuilder.create()
      .from('agent-1')
      .to('agent-2')
      .type(MessageType.TASK_ASSIGN)
      .payload({})
      .ttl(3600)
      .build();

    expect(message.ttl).toBe(3600);
  });

  it('should throw error for invalid TTL (zero)', () => {
    expect(() => {
      MessageBuilder.create()
        .from('agent-1')
        .to('agent-2')
        .type(MessageType.TASK_ASSIGN)
        .payload({})
        .ttl(0);
    }).toThrow('TTL must be positive');
  });

  it('should throw error for invalid TTL (negative)', () => {
    expect(() => {
      MessageBuilder.create()
        .from('agent-1')
        .to('agent-2')
        .type(MessageType.TASK_ASSIGN)
        .payload({})
        .ttl(-100);
    }).toThrow('TTL must be positive');
  });

  it('should validate missing from', () => {
    expect(() => {
      MessageBuilder.create()
        .to('agent-2')
        .type(MessageType.TASK_ASSIGN)
        .payload({})
        .build();
    }).toThrow('Message must have a sender (from)');
  });

  it('should validate missing to', () => {
    expect(() => {
      MessageBuilder.create()
        .from('agent-1')
        .type(MessageType.TASK_ASSIGN)
        .payload({})
        .build();
    }).toThrow('Message must have a recipient (to)');
  });

  it('should validate missing type', () => {
    expect(() => {
      MessageBuilder.create()
        .from('agent-1')
        .to('agent-2')
        .payload({})
        .build();
    }).toThrow('Message must have a type');
  });

  it('should validate missing payload', () => {
    expect(() => {
      MessageBuilder.create()
        .from('agent-1')
        .to('agent-2')
        .type(MessageType.TASK_ASSIGN)
        .build();
    }).toThrow('Message must have a payload');
  });
});

describe('Message - Task Messages', () => {
  it('should create task assign message', () => {
    const message = Message.taskAssign(
      'agent-1',
      'agent-2',
      {
        taskId: 'task-123',
        taskType: 'processing',
        title: 'Process Data',
        description: 'Process input data',
        priority: 'high',
        deadline: new Date('2024-12-31'),
        parameters: { timeout: 5000 },
      }
    );

    expect(message.from.agentId).toBe('agent-1');
    expect((Array.isArray(message.to) ? message.to[0] : message.to).agentId).toBe('agent-2');
    expect(message.type).toBe(MessageType.TASK_ASSIGN);
    expect((message.payload as TaskPayload).taskId).toBe('task-123');
  });

  it('should set default priority for task', () => {
    const message = Message.taskAssign(
      'agent-1',
      'agent-2',
      {
        taskId: 'task-123',
        taskType: 'processing',
        title: 'Process Data',
        description: 'Process input data',
      }
    );

    expect((message.payload as TaskPayload).priority).toBe('medium');
  });

  it('should create task complete message', () => {
    const message = Message.taskComplete(
      'agent-1',
      'agent-2',
      'task-123',
      { result: 'success' }
    );

    expect(message.type).toBe(MessageType.TASK_COMPLETE);
    expect((message.payload as TaskPayload & { result: unknown }).taskId).toBe('task-123');
    expect((message.payload as TaskPayload & { result: unknown }).result).toEqual({ result: 'success' });
  });

  it('should create task complete message without result', () => {
    const message = Message.taskComplete('agent-1', 'agent-2', 'task-123');

    expect((message.payload as TaskPayload & { completedAt?: Date }).taskId).toBe('task-123');
    expect((message.payload as TaskPayload & { result?: unknown }).result).toBeUndefined();
    expect((message.payload as TaskPayload & { completedAt?: Date }).completedAt).toBeDefined();
  });
});

describe('Message - Collaboration Messages', () => {
  it('should create collaboration request message', () => {
    const message = Message.collabRequest(
      'agent-1',
      'agent-2',
      {
        collaborationId: 'collab-123',
        type: 'sync',
        resource: 'database',
        action: 'read',
        data: { query: 'SELECT *' },
      }
    );

    expect(message.type).toBe(MessageType.COLLAB_REQUEST);
    expect((message.payload as CollaborationPayload).collaborationId).toBe('collab-123');
    expect((message.payload as CollaborationPayload).type).toBe('sync');
  });
});

describe('Message - Data Messages', () => {
  it('should create data request message', () => {
    const message = Message.dataRequest(
      'agent-1',
      'agent-2',
      {
        dataType: 'user',
        action: 'query',
        query: { status: 'active' },
        pagination: { page: 1, limit: 10 },
      }
    );

    expect(message.type).toBe(MessageType.DATA_REQUEST);
    expect((message.payload as DataPayload).dataType).toBe('user');
    expect((message.payload as DataPayload).action).toBe('query');
  });

  it('should create data response message', () => {
    const data = { users: [{ id: 1, name: 'Alice' }] };
    const message = Message.dataResponse(
      'agent-1',
      'agent-2',
      'corr-123',
      data
    );

    expect(message.type).toBe(MessageType.DATA_RESPONSE);
    expect(message.correlationId).toBe('corr-123');
    expect((message.payload as DataPayload).data).toEqual(data);
  });
});

describe('Message - Notification Messages', () => {
  it('should create info notification', () => {
    const message = Message.notify(
      'agent-1',
      'agent-2',
      {
        title: 'Info',
        content: 'Info message',
        level: 'info',
      }
    );

    expect(message.type).toBe(MessageType.NOTIFY_INFO);
    expect((message.payload as NotificationPayload).title).toBe('Info');
  });

  it('should create warning notification', () => {
    const message = Message.notify(
      'agent-1',
      'agent-2',
      {
        title: 'Warning',
        content: 'Warning message',
        level: 'warning',
      }
    );

    expect(message.type).toBe(MessageType.NOTIFY_WARNING);
  });

  it('should create error notification', () => {
    const message = Message.notify(
      'agent-1',
      'agent-2',
      {
        title: 'Error',
        content: 'Error message',
        level: 'error',
      }
    );

    expect(message.type).toBe(MessageType.NOTIFY_ERROR);
  });

  it('should create success notification', () => {
    const message = Message.notify(
      'agent-1',
      'agent-2',
      {
        title: 'Success',
        content: 'Success message',
        level: 'success',
      }
    );

    expect(message.type).toBe(MessageType.NOTIFY_SUCCESS);
  });

  it('should create notification with action', () => {
    const message = Message.notify(
      'agent-1',
      'agent-2',
      {
        title: 'Action Required',
        content: 'Please take action',
        level: 'warning',
        action: {
          type: 'button',
          target: '/action',
          label: 'Take Action',
        },
        persistent: true,
      }
    );

    expect((message.payload as NotificationPayload).action).toBeDefined();
    expect((message.payload as NotificationPayload).action?.label).toBe('Take Action');
    expect((message.payload as NotificationPayload).persistent).toBe(true);
  });

  it('should create notification to multiple recipients', () => {
    const message = Message.notify(
      'agent-1',
      ['agent-2', 'agent-3', 'agent-4'],
      {
        title: 'Broadcast',
        content: 'Broadcast message',
        level: 'info',
      }
    );

    expect(Array.isArray(message.to)).toBe(true);
    expect(message.to).toHaveLength(3);
  });
});

describe('Message - Heartbeat Messages', () => {
  it('should create heartbeat message', () => {
    const message = Message.heartbeat(
      'agent-1',
      'active',
      {
        load: 75,
        queueSize: 10,
        uptime: 3600,
        metrics: { cpu: 80, memory: 60 },
      }
    );

    expect(message.type).toBe(MessageType.HEARTBEAT);
    expect((message.payload as HeartbeatPayload).status).toBe('active');
    expect((message.payload as HeartbeatPayload).load).toBe(75);
    expect((message.payload as HeartbeatPayload).metrics?.cpu).toBe(80);
  });

  it('should create heartbeat message without metrics', () => {
    const message = Message.heartbeat('agent-1', 'idle');

    expect(message.type).toBe(MessageType.HEARTBEAT);
    expect((message.payload as HeartbeatPayload).status).toBe('idle');
    expect((message.payload as HeartbeatPayload).metrics).toBeUndefined();
  });

  it('should create heartbeat ack message', () => {
    const message = Message.heartbeatAck('agent-1', 'agent-2', 'corr-123');

    expect(message.type).toBe(MessageType.HEARTBEAT_ACK);
    expect(message.correlationId).toBe('corr-123');
    expect((message.payload as HeartbeatPayload & { timestamp: Date }).timestamp).toBeDefined();
  });
});

describe('Message - Capability Messages', () => {
  it('should create capability query message', () => {
    const message = Message.capabilityQuery('agent-1', 'agent-2');

    expect(message.type).toBe(MessageType.CAPABILITY_QUERY);
    expect(message.payload).toEqual({});
  });

  it('should create capability response message', () => {
    const message = Message.capabilityResponse(
      'agent-1',
      'agent-2',
      'corr-123',
      {
        capabilities: ['text-processing', 'image-analysis'],
        skills: ['summarization'],
        limitations: ['max-input: 10MB'],
        preferences: { model: 'fast' },
      }
    );

    expect(message.type).toBe(MessageType.CAPABILITY_RESPONSE);
    expect(message.correlationId).toBe('corr-123');
    expect((message.payload as CapabilityPayload).capabilities).toHaveLength(2);
  });
});

describe('Message - Meeting Messages', () => {
  it('should create meeting invite message', () => {
    const message = Message.meetingInvite(
      'agent-1',
      'agent-2',
      {
        meetingId: 'meeting-123',
        title: 'Weekly Sync',
        description: 'Team sync meeting',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        participants: ['agent-2', 'agent-3', 'agent-4'],
        agenda: ['Review progress', 'Plan next week'],
        type: 'standup',
      }
    );

    expect(message.type).toBe(MessageType.MEETING_INVITE);
    expect((message.payload as MeetingPayload).meetingId).toBe('meeting-123');
    expect((message.payload as MeetingPayload).participants).toHaveLength(3);
    expect((message.payload as MeetingPayload).agenda).toContain('Review progress');
  });

  it('should create meeting invite to multiple recipients', () => {
    const message = Message.meetingInvite(
      'agent-1',
      ['agent-2', 'agent-3'],
      {
        meetingId: 'meeting-123',
        title: 'Team Meeting',
        startTime: new Date(),
        participants: ['agent-2', 'agent-3'],
        type: 'planning',
      }
    );

    expect(Array.isArray(message.to)).toBe(true);
    expect(message.to).toHaveLength(2);
  });
});

describe('Message - Vote Messages', () => {
  it('should create vote start message', () => {
    const message = Message.voteStart(
      'agent-1',
      'agent-2',
      {
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
      }
    );

    expect(message.type).toBe(MessageType.VOTE_START);
    expect((message.payload as VotePayload).voteId).toBe('vote-123');
    expect((message.payload as VotePayload & { options: Array<{ id: string; label: string }> }).options).toHaveLength(2);
    expect((message.payload as VotePayload).anonymous).toBe(true);
  });

  it('should create vote cast message', () => {
    const message = Message.voteCast('agent-1', 'agent-2', 'vote-123', 'opt-1');

    expect(message.type).toBe(MessageType.VOTE_CAST);
    expect((message.payload as VotePayload).voteId).toBe('vote-123');
    expect((message.payload as VotePayload & { optionId?: string }).optionId).toBe('opt-1');
    expect((message.payload as VotePayload & { votedAt?: Date }).votedAt).toBeDefined();
  });
});

describe('Message - Custom Messages', () => {
  it('should create custom message with minimal options', () => {
    const message = Message.custom('agent-1', 'agent-2', { custom: 'data' });

    expect(message.type).toBe(MessageType.CUSTOM);
    expect(message.payload).toEqual({ custom: 'data' });
  });

  it('should create custom message with priority', () => {
    const message = Message.custom(
      'agent-1',
      'agent-2',
      { custom: 'data' },
      { priority: MessagePriority.HIGH }
    );

    expect(message.priority).toBe(MessagePriority.HIGH);
  });

  it('should create custom message with TTL', () => {
    const message = Message.custom(
      'agent-1',
      'agent-2',
      { custom: 'data' },
      { ttl: 3600 }
    );

    expect(message.ttl).toBe(3600);
  });

  it('should create custom message with metadata', () => {
    const message = Message.custom(
      'agent-1',
      'agent-2',
      { custom: 'data' },
      {
        metadata: {
          traceId: 'trace-123',
          tags: { key: 'value' },
        },
      }
    );

    expect(message.metadata?.traceId).toBe('trace-123');
  });

  it('should create custom message with all options', () => {
    const message = Message.custom(
      'agent-1',
      ['agent-2', 'agent-3'],
      { custom: 'data' },
      {
        priority: MessagePriority.URGENT,
        ttl: 1800,
        metadata: { traceId: 'trace-123' },
      }
    );

    expect(message.priority).toBe(MessagePriority.URGENT);
    expect(message.ttl).toBe(1800);
    expect(Array.isArray(message.to)).toBe(true);
    expect(message.to).toHaveLength(2);
  });
});

describe('MessageParser - Parse JSON', () => {
  it('should parse valid JSON message', () => {
    const json = JSON.stringify({
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date().toISOString(),
      from: { agentId: 'agent-1' },
      to: { agentId: 'agent-2' },
      type: MessageType.TASK_ASSIGN,
      priority: MessagePriority.NORMAL,
      payload: { data: 'test' },
    });

    const message = MessageParser.parse(json);

    expect(message.messageId).toBe('msg-123');
    expect(message.from.agentId).toBe('agent-1');
    expect((Array.isArray(message.to) ? message.to[0] : message.to).agentId).toBe('agent-2');
  });

  it('should throw error for invalid JSON', () => {
    expect(() => {
      MessageParser.parse('{invalid json}');
    }).toThrow('Failed to parse message');
  });

  it('should throw error for invalid message format', () => {
    expect(() => {
      MessageParser.parse('null');
    }).toThrow('Invalid message: must be an object');
  });

  it('should throw error for missing version', () => {
    expect(() => {
      MessageParser.parseObject({
        messageId: 'msg-123',
        from: { agentId: 'agent-1' },
        to: { agentId: 'agent-2' },
        type: MessageType.TASK_ASSIGN,
        payload: {},
      });
    }).toThrow('Invalid message: missing version');
  });

  it('should throw error for missing messageId', () => {
    expect(() => {
      MessageParser.parseObject({
        version: '1.0.0',
        from: { agentId: 'agent-1' },
        to: { agentId: 'agent-2' },
        type: MessageType.TASK_ASSIGN,
        payload: {},
      });
    }).toThrow('Invalid message: missing messageId');
  });

  it('should throw error for missing from', () => {
    expect(() => {
      MessageParser.parseObject({
        version: '1.0.0',
        messageId: 'msg-123',
        to: { agentId: 'agent-2' },
        type: MessageType.TASK_ASSIGN,
        payload: {},
      });
    }).toThrow('Invalid message: missing from');
  });

  it('should throw error for missing to', () => {
    expect(() => {
      MessageParser.parseObject({
        version: '1.0.0',
        messageId: 'msg-123',
        from: { agentId: 'agent-1' },
        type: MessageType.TASK_ASSIGN,
        payload: {},
      });
    }).toThrow('Invalid message: missing to');
  });

  it('should throw error for missing type', () => {
    expect(() => {
      MessageParser.parseObject({
        version: '1.0.0',
        messageId: 'msg-123',
        from: { agentId: 'agent-1' },
        to: { agentId: 'agent-2' },
        payload: {},
      });
    }).toThrow('Invalid message: missing type');
  });

  it('should throw error for missing payload', () => {
    expect(() => {
      MessageParser.parseObject({
        version: '1.0.0',
        messageId: 'msg-123',
        from: { agentId: 'agent-1' },
        to: { agentId: 'agent-2' },
        type: MessageType.TASK_ASSIGN,
      });
    }).toThrow('Invalid message: missing payload');
  });
});

describe('MessageParser - Parse Object', () => {
  it('should parse message with all fields', () => {
    const message = MessageParser.parseObject({
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date().toISOString(),
      from: { agentId: 'agent-1', role: 'worker', name: 'Worker', sessionId: 'session-123' },
      to: [
        { agentId: 'agent-2', role: 'manager' },
        { agentId: 'agent-3' },
      ],
      type: MessageType.TASK_ASSIGN,
      priority: MessagePriority.HIGH,
      ttl: 3600,
      correlationId: 'corr-123',
      replyTo: 'agent-reply',
      payload: { data: 'test' },
      metadata: {
        traceId: 'trace-123',
        tags: { key: 'value' },
      },
    });

    expect(message.from.agentId).toBe('agent-1');
    expect(message.from.role).toBe('worker');
    expect(message.from.sessionId).toBe('session-123');
    expect(Array.isArray(message.to)).toBe(true);
    expect(message.to).toHaveLength(2);
    expect((message.to as AgentEndpoint[])[1].role).toBeUndefined();
    expect(message.priority).toBe(MessagePriority.HIGH);
    expect(message.ttl).toBe(3600);
    expect(message.correlationId).toBe('corr-123');
    expect(message.replyTo).toBe('agent-reply');
  });

  it('should parse message with string endpoint', () => {
    const message = MessageParser.parseObject({
      version: '1.0.0',
      messageId: 'msg-123',
      from: 'agent-1',
      to: 'agent-2',
      type: MessageType.TASK_ASSIGN,
      payload: {},
    });

    expect(message.from.agentId).toBe('agent-1');
    expect((Array.isArray(message.to) ? message.to[0] : message.to).agentId).toBe('agent-2');
  });

  it('should parse message with array of string endpoints', () => {
    const message = MessageParser.parseObject({
      version: '1.0.0',
      messageId: 'msg-123',
      from: 'agent-1',
      to: ['agent-2', 'agent-3', 'agent-4'],
      type: MessageType.TASK_ASSIGN,
      payload: {},
    });

    expect(Array.isArray(message.to)).toBe(true);
    expect(message.to).toHaveLength(3);
  });

  it('should parse message without timestamp (should default to now)', () => {
    const message = MessageParser.parseObject({
      version: '1.0.0',
      messageId: 'msg-123',
      from: { agentId: 'agent-1' },
      to: { agentId: 'agent-2' },
      type: MessageType.TASK_ASSIGN,
      payload: {},
    });

    expect(message.timestamp).toBeInstanceOf(Date);
  });

  it('should parse message without priority (should default to NORMAL)', () => {
    const message = MessageParser.parseObject({
      version: '1.0.0',
      messageId: 'msg-123',
      from: { agentId: 'agent-1' },
      to: { agentId: 'agent-2' },
      type: MessageType.TASK_ASSIGN,
      payload: {},
    });

    expect(message.priority).toBe(MessagePriority.NORMAL);
  });

  it('should throw error for invalid endpoint object', () => {
    expect(() => {
      MessageParser.parseObject({
        version: '1.0.0',
        messageId: 'msg-123',
        from: { invalid: 'endpoint' },
        to: { agentId: 'agent-2' },
        type: MessageType.TASK_ASSIGN,
        payload: {},
      });
    }).toThrow('Invalid endpoint: missing agentId');
  });

  it('should throw error for null endpoint', () => {
    expect(() => {
      MessageParser.parseObject({
        version: '1.0.0',
        messageId: 'msg-123',
        from: { agentId: 'agent-1' },
        to: null as unknown as AgentEndpoint,
        type: MessageType.TASK_ASSIGN,
        payload: {},
      });
    }).toThrow('Invalid message: missing to');
  });

  it('should throw error for undefined endpoint', () => {
    expect(() => {
      MessageParser.parseObject({
        version: '1.0.0',
        messageId: 'msg-123',
        from: { agentId: 'agent-1' },
        to: undefined as unknown as AgentEndpoint,
        type: MessageType.TASK_ASSIGN,
        payload: {},
      });
    }).toThrow('Invalid message: missing to');
  });

  it('should throw error for non-object endpoint', () => {
    expect(() => {
      MessageParser.parseObject({
        version: '1.0.0',
        messageId: 'msg-123',
        from: 123 as unknown as AgentEndpoint,
        to: { agentId: 'agent-2' },
        type: MessageType.TASK_ASSIGN,
        payload: {},
      });
    }).toThrow('Invalid endpoint object');
  });

  it('should throw error for non-object endpoint in array', () => {
    expect(() => {
      MessageParser.parseObject({
        version: '1.0.0',
        messageId: 'msg-123',
        from: { agentId: 'agent-1' },
        to: [{ agentId: 'agent-2' }, 123 as unknown as AgentEndpoint],
        type: MessageType.TASK_ASSIGN,
        payload: {},
      });
    }).toThrow('Invalid endpoint object');
  });

  it('should stringify message with Date objects', () => {
    const message: AgentMessageEnvelope = {
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      from: { agentId: 'agent-1' },
      to: { agentId: 'agent-2' },
      type: MessageType.TASK_ASSIGN,
      priority: MessagePriority.NORMAL,
      payload: { createdAt: new Date('2024-01-15T10:00:00Z') },
    };

    const json = MessageParser.stringify(message);
    const parsed = JSON.parse(json);

    expect(parsed.timestamp).toBe('2024-01-15T10:00:00.000Z');
    expect(parsed.payload.createdAt).toBe('2024-01-15T10:00:00.000Z');
  });

  it('should stringify message without Date objects', () => {
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

    const json = MessageParser.stringify(message);
    const parsed = JSON.parse(json);

    expect(parsed.payload.data).toBe('test');
  });
});

describe('MessageParser - Stringify', () => {
  it('should stringify message to JSON', () => {
    const message: AgentMessageEnvelope = {
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      from: { agentId: 'agent-1' },
      to: { agentId: 'agent-2' },
      type: MessageType.TASK_ASSIGN,
      priority: MessagePriority.NORMAL,
      payload: { data: 'test' },
    };

    const json = MessageParser.stringify(message);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe('1.0.0');
    expect(parsed.messageId).toBe('msg-123');
    expect(parsed.timestamp).toBe('2024-01-15T10:00:00.000Z');
  });

  it('should round-trip message through parse/stringify', () => {
    const original: AgentMessageEnvelope = {
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date(),
      from: { agentId: 'agent-1', role: 'worker' },
      to: [
        { agentId: 'agent-2' },
        { agentId: 'agent-3' },
      ],
      type: MessageType.TASK_ASSIGN,
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

    const json = MessageParser.stringify(original);
    const parsed = MessageParser.parse(json);

    expect(parsed.messageId).toBe(original.messageId);
    expect(parsed.from.agentId).toBe(original.from.agentId);
    expect(parsed.from.role).toBe(original.from.role);
    expect(Array.isArray(parsed.to)).toBe(true);
    expect(parsed.to).toHaveLength(2);
    expect(parsed.priority).toBe(original.priority);
    expect(parsed.ttl).toBe(original.ttl);
    expect(parsed.correlationId).toBe(original.correlationId);
    expect(parsed.replyTo).toBe(original.replyTo);
    expect(parsed.payload).toEqual(original.payload);
    expect(parsed.metadata?.traceId).toBe(original.metadata?.traceId);
  });
});

describe('MessageParser - Validate', () => {
  it('should validate complete valid message', () => {
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

    const result = MessageParser.validate(message);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation for missing version', () => {
    const message = {
      messageId: 'msg-123',
      timestamp: new Date(),
      from: { agentId: 'agent-1' },
      to: { agentId: 'agent-2' },
      type: MessageType.TASK_ASSIGN,
      priority: MessagePriority.NORMAL,
      payload: { data: 'test' },
    } as AgentMessageEnvelope;

    const result = MessageParser.validate(message);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing version');
  });

  it('should fail validation for missing messageId', () => {
    const message = {
      version: '1.0.0',
      timestamp: new Date(),
      from: { agentId: 'agent-1' },
      to: { agentId: 'agent-2' },
      type: MessageType.TASK_ASSIGN,
      priority: MessagePriority.NORMAL,
      payload: { data: 'test' },
    } as AgentMessageEnvelope;

    const result = MessageParser.validate(message);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing messageId');
  });

  it('should fail validation for missing or invalid from', () => {
    const message = {
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date(),
      from: { agentId: '' },
      to: { agentId: 'agent-2' },
      type: MessageType.TASK_ASSIGN,
      priority: MessagePriority.NORMAL,
      payload: { data: 'test' },
    } as AgentMessageEnvelope;

    const result = MessageParser.validate(message);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('from'))).toBe(true);
  });

  it('should fail validation for missing to', () => {
    const message = {
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date(),
      from: { agentId: 'agent-1' },
      to: undefined as unknown as AgentEndpoint,
      type: MessageType.TASK_ASSIGN,
      priority: MessagePriority.NORMAL,
      payload: { data: 'test' },
    } as AgentMessageEnvelope;

    const result = MessageParser.validate(message);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing to field');
  });

  it('should fail validation for empty recipient list', () => {
    const message = {
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date(),
      from: { agentId: 'agent-1' },
      to: [],
      type: MessageType.TASK_ASSIGN,
      priority: MessagePriority.NORMAL,
      payload: { data: 'test' },
    } as AgentMessageEnvelope;

    const result = MessageParser.validate(message);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Recipient list cannot be empty');
  });

  it('should fail validation for invalid recipient in list', () => {
    const message = {
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date(),
      from: { agentId: 'agent-1' },
      to: [{ agentId: 'agent-2' }, { agentId: '' }],
      type: MessageType.TASK_ASSIGN,
      priority: MessagePriority.NORMAL,
      payload: { data: 'test' },
    } as AgentMessageEnvelope;

    const result = MessageParser.validate(message);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('recipient'))).toBe(true);
  });

  it('should fail validation for missing type', () => {
    const message = {
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date(),
      from: { agentId: 'agent-1' },
      to: { agentId: 'agent-2' },
      type: undefined as unknown as MessageType,
      priority: MessagePriority.NORMAL,
      payload: { data: 'test' },
    } as AgentMessageEnvelope;

    const result = MessageParser.validate(message);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing type');
  });

  it('should fail validation for invalid message type', () => {
    const message = {
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date(),
      from: { agentId: 'agent-1' },
      to: { agentId: 'agent-2' },
      type: 'invalid_type' as MessageType,
      priority: MessagePriority.NORMAL,
      payload: { data: 'test' },
    } as AgentMessageEnvelope;

    const result = MessageParser.validate(message);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid message type'))).toBe(true);
  });

  it('should fail validation for invalid TTL', () => {
    const message = {
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date(),
      from: { agentId: 'agent-1' },
      to: { agentId: 'agent-2' },
      type: MessageType.TASK_ASSIGN,
      priority: MessagePriority.NORMAL,
      ttl: -100,
      payload: { data: 'test' },
    } as AgentMessageEnvelope;

    const result = MessageParser.validate(message);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('TTL must be positive');
  });

  it('should fail validation with multiple errors', () => {
    const message = {
      version: '',
      messageId: '',
      timestamp: new Date(),
      from: { agentId: '' },
      to: undefined as unknown as AgentEndpoint,
      type: undefined as unknown as MessageType,
      priority: MessagePriority.NORMAL,
      ttl: -1,
      payload: { data: 'test' },
    } as AgentMessageEnvelope;

    const result = MessageParser.validate(message);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});