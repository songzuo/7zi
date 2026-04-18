/**
 * Script to fix multi-layer.test.ts TypeScript errors
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/rate-limiting-gateway/middleware/multi-layer.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix constructor signature: new MultiLayerMiddleware({ storage, config }) 
//    -> new MultiLayerMiddleware(storage, { config })
content = content.replace(
  /new MultiLayerMiddleware\(\{ storage, config\}\)/g,
  'new MultiLayerMiddleware(storage, { config })'
);

content = content.replace(
  /new MultiLayerMiddleware\(\{ storage, config: DEFAULT_CONFIG\}\)/g,
  'new MultiLayerMiddleware(storage, { config: DEFAULT_CONFIG })'
);

content = content.replace(
  /new MultiLayerMiddleware\(\{ storage, config: invalidConfig\}\)/g,
  'new MultiLayerMiddleware(storage, { config: invalidConfig })'
);

// 2. Fix RateLimitContext - add missing required fields
// Replace partial contexts with complete ones
const contextReplacements = [
  // { ip: '...' } -> { ip: '...', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }
  { 
    pattern: /const context: RateLimitContext = \{\s*ip: '([^']+)',\s*apiKey: '([^']+)',\s*userId: '([^']+)',\s*\}/g,
    replacement: "const context: RateLimitContext = { ip: '$1', apiKey: '$2', userId: '$3', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }"
  },
  {
    pattern: /const context: RateLimitContext = \{\s*ip: '([^']+)',\s*\}/g,
    replacement: "const context: RateLimitContext = { ip: '$1', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }"
  },
  {
    pattern: /const context: RateLimitContext = \{\s*userId: '([^']+)',\s*\}/g,
    replacement: "const context: RateLimitContext = { ip: '127.0.0.1', userId: '$1', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }"
  },
  {
    pattern: /const context: RateLimitContext = \{\s*apiKey: '([^']+)',\s*\}/g,
    replacement: "const context: RateLimitContext = { ip: '127.0.0.1', apiKey: '$1', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }"
  },
];

for (const { pattern, replacement } of contextReplacements) {
  content = content.replace(pattern, replacement);
}

// 3. Fix blockedBy -> limitedBy?.layer
content = content.replace(/expect\(result\.blockedBy\)\.toBe\('([^']+)'\)/g, 
  "expect(result.limitedBy?.layer).toBe('$1')");

// 4. Fix enabled: false configs - they need all required fields
// For tests that use enabled: false, we need to provide full config
content = content.replace(
  /global: \{ enabled: false \}/g,
  "global: { enabled: false, algorithm: 'token-bucket', rate: 1000, burst: 2000 }"
);

content = content.replace(
  /ip: \{ enabled: false \},(\s*)apiKey:/g,
  "ip: { enabled: false, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 100 },\n$1apiKey:"
);

content = content.replace(
  /apiKey: \{ enabled: false \},(\s*)user:/g,
  "apiKey: { enabled: false, algorithm: 'token-bucket', defaultTier: 'free', tiers: {} },\n$1user:"
);

content = content.replace(
  /user: \{ enabled: false \},(\s*)\}/g,
  "user: { enabled: false, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 200 },\n$1}"
);

content = content.replace(
  /user: \{ enabled: false \}/g,
  "user: { enabled: false, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 200 }"
);

fs.writeFileSync(filePath, content);
console.log('Fixed multi-layer.test.ts');
