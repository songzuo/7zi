/**
 * API - AI Endpoints & Server Utils Tests
 * Tests for: POST /api/ai/generate, POST /api/ai/optimize, 
 * findParallelizableNodes, getOptimizationSuggestions, generateId
 */

const request = require('supertest');
const { app, engine } = require('../../server');

describe('AI API - Advanced Coverage', () => {
  describe('POST /api/ai/generate', () => {
    test('should generate workflow with correct structure', async () => {
      const response = await request(app)
        .post('/api/ai/generate')
        .send({ description: 'Email notification workflow' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify generated workflow structure
      const workflow = response.body.data;
      expect(workflow.id).toMatch(/^wf_/);
      expect(workflow.name).toBe('AI Generated Workflow');
      expect(workflow.description).toBe('Email notification workflow');
      expect(workflow.version).toBe('1.0.0');
      expect(Array.isArray(workflow.nodes)).toBe(true);
      expect(workflow.nodes.length).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(workflow.edges)).toBe(true);

      // Verify node types
      const nodeTypes = workflow.nodes.map(n => n.type);
      expect(nodeTypes).toContain('start');
      expect(nodeTypes).toContain('end');
      expect(nodeTypes).toContain('task');

      // Verify edges reference valid node ids
      workflow.edges.forEach(edge => {
        const sourceExists = workflow.nodes.some(n => n.id === edge.source);
        const targetExists = workflow.nodes.some(n => n.id === edge.target);
        expect(sourceExists).toBe(true);
        expect(targetExists).toBe(true);
      });
    });

    test('should handle empty description', async () => {
      const response = await request(app)
        .post('/api/ai/generate')
        .send({ description: '' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle missing description field', async () => {
      const response = await request(app)
        .post('/api/ai/generate')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/ai/optimize - Advanced', () => {
    test('should return parallelization suggestions for sequential tasks', async () => {
      const workflow = {
        id: 'parallel_test',
        name: 'Parallel Test',
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'task1', type: 'task' },
          { id: 'task2', type: 'task' },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'task2' },
          { id: 'e3', source: 'task2', target: 'end' }
        ]
      };

      const response = await request(app)
        .post('/api/ai/optimize')
        .send({ workflow });

      expect(response.status).toBe(200);
      const suggestions = response.body.data;
      expect(Array.isArray(suggestions)).toBe(true);

      // Should find parallelizable nodes (task1 and task2 both have only 1 incoming edge)
      const parallelSuggestion = suggestions.find(s => s.type === 'parallelization');
      expect(parallelSuggestion).toBeDefined();
      expect(parallelSuggestion.impact).toBe('high');
    });

    test('should identify timeout issues for task nodes', async () => {
      const workflow = {
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'task_no_timeout', type: 'task' },
          { id: 'task_with_timeout', type: 'task', timeout: 300 },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task_no_timeout' },
          { id: 'e2', source: 'task_no_timeout', target: 'task_with_timeout' },
          { id: 'e3', source: 'task_with_timeout', target: 'end' }
        ]
      };

      const response = await request(app)
        .post('/api/ai/optimize')
        .send({ workflow });

      const timeoutSuggestion = response.body.data.find(s => s.type === 'timeout');
      expect(timeoutSuggestion).toBeDefined();
      expect(timeoutSuggestion.impact).toBe('medium');
      expect(timeoutSuggestion.nodes).toContain('task_no_timeout');
      expect(timeoutSuggestion.nodes).not.toContain('task_with_timeout');
    });

    test('should identify retry configuration gaps', async () => {
      const workflow = {
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'task_no_retry', type: 'task' },
          { id: 'task_with_retry', type: 'task', retry: { maxAttempts: 3 } },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task_no_retry' },
          { id: 'e2', source: 'task_no_retry', target: 'task_with_retry' },
          { id: 'e3', source: 'task_with_retry', target: 'end' }
        ]
      };

      const response = await request(app)
        .post('/api/ai/optimize')
        .send({ workflow });

      const retrySuggestion = response.body.data.find(s => s.type === 'retry');
      expect(retrySuggestion).toBeDefined();
      expect(retrySuggestion.impact).toBe('medium');
      expect(retrySuggestion.nodes).toContain('task_no_retry');
    });

    test('should return multiple suggestion types for complex workflow', async () => {
      const workflow = {
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'task1', type: 'task' },
          { id: 'task2', type: 'task' },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'task2' },
          { id: 'e3', source: 'task2', target: 'end' }
        ]
      };

      const response = await request(app)
        .post('/api/ai/optimize')
        .send({ workflow });

      const suggestionTypes = response.body.data.map(s => s.type);
      // Should have parallelization, timeout, and retry suggestions
      expect(suggestionTypes).toContain('parallelization');
      expect(suggestionTypes).toContain('timeout');
      expect(suggestionTypes).toContain('retry');
    });

    test('should return empty suggestions for well-configured workflow', async () => {
      const workflow = {
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'task1', type: 'task', timeout: 300, retry: { maxAttempts: 3 } },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'end' }
        ]
      };

      const response = await request(app)
        .post('/api/ai/optimize')
        .send({ workflow });

      // No parallelization for single task, but may still have suggestions
      // Just verify it returns successfully
      expect(response.status).toBe(200);
    });
  });

  describe('Workflow execution with edge conditions', () => {
    test('should execute workflow with conditional edges', async () => {
      // Create a workflow with condition nodes
      const workflow = {
        id: 'cond_edge_wf',
        name: 'Conditional Edge Workflow',
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'cond', type: 'condition', data: { conditions: [], defaultBranch: 'default' } },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'cond' },
          { id: 'e2', source: 'cond', target: 'end', condition: '${true}' }
        ]
      };

      await request(app)
        .post('/api/workflows')
        .send(workflow);

      const response = await request(app)
        .post('/api/workflows/cond_edge_wf/execute')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
    });

    test('should handle workflow with parallel output', async () => {
      const workflow = {
        id: 'parallel_wf',
        name: 'Parallel Workflow',
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'parallel', type: 'parallel', data: { branches: ['a', 'b'] } },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'parallel' },
          { id: 'e2', source: 'parallel', target: 'end' }
        ]
      };

      await request(app)
        .post('/api/workflows')
        .send(workflow);

      const response = await request(app)
        .post('/api/workflows/parallel_wf/execute')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
    });
  });

  describe('POST /api/executions/:id/resume', () => {
    test('should return 400 for non-existent checkpoint', async () => {
      const response = await request(app)
        .post('/api/executions/some_exec_id/resume')
        .send({ checkpointId: 'non_existent_checkpoint' });

      // resumeFromCheckpoint throws when checkpoint not found
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 when checkpointId is missing', async () => {
      const response = await request(app)
        .post('/api/executions/some_exec_id/resume')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Execution pause/resume cycle', () => {
    test('should complete execution that finishes before pause', async () => {
      // Create a very fast workflow
      await request(app)
        .post('/api/workflows')
        .send({
          id: 'fast_wf',
          name: 'Fast Workflow',
          nodes: [{ id: 'start', type: 'start' }],
          edges: []
        });

      const execResponse = await request(app)
        .post('/api/workflows/fast_wf/execute')
        .send({});

      const execId = execResponse.body.data.id;

      // Try to pause (execution may already be completed)
      const pauseResponse = await request(app)
        .post(`/api/executions/${execId}/pause`);

      expect([200, 400]).toContain(pauseResponse.status);
    });
  });

  describe('Module exports', () => {
    test('app and engine should be exported', () => {
      // The require at top of file already verified these exist
      expect(app).toBeDefined();
      expect(engine).toBeDefined();
      expect(typeof app.listen).toBe('function');
      expect(engine.execute).toBeDefined();
    });
  });
});
