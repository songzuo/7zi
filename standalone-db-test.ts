#!/usr/bin/env node
/**
 * Standalone test to verify database behavior
 */

process.env.DATABASE_PATH = '/tmp/standalone-test.sqlite';
process.env.NODE_ENV = 'test';
process.env.ENABLE_DB_PERFORMANCE_LOGGING = 'false';

import { getDatabase, closeDatabase } from './src/lib/db/index.ts';

console.log('=== Testing Database ===');
console.log('DATABASE_PATH:', process.env.DATABASE_PATH);
console.log('NODE_ENV:', process.env.NODE_ENV);

const db = getDatabase();
console.log('Got database connection');

// Drop table if exists
try {
  db.exec('DROP TABLE IF EXISTS test_table');
} catch (e) {
  // Ignore
}

// Create table
const createResult = db.exec('CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT)');
console.log('Create result:', createResult);

// Insert data
const insertResult = db.exec('INSERT INTO test_table (id, name) VALUES (?, ?)', [1, 'Test']);
console.log('Insert result:', insertResult);

// Query all
const queryResult = db.queryRows('SELECT * FROM test_table');
console.log('Query result:', queryResult);
console.log('Query result length:', queryResult.length);
console.log('Query result is array:', Array.isArray(queryResult));

// Test prepared statement
const stmt = db.prepare('SELECT * FROM test_table WHERE id = ?');
const preparedResult = stmt.get(1);
console.log('Prepared statement result:', preparedResult);

closeDatabase();
console.log('=== Test Complete ===');
