/**
 * Script to fix storage-adapter.test.ts TypeScript errors
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/rate-limiting-gateway/storage/storage-adapter.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix retryAttempts -> maxRetries
content = content.replace(/retryAttempts: 1/g, 'maxRetries: 1');

// Fix maxRetriesPerRequest -> maxRetries
content = content.replace(/maxRetriesPerRequest: 3/g, 'maxRetries: 3');

fs.writeFileSync(filePath, content);
console.log('Fixed storage-adapter.test.ts');
