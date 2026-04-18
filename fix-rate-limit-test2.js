/**
 * Fix multi-layer.test.ts constructor calls
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/rate-limiting-gateway/middleware/multi-layer.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix: new MultiLayerMiddleware({ storage, config }) -> new MultiLayerMiddleware(storage, config)
content = content.replace(
  /new MultiLayerMiddleware\(\{\s*storage,\s*config\}\)/g,
  'new MultiLayerMiddleware(storage, config)'
);

// Fix: new MultiLayerMiddleware({ storage, config: DEFAULT_CONFIG }) -> new MultiLayerMiddleware(storage, DEFAULT_CONFIG)
content = content.replace(
  /new MultiLayerMiddleware\(\{\s*storage,\s*config:\s*DEFAULT_CONFIG\s*\}\)/g,
  'new MultiLayerMiddleware(storage, DEFAULT_CONFIG)'
);

// Fix: new MultiLayerMiddleware({ storage, config: invalidConfig }) -> new MultiLayerMiddleware(storage, invalidConfig)
content = content.replace(
  /new MultiLayerMiddleware\(\{\s*storage,\s*config:\s*invalidConfig\s*\}\)/g,
  'new MultiLayerMiddleware(storage, invalidConfig)'
);

// Fix: new MultiLayerMiddleware({ storage, config: someConfig, metrics: ... }) -> new MultiLayerMiddleware(storage, someConfig, metrics)
content = content.replace(
  /new MultiLayerMiddleware\(\{\s*storage,\s*config:\s*([^,]+),\s*metrics:\s*([^}]+)\s*\}\)/g,
  'new MultiLayerMiddleware(storage, $1, $2)'
);

fs.writeFileSync(filePath, content);
console.log('Fixed multi-layer.test.ts constructor calls');

// Fix storage-adapter.test.ts - remove lazyConnect
const filePath2 = path.join(__dirname, 'src/lib/rate-limiting-gateway/storage/storage-adapter.test.ts');
let content2 = fs.readFileSync(filePath2, 'utf8');
content2 = content2.replace(/lazyConnect: true,\n?/g, '');
fs.writeFileSync(filePath2, content2);
console.log('Fixed storage-adapter.test.ts - removed lazyConnect');
