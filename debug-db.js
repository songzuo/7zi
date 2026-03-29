// Debug script to understand database behavior
process.env.DATABASE_PATH = ':memory:';
process.env.NODE_ENV = 'test';
process.env.ENABLE_DB_PERFORMANCE_LOGGING = 'false';

const { getDatabase, closeDatabase } = require('./src/lib/db/index.ts');

console.log('1. Getting database...');
const db = getDatabase();

console.log('2. Creating table...');
db.exec('CREATE TABLE IF NOT EXISTS debug_test (id INTEGER, name TEXT)');

console.log('3. Inserting data...');
const insertResult = db.exec('INSERT INTO debug_test (id, name) VALUES (?, ?)', [1, 'Test']);
console.log('   Insert result:', insertResult);

console.log('4. Querying data...');
const queryResult = db.queryRows('SELECT * FROM debug_test');
console.log('   Query result:', queryResult);
console.log('   Query result length:', queryResult?.length);

console.log('5. Testing batch...');
try {
  const batchResult = db.batch([
    { sql: 'INSERT INTO debug_test (id, name) VALUES (?, ?)', params: [2, 'Batch 1'] },
  ]);
  console.log('   Batch result:', batchResult);
  console.log('   Batch result type:', typeof batchResult);
} catch (e) {
  console.log('   Batch error:', e.message);
}

console.log('6. Querying again...');
const queryResult2 = db.queryRows('SELECT * FROM debug_test');
console.log('   Query result:', queryResult2);
console.log('   Query result length:', queryResult2?.length);

closeDatabase();
