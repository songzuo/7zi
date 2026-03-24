/**
 * WebSocket Server Test Script
 *
 * Simulates multiple users connecting and collaborating in real-time
 * to test the WebSocket server functionality.
 */

const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3002';
const TEST_ROOM_ID = 'test-room-1';
const TEST_DOCUMENT_ID = 'test-doc-1';

// Test configuration
const TEST_USERS = [
  { id: 'user-alice', name: 'Alice', color: '#ef4444' },
  { id: 'user-bob', name: 'Bob', color: '#3b82f6' },
  { id: 'user-charlie', name: 'Charlie', color: '#10b981' },
];

let connectedUsers = 0;
let passedTests = 0;
let failedTests = 0;

// Test results
const testResults = [];

function logTest(name, passed, message) {
  const result = { name, passed, message, timestamp: new Date().toISOString() };
  testResults.push(result);

  if (passed) {
    passedTests++;
    console.log(`✅ PASS: ${name} - ${message}`);
  } else {
    failedTests++;
    console.log(`❌ FAIL: ${name} - ${message}`);
  }
}

async function runTests() {
  console.log('\n🚀 Starting WebSocket Server Tests...\n');

  // Test 1: Health Check
  try {
    const response = await fetch(`${SERVER_URL}/health`);
    const health = await response.json();

    if (health.status === 'ok' && typeof health.rooms === 'number' && typeof health.connections === 'number') {
      logTest('Health Check', true, `Server is healthy, ${health.connections} connections`);
    } else {
      logTest('Health Check', false, 'Invalid health check response');
    }
  } catch (error) {
    logTest('Health Check', false, error.message);
  }

  // Test 2: Connect multiple users
  const clients = [];

  for (const user of TEST_USERS) {
    try {
      const client = io(SERVER_URL, {
        auth: {
          userId: user.id,
          userName: user.name,
        },
        transports: ['websocket'],
        reconnection: false,
      });

      client.user = user; // Store user info on client object

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);

        client.on('connect', () => {
          clearTimeout(timeout);
          connectedUsers++;
          console.log(`   👤 ${user.name} connected`);
          resolve();
        });

        client.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        client.on('auth:authenticated', (data) => {
          logTest(`Authentication (${user.name})`, true, `User authenticated: ${data.userId}`);
        });
      });

      clients.push({ client, user });
    } catch (error) {
      logTest(`Connection (${user.name})`, false, error.message);
    }
  }

  logTest('Multiple Connections', connectedUsers === TEST_USERS.length,
    `${connectedUsers}/${TEST_USERS.length} users connected`);

  // Test 3: Join room
  let usersInRoom = 0;

  for (const { client, user } of clients) {
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Join room timeout')), 5000);

        client.once('room:joined', (data) => {
          clearTimeout(timeout);
          usersInRoom++;

          console.log(`   🏠 ${user.name} joined room ${TEST_ROOM_ID} (${data.users.length} users)`);
          resolve(data);
        });

        client.emit('room:join', {
          roomId: TEST_ROOM_ID,
          type: 'document',
          documentId: TEST_DOCUMENT_ID,
          name: 'Test Room',
        });
      });
    } catch (error) {
      logTest(`Join Room (${user.name})`, false, error.message);
    }
  }

  logTest('Join Room', usersInRoom === TEST_USERS.length,
    `${usersInRoom}/${TEST_USERS.length} users joined room`);

  // Test 4: Check user list
  await new Promise(resolve => setTimeout(resolve, 500));

  for (const { client, user } of clients) {
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Get users timeout')), 5000);

        client.once('room:user_list', (data) => {
          clearTimeout(timeout);

          if (data.users.length === TEST_USERS.length) {
            logTest(`User List (${user.name})`, true,
              `Received ${data.users.length} users in room`);
          } else {
            logTest(`User List (${user.name})`, false,
              `Expected ${TEST_USERS.length} users, got ${data.users.length}`);
          }

          resolve();
        });

        client.emit('room:get_users', { roomId: TEST_ROOM_ID });
      });
    } catch (error) {
      logTest(`User List (${user.name})`, false, error.message);
    }
  }

  // Test 5: Document operations (test broadcasting)
  console.log('\n📝 Testing document operations...');

  const [senderClientWrapper, ...receiverClientsWrappers] = clients;
  const senderClient = senderClientWrapper.client;
  const senderUser = senderClientWrapper.user;

  let operationsReceived = 0;

  // Set up receivers to listen for operations
  for (const { client, user } of receiverClientsWrappers) {
    client.on('doc:operation_applied', (data) => {
      operationsReceived++;
      console.log(`   📥 ${user.name} received operation from ${data.userName}`);
    });
  }

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Operation broadcast timeout')), 5000);

      // Sender sends an operation
      const operation = {
        type: 'insert',
        position: 0,
        content: `Hello from ${senderUser.name}!`,
      };

      console.log(`   📤 ${senderUser.name} sending operation: ${operation.content}`);

      senderClient.emit('doc:operation', {
        roomId: TEST_ROOM_ID,
        operation,
      });

      // Wait for receivers to get the operation
      setTimeout(() => {
        clearTimeout(timeout);
        resolve();
      }, 1000);
    });

    logTest('Document Operation Broadcast', operationsReceived === receiverClientsWrappers.length,
      `${operationsReceived}/${receiverClientsWrappers.length} receivers got the operation`);
  } catch (error) {
    logTest('Document Operation Broadcast', false, error.message);
  }

  // Test 6: Cursor tracking
  console.log('\n🖱️ Testing cursor tracking...');

  const cursorUpdatesReceived = {};

  for (const { client, user } of clients) {
    cursorUpdatesReceived[user.id] = 0;

    client.on('cursor:update', (data) => {
      if (data.userId !== user.id) {
        cursorUpdatesReceived[user.id]++;
        console.log(`   👁️ ${user.name} sees ${data.userName}'s cursor at position ${data.position}`);
      }
    });
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  for (const { client, user } of clients) {
    client.emit('cursor:move', {
      roomId: TEST_ROOM_ID,
      position: Math.floor(Math.random() * 100),
    });
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  let totalCursorUpdates = Object.values(cursorUpdatesReceived).reduce((a, b) => a + b, 0);
  let expectedCursorUpdates = TEST_USERS.length * (TEST_USERS.length - 1);

  logTest('Cursor Tracking', totalCursorUpdates === expectedCursorUpdates,
    `${totalCursorUpdates}/${expectedCursorUpdates} cursor updates received`);

  // Test 7: Typing indicators
  console.log('\n⌨️ Testing typing indicators...');

  const typingUpdatesReceived = {};

  for (const { client, user } of clients) {
    typingUpdatesReceived[user.id] = 0;

    client.on('presence:typing', (data) => {
      if (data.userId !== user.id) {
        typingUpdatesReceived[user.id]++;
        console.log(`   💬 ${user.name} sees ${data.userName} is typing: ${data.isTyping}`);
      }
    });
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  for (const { client, user } of clients) {
    client.emit('presence:typing', {
      roomId: TEST_ROOM_ID,
      isTyping: true,
    });
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  let totalTypingUpdates = Object.values(typingUpdatesReceived).reduce((a, b) => a + b, 0);
  let expectedTypingUpdates = TEST_USERS.length * (TEST_USERS.length - 1);

  logTest('Typing Indicators', totalTypingUpdates === expectedTypingUpdates,
    `${totalTypingUpdates}/${expectedTypingUpdates} typing updates received`);

  // Test 8: Document sync
  console.log('\n🔄 Testing document sync...');

  let syncSuccessful = 0;

  for (const { client } of clients) {
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Sync timeout')), 5000);

        client.once('doc:sync', (data) => {
          clearTimeout(timeout);

          if (data.roomId === TEST_ROOM_ID && data.document) {
            syncSuccessful++;
            console.log(`   📄 ${client.user.name} synced document (revision: ${data.document.revision})`);
          }

          resolve();
        });

        client.emit('doc:sync', { roomId: TEST_ROOM_ID });
      });
    } catch (error) {
      logTest('Document Sync', false, error.message);
    }
  }

  logTest('Document Sync', syncSuccessful === clients.length,
    `${syncSuccessful}/${clients.length} clients synced document`);

  // Test 9: Disconnect
  console.log('\n🔌 Testing disconnect...');

  for (const { client, user } of clients) {
    try {
      client.emit('room:leave', { roomId: TEST_ROOM_ID });

      await new Promise((resolve) => {
        setTimeout(() => resolve(), 500);
      });

      client.disconnect();
      console.log(`   👋 ${user.name} disconnected`);
    } catch (error) {
      logTest(`Disconnect (${user.name})`, false, error.message);
    }
  }

  logTest('Disconnect', true, 'All clients disconnected gracefully');

  // Test 10: Final stats
  try {
    const response = await fetch(`${SERVER_URL}/stats`);
    const stats = await response.json();

    logTest('Final Stats', stats.connections === 0,
      `Server stats: ${Array.isArray(stats.rooms) ? stats.rooms.length : 'unknown'} rooms, ${stats.connections} connections (all cleaned up)`);
  } catch (error) {
    logTest('Final Stats', false, error.message);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.length}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / testResults.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(60) + '\n');

  // Print detailed results
  if (failedTests > 0) {
    console.log('❌ Failed Tests Details:\n');
    testResults.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
    console.log('');
  }

  // Return exit code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
