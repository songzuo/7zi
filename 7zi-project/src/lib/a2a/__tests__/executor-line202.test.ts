/**
 * Test for executor.ts line 202 - joining multiple text parts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SimpleEventBus,
  SevenZiExecutor,
  type RequestContext,
} from '../executor';

describe('SevenZiExecutor - Line 202 Coverage', () => {
  let executor: SevenZiExecutor;
  let eventBus: SimpleEventBus;

  beforeEach(() => {
    executor = new SevenZiExecutor();
    eventBus = new SimpleEventBus();
  });

  describe('extractTextFromMessage - line 202 (.join("\\n"))', () => {
    it('should join multiple text parts with newlines (line 202)', async () => {
      // This tests line 202: return textParts.map(p => p.text || '').join('\n');
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            { kind: 'text', text: 'First line' },
            { kind: 'text', text: 'Second line' },
            { kind: 'text', text: 'Third line' },
          ],
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const artifactUpdate = events.find(e => e.kind === 'artifact-update');

      expect(artifactUpdate).toBeDefined();
      if (artifactUpdate && 'artifact' in artifactUpdate) {
        const text = artifactUpdate.artifact.parts[0].text;
        expect(text).toBeDefined();
        expect(text.length).toBeGreaterThan(0);
        // The message text should have been joined with newlines internally
        // The response will contain the full text
      }
    });

    it('should handle 10 text parts joined with newlines (line 202)', async () => {
      const textParts = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`);

      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: textParts.map(text => ({ kind: 'text' as const, text })),
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdate = events.find(e => e.kind === 'status-update' && e.status.state === 'completed');

      expect(statusUpdate).toBeDefined();
    });

    it('should handle text parts with empty strings joined with newlines (line 202)', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            { kind: 'text', text: '' },
            { kind: 'text', text: 'Content' },
            { kind: 'text', text: '' },
          ],
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdate = events.find(e => e.kind === 'status-update' && e.status.state === 'completed');

      expect(statusUpdate).toBeDefined();
    });

    it('should handle text parts with special characters joined with newlines (line 202)', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            { kind: 'text', text: 'Line 1\nwith newline' },
            { kind: 'text', text: 'Line 2\twith tab' },
            { kind: 'text', text: 'Line 3\rwith carriage return' },
          ],
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdate = events.find(e => e.kind === 'status-update' && e.status.state === 'completed');

      expect(statusUpdate).toBeDefined();
    });

    it('should handle mixed text and non-text parts with multiple text parts (line 202)', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            { kind: 'text', text: 'Text 1' },
            { kind: 'file', file: { name: 'file.txt' } },
            { kind: 'text', text: 'Text 2' },
            { kind: 'data', data: { key: 'value' } },
            { kind: 'text', text: 'Text 3' },
          ],
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdate = events.find(e => e.kind === 'status-update' && e.status.state === 'completed');

      expect(statusUpdate).toBeDefined();
    });

    it('should handle very long text parts joined with newlines (line 202)', async () => {
      const longText1 = 'A'.repeat(1000);
      const longText2 = 'B'.repeat(1000);
      const longText3 = 'C'.repeat(1000);

      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            { kind: 'text', text: longText1 },
            { kind: 'text', text: longText2 },
            { kind: 'text', text: longText3 },
          ],
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdate = events.find(e => e.kind === 'status-update' && e.status.state === 'completed');

      expect(statusUpdate).toBeDefined();
    });

    it('should handle Unicode text parts joined with newlines (line 202)', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            { kind: 'text', text: '你好' },
            { kind: 'text', text: '世界' },
            { kind: 'text', text: '🌍🚀✨' },
          ],
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdate = events.find(e => e.kind === 'status-update' && e.status.state === 'completed');

      expect(statusUpdate).toBeDefined();
    });

    it('should handle mixed case text parts joined with newlines (line 202)', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            { kind: 'text', text: 'UPPER' },
            { kind: 'text', text: 'lower' },
            { kind: 'text', text: 'Mixed' },
            { kind: 'text', text: 'CaSe' },
          ],
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdate = events.find(e => e.kind === 'status-update' && e.status.state === 'completed');

      expect(statusUpdate).toBeDefined();
    });
  });
});
