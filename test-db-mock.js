/**
 * Debug script for Projects API tests
 */

const mockDb = require('./src/test/vi-mocks').getMockDb();
const { clearTable, insertTestRow } = require('./src/test/vi-mocks');

// Clear projects table
clearTable('projects');

console.log('=== Test 1: Insert projects ===');
const p1 = insertTestRow('projects', {
  name: 'Project 1',
  description: 'Description 1',
  status: 'active',
  priority: 'medium',
  progress: 50,
  owner_id: 'test-user-id',
});
console.log('Inserted project 1:', p1);

const p2 = insertTestRow('projects', {
  name: 'Project 2',
  description: 'Description 2',
  status: 'completed',
  priority: 'high',
  progress: 100,
  owner_id: 'test-user-id',
});
console.log('Inserted project 2:', p2);

console.log('\n=== Test 2: Query all projects ===');
const stmt1 = mockDb.prepare('SELECT * FROM projects');
const allProjects = stmt1.all();
console.log('All projects:', allProjects);

console.log('\n=== Test 3: COUNT query ===');
const countStmt = mockDb.prepare('SELECT COUNT(*) as count FROM projects');
const countResult = countStmt.get();
console.log('Count result:', countResult);

console.log('\n=== Test 4: Filter by status ===');
const filterStmt = mockDb.prepare('SELECT * FROM projects WHERE status = ?');
const filteredProjects = filterStmt.all('active');
console.log('Active projects:', filteredProjects);

console.log('\n=== Test 5: LIKE query ===');
const likeStmt = mockDb.prepare('SELECT * FROM projects WHERE name LIKE ?');
const likeResults = likeStmt.all('Project%');
console.log('LIKE query results:', likeResults);

console.log('\n=== Test 6: Count with WHERE ===');
const countFilterStmt = mockDb.prepare('SELECT COUNT(*) as count FROM projects WHERE status = ?');
const countFiltered = countFilterStmt.get('active');
console.log('Count with filter:', countFiltered);
