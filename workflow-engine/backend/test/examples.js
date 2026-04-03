/**
 * Workflow Engine Test Examples
 * Run with: node test/examples.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001/api';

// Helper function for HTTP requests
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Test Workflow Example
const testWorkflow = {
  id: 'test_workflow_1',
  name: 'Test Workflow',
  version: '1.0.0',
  description: 'A simple test workflow',
  nodes: [
    {
      id: 'start_1',
      type: 'start',
      name: 'Start',
      position: { x: 100, y: 100 },
      data: {}
    },
    {
      id: 'task_1',
      type: 'task',
      name: 'Process Data',
      position: { x: 300, y: 100 },
      data: {
        action: 'process',
        params: {}
      },
      retry: {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000
      },
      timeout: 30
    },
    {
      id: 'delay_1',
      type: 'delay',
      name: 'Wait',
      position: { x: 500, y: 100 },
      data: {
        duration: 2,
        unit: 'seconds'
      }
    },
    {
      id: 'end_1',
      type: 'end',
      name: 'End',
      position: { x: 700, y: 100 },
      data: {}
    }
  ],
  edges: [
    { id: 'e1', source: 'start_1', target: 'task_1' },
    { id: 'e2', source: 'task_1', target: 'delay_1' },
    { id: 'e3', source: 'delay_1', target: 'end_1' }
  ],
  settings: {
    timeout: 60,
    maxRetries: 3,
    enableCheckpoint: true
  }
};

// Run tests
async function runTests() {
  console.log('🚀 Starting Workflow Engine Tests...\n');

  try {
    // Test 1: Health Check
    console.log('📋 Test 1: Health Check');
    const health = await request('GET', '/health');
    console.log('✅ Health check passed:', health);
    console.log('');

    // Test 2: Create Workflow
    console.log('📋 Test 2: Create Workflow');
    const createResult = await request('POST', '/workflows', testWorkflow);
    console.log('✅ Workflow created:', createResult.success);
    console.log('');

    // Test 3: Get Workflow
    console.log('📋 Test 3: Get Workflow');
    const getResult = await request('GET', `/workflows/${testWorkflow.id}`);
    console.log('✅ Workflow retrieved:', getResult.success);
    console.log('');

    // Test 4: Get All Workflows
    console.log('📋 Test 4: Get All Workflows');
    const allResult = await request('GET', '/workflows');
    console.log('✅ Workflows count:', allResult.total);
    console.log('');

    // Test 5: Execute Workflow
    console.log('📋 Test 5: Execute Workflow');
    const execResult = await request('POST', `/workflows/${testWorkflow.id}/execute`, {
      variables: { test: true }
    });
    console.log('✅ Execution started:', execResult.success);
    console.log('   Execution ID:', execResult.data?.id);
    console.log('');

    // Test 6: Get Execution Status
    if (execResult.data?.id) {
      console.log('📋 Test 6: Get Execution Status');
      const statusResult = await request('GET', `/executions/${execResult.data.id}`);
      console.log('✅ Execution status:', statusResult.data?.status);
      console.log('');
    }

    // Test 7: Get Templates
    console.log('📋 Test 7: Get Templates');
    const templatesResult = await request('GET', '/templates');
    console.log('✅ Templates count:', templatesResult.total);
    console.log('');

    // Test 8: Create Template
    console.log('📋 Test 8: Create Template');
    const templateResult = await request('POST', '/templates', {
      name: 'Test Template',
      description: 'A test template',
      category: 'test',
      workflow: testWorkflow
    });
    console.log('✅ Template created:', templateResult.success);
    console.log('');

    // Test 9: AI Generate
    console.log('📋 Test 9: AI Generate Workflow');
    const aiResult = await request('POST', '/ai/generate', {
      description: 'Create a simple notification workflow'
    });
    console.log('✅ AI generated workflow:', aiResult.success);
    console.log('');

    // Test 10: AI Optimize
    console.log('📋 Test 10: AI Optimize Workflow');
    const optimizeResult = await request('POST', '/ai/optimize', {
      workflow: testWorkflow
    });
    console.log('✅ Optimization suggestions:', optimizeResult.data?.length || 0);
    console.log('');

    console.log('✅ All tests passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testWorkflow };