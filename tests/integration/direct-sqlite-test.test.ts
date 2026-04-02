#!/usr/bin/env node
/**
 * Direct test of better-sqlite3 in vitest environment
 */

import Database from 'better-sqlite3'

console.error('Testing better-sqlite3 directly...')

const db = new Database('/tmp/direct-test.sqlite')

console.error('Creating table...')
db.exec('CREATE TABLE IF NOT EXISTS test_direct (id INTEGER PRIMARY KEY, name TEXT)')

console.error('Checking tables...')
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
console.error('Tables:', tables)

console.error('Inserting data...')
const insertStmt = db.prepare('INSERT INTO test_direct (id, name) VALUES (?, ?)')
const insertResult = insertStmt.run(1, 'Test')
console.error('Insert result:', insertResult)

console.error('Querying data...')
const selectStmt = db.prepare('SELECT * FROM test_direct')
const selectResult = selectStmt.all()
console.error('Select result:', selectResult)

db.close()
console.error('Done!')
