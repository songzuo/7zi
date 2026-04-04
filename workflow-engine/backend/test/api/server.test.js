/**
 * API Integration Tests
 *
 * Tests for REST API endpoints
 */

const request = require('supertest');
const path = require('path');

// Load setup file first
require('./setup');

// Import app from server
const { app } = require('../../server');

describe('Workflow API', () => {
  let createdWorkflowId;
  let createdExecutionId;

  describe('Health Check', () => {
    test('GET /health should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });
  });

  describe('Workflow CRUD Operations', () => {
    describe('POST /api/workflows', () => {
      test('should create a new workflow', async () => {
        const workflow = {
          name: 'Test Workflow',
          description: 'A test workflow',
          nodes: [
            { id: 'start_1', type: 'start', name: 'Start', position: { x: 100, y: 100 } },
            { id: 'task_1', type: 'task', name: 'Task', position: { x: 300, y: 100 } },
            { id: 'end_1', type: 'end', name: 'End', position: { x: 500, y: 100 } }
          ],
          edges: [
            { id: 'e1', source: 'start_1', target: 'task_1' },
            { id: 'e2', source: 'task_1', target: 'end_1' }
          ]
        };

        const response = await request(app)
          .post('/api/workflows')
          .send(workflow);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.name).toBe('Test Workflow');
        expect(response.body.data.version).toBe('1.0.0');
        expect(response.body.data.createdAt).toBeDefined();

        createdWorkflowId = response.body.data.id;
      });

      test('should create workflow with custom id', async () => {
        const workflow = {
          id: 'custom_wf_001',
          name: 'Custom ID Workflow',
          version: '2.0.0',
          nodes: [{ id: 'start', type: 'start' }],
          edges: []
        };

        const response = await request(app)
          .post('/api/workflows')
          .send(workflow);

        expect(response.status).toBe(201);
        expect(response.body.data.id).toBe('custom_wf_001');
        expect(response.body.data.version).toBe('2.0.0');
      });

      test('should reject invalid workflow without start node', async () => {
        const workflow = {
          name: 'Invalid Workflow',
          nodes: [{ id: 'task', type: 'task' }],
          edges: []
        };

        const response = await request(app)
          .post('/api/workflows')
          .send(workflow);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('no start node');
      });

      test('should reject workflow without nodes', async () => {
        const workflow = {
          name: 'Empty Workflow',
          nodes: [],
          edges: []
        };

        const response = await request(app)
          .post('/api/workflows')
          .send(workflow);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('no nodes defined');
      });
    });

    describe('GET /api/workflows', () => {
      test('should return list of workflows', async () => {
        const response = await request(app).get('/api/workflows');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.total).toBeDefined();
      });
    });

    describe('GET /api/workflows/:id', () => {
      test('should return workflow by id', async () => {
        // First create a workflow
        const createResponse = await request(app)
          .post('/api/workflows')
          .send({
            id: 'get_test_wf',
            name: 'Get Test Workflow',
            nodes: [{ id: 'start', type: 'start' }],
            edges: []
          });

        const response = await request(app).get('/api/workflows/get_test_wf');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('get_test_wf');
        expect(response.body.data.name).toBe('Get Test Workflow');
      });

      test('should return 404 for non-existent workflow', async () => {
        const response = await request(app).get('/api/workflows/non_existent_wf');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Workflow not found');
      });
    });

    describe('PUT /api/workflows/:id', () => {
      test('should update existing workflow', async () => {
        // First create a workflow
        await request(app)
          .post('/api/workflows')
          .send({
            id: 'update_test_wf',
            name: 'Original Name',
            nodes: [{ id: 'start', type: 'start' }],
            edges: []
          });

        const response = await request(app)
          .put('/api/workflows/update_test_wf')
          .send({ name: 'Updated Name' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Updated Name');
        expect(response.body.data.updatedAt).toBeDefined();
      });

      test('should preserve id on update', async () => {
        await request(app)
          .post('/api/workflows')
          .send({
            id: 'preserve_id_test',
            name: 'Original',
            nodes: [{ id: 'start', type: 'start' }],
            edges: []
          });

        const response = await request(app)
          .put('/api/workflows/preserve_id_test')
          .send({ id: 'different_id', name: 'Updated' });

        expect(response.body.data.id).toBe('preserve_id_test');
      });

      test('should return 404 for non-existent workflow', async () => {
        const response = await request(app)
          .put('/api/workflows/non_existent')
          .send({ name: 'Updated' });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/workflows/:id', () => {
      test('should delete existing workflow', async () => {
        // Create a workflow to delete
        await request(app)
          .post('/api/workflows')
          .send({
            id: 'delete_test_wf',
            name: 'To Be Deleted',
            nodes: [{ id: 'start', type: 'start' }],
            edges: []
          });

        const response = await request(app).delete('/api/workflows/delete_test_wf');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Workflow deleted');

        // Verify it's deleted
        const getResponse = await request(app).get('/api/workflows/delete_test_wf');
        expect(getResponse.status).toBe(404);
      });

      test('should return 404 for non-existent workflow', async () => {
        const response = await request(app).delete('/api/workflows/non_existent');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Execution API', () => {
    beforeEach(async () => {
      // Create a test workflow for execution tests
      await request(app)
        .post('/api/workflows')
        .send({
          id: 'exec_test_wf',
          name: 'Execution Test Workflow',
          nodes: [
            { id: 'start', type: 'start' },
            { id: 'task', type: 'task' },
            { id: 'end', type: 'end' }
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'task' },
            { id: 'e2', source: 'task', target: 'end' }
          ]
        });
    });

    describe('POST /api/workflows/:id/execute', () => {
      test('should execute workflow and return execution result', async () => {
        const response = await request(app)
          .post('/api/workflows/exec_test_wf/execute')
          .send({ variables: { testVar: 'testValue' } });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.workflowId).toBe('exec_test_wf');
        expect(response.body.data.status).toBe('completed');
        expect(response.body.data.variables.testVar).toBe('testValue');

        createdExecutionId = response.body.data.id;
      });

      test('should return 500 for non-existent workflow execution', async () => {
        const response = await request(app)
          .post('/api/workflows/non_existent/execute')
          .send({});

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('not found');
      });
    });

    describe('GET /api/executions/:id', () => {
      test('should return execution by id', async () => {
        // First execute a workflow
        const execResponse = await request(app)
          .post('/api/workflows/exec_test_wf/execute')
          .send({});

        const executionId = execResponse.body.data.id;

        const response = await request(app).get(`/api/executions/${executionId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(executionId);
      });

      test('should return 404 for non-existent execution', async () => {
        const response = await request(app).get('/api/executions/non_existent_exec');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Execution not found');
      });
    });

    describe('GET /api/executions', () => {
      test('should return list of executions', async () => {
        const response = await request(app).get('/api/executions');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.total).toBeDefined();
      });
    });

    describe('POST /api/executions/:id/pause', () => {
      test('should pause execution', async () => {
        // Create a workflow and execution
        await request(app)
          .post('/api/workflows')
          .send({
            id: 'pause_test_wf',
            name: 'Pause Test',
            nodes: [{ id: 'start', type: 'start' }],
            edges: []
          });

        const execResponse = await request(app)
          .post('/api/workflows/pause_test_wf/execute')
          .send({});

        // The execution might complete too fast, so we test the API response
        // For a truly running execution, we'd need to mock delays
        const response = await request(app)
          .post(`/api/executions/${execResponse.body.data.id}/pause`);

        // The response depends on execution state
        expect([200, 400]).toContain(response.status);
      });
    });

    describe('POST /api/executions/:id/cancel', () => {
      test('should cancel execution', async () => {
        // Create a workflow and execution
        await request(app)
          .post('/api/workflows')
          .send({
            id: 'cancel_test_wf',
            name: 'Cancel Test',
            nodes: [{ id: 'start', type: 'start' }],
            edges: []
          });

        const execResponse = await request(app)
          .post('/api/workflows/cancel_test_wf/execute')
          .send({});

        const response = await request(app)
          .post(`/api/executions/${execResponse.body.data.id}/cancel`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('cancelled');
      });

      test('should return 400 for non-existent execution', async () => {
        const response = await request(app)
          .post('/api/executions/non_existent/cancel');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Template API', () => {
    describe('GET /api/templates', () => {
      test('should return list of templates', async () => {
        const response = await request(app).get('/api/templates');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('POST /api/templates', () => {
      test('should create a new template', async () => {
        const template = {
          name: 'Test Template',
          description: 'A test template',
          workflow: {
            name: 'Template Workflow',
            nodes: [{ id: 'start', type: 'start' }],
            edges: []
          }
        };

        const response = await request(app)
          .post('/api/templates')
          .send(template);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.name).toBe('Test Template');
      });
    });

    describe('POST /api/templates/:id/instantiate', () => {
      test('should create workflow from template', async () => {
        // First create a template with a complete workflow
        const templateResponse = await request(app)
          .post('/api/templates')
          .send({
            id: 'instantiate_template',
            name: 'Instantiable Template',
            workflow: {
              name: 'Base Workflow',
              version: '1.0.0',
              nodes: [{ id: 'start', type: 'start' }],
              edges: []
            }
          });

        const response = await request(app)
          .post('/api/templates/instantiate_template/instantiate')
          .send({ name: 'Instantiated Workflow' });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Instantiated Workflow');
        expect(response.body.data.id).not.toBe('instantiate_template');
      });

      test('should return 404 for non-existent template', async () => {
        const response = await request(app)
          .post('/api/templates/non_existent/instantiate')
          .send({ name: 'Test' });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/templates/:id/export', () => {
      test('should export template as JSON', async () => {
        // Create a template
        await request(app)
          .post('/api/templates')
          .send({
            id: 'export_template',
            name: 'Exportable Template',
            workflow: {
              nodes: [{ id: 'start', type: 'start' }],
              edges: []
            }
          });

        const response = await request(app).get('/api/templates/export_template/export');

        expect(response.status).toBe(200);
        expect(response.body.id).toBe('export_template');
        expect(response.headers['content-disposition']).toContain('attachment');
      });

      test('should return 404 for non-existent template', async () => {
        const response = await request(app).get('/api/templates/non_existent/export');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/templates/import', () => {
      test('should import template', async () => {
        const template = {
          name: 'Imported Template',
          description: 'An imported template',
          workflow: {
            nodes: [{ id: 'start', type: 'start' }],
            edges: []
          }
        };

        const response = await request(app)
          .post('/api/templates/import')
          .send(template);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.importedAt).toBeDefined();
      });
    });
  });

  describe('AI API', () => {
    describe('POST /api/ai/generate', () => {
      test('should generate workflow from description', async () => {
        const response = await request(app)
          .post('/api/ai/generate')
          .send({ description: 'Create a simple approval workflow' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.name).toBeDefined();
        expect(response.body.data.nodes).toBeDefined();
        expect(response.body.data.edges).toBeDefined();
      });
    });

    describe('POST /api/ai/optimize', () => {
      test('should return optimization suggestions', async () => {
        const workflow = {
          id: 'optimize_test',
          name: 'Test Workflow',
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
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      test('should identify missing timeout configurations', async () => {
        const workflow = {
          nodes: [
            { id: 'start', type: 'start' },
            { id: 'task', type: 'task' }, // no timeout
            { id: 'end', type: 'end' }
          ],
          edges: []
        };

        const response = await request(app)
          .post('/api/ai/optimize')
          .send({ workflow });

        const timeoutSuggestion = response.body.data.find(s => s.type === 'timeout');
        expect(timeoutSuggestion).toBeDefined();
      });

      test('should identify missing retry configurations', async () => {
        const workflow = {
          nodes: [
            { id: 'start', type: 'start' },
            { id: 'task', type: 'task' }, // no retry
            { id: 'end', type: 'end' }
          ],
          edges: []
        };

        const response = await request(app)
          .post('/api/ai/optimize')
          .send({ workflow });

        const retrySuggestion = response.body.data.find(s => s.type === 'retry');
        expect(retrySuggestion).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Express body-parser returns 400 for bad JSON
      expect(response.status).toBe(400);
    });

    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
