/**
 * Debug POST flow
 */

const mockDb = require('./src/test/vi-mocks').getMockDb();
const { clearTable } = require('./src/test/vi-mocks');

// Clear
clearTable('projects');

// Simulate INSERT (from database.ts)
console.log('=== Test 1: INSERT ===');
const stmt1 = mockDb.prepare(`
  INSERT INTO projects (name, description, status, priority, progress, owner_id, start_date, end_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const result1 = stmt1.run(
  'New Project',
  'A new test project',
  'active',
  'high',
  0,
  'test-user-id',
  null,
  null
);

console.log('INSERT result:', result1);
console.log('lastInsertRowid:', result1.lastInsertRowid);

// Simulate SELECT (from getProjectById)
console.log('\n=== Test 2: SELECT by id ===');
const stmt2 = mockDb.prepare('SELECT * FROM projects WHERE id = ?');
const row = stmt2.get(result1.lastInsertRowid);
console.log('SELECT result:', row);

// Check rowToProject mapping
console.log('\n=== Test 3: Field mapping ===');
if (row) {
  console.log('id:', row.id);
  console.log('name:', row.name);
  console.log('description:', row.description);
  console.log('status:', row.status);
  console.log('priority:', row.priority);
  console.log('progress:', row.progress);
  console.log('owner_id:', row.owner_id);
  console.log('start_date:', row.start_date);
  console.log('end_date:', row.end_date);
  console.log('created_at:', row.created_at);
  console.log('updated_at:', row.updated_at);
} else {
  console.log('No row found!');
}
