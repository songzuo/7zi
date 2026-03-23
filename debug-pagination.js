/**
 * Debug script for pagination
 */

// Simulate what happens in the test
const mockDb = require('./src/test/vi-mocks').getMockDb();
const { clearTable, insertTestRow } = require('./src/test/vi-mocks');

// Clear and insert 5 projects
clearTable('projects');
for (let i = 1; i <= 5; i++) {
  insertTestRow('projects', {
    name: `Project ${i}`,
    description: `Description ${i}`,
    status: 'active',
    priority: 'medium',
    progress: 50,
    owner_id: 'test-user-id',
    created_at: `2024-01-0${i}T00:00:00.000Z`,
    updated_at: `2024-01-0${i}T00:00:00.000Z`,
  });
}

console.log('Total projects:', mockDb.prepare('SELECT * FROM projects').all().length);

// Test 1: Query with LIMIT and OFFSET (no WHERE clause)
console.log('\n=== Test 1: SELECT * FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?');
const stmt1 = mockDb.prepare('SELECT * FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?');
console.log('Statement mock:', stmt1);
const result1 = stmt1.all(2, 2);
console.log('Result length:', result1.length);
console.log('Result:', result1);

// Test 2: Query with WHERE, LIMIT and OFFSET
console.log('\n=== Test 2: SELECT * FROM projects WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?');
const stmt2 = mockDb.prepare('SELECT * FROM projects WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?');
const result2 = stmt2.all('active', 2, 2);
console.log('Result length:', result2.length);
console.log('Result:', result2);

// Test 3: Query with WHERE and LIKE (OR), LIMIT and OFFSET
console.log('\n=== Test 3: SELECT * FROM projects WHERE (name LIKE ? OR description LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?');
const stmt3 = mockDb.prepare('SELECT * FROM projects WHERE (name LIKE ? OR description LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?');
const result3 = stmt3.all('%Project%', '%Project%', 2, 0);
console.log('Result length:', result3.length);
console.log('Result:', result3);

// Test 4: COUNT query
console.log('\n=== Test 4: SELECT COUNT(*) as count FROM projects');
const stmt4 = mockDb.prepare('SELECT COUNT(*) as count FROM projects');
const result4 = stmt4.get();
console.log('Result:', result4);

// Test 5: COUNT query with WHERE
console.log('\n=== Test 5: SELECT COUNT(*) as count FROM projects WHERE status = ?');
const stmt5 = mockDb.prepare('SELECT COUNT(*) as count FROM projects WHERE status = ?');
const result5 = stmt5.get('active');
console.log('Result:', result5);
