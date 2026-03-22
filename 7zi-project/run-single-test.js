const { spawn } = require('child_process');

const testFile = process.argv[2] || 'src/hooks/useBatchSelection.test.ts';

console.log(`\n=== Running: ${testFile} ===\n`);

const vitest = spawn('npx', ['vitest', 'run', testFile, '--reporter=verbose'], {
  cwd: '/root/.openclaw/workspace/7zi-project',
  stdio: 'inherit'
});

// Set a timeout of 10 seconds
const timeout = setTimeout(() => {
  console.log('\n\n=== TEST TIMED OUT (10 seconds) ===');
  vitest.kill('SIGKILL');
  process.exit(1);
}, 10000);

vitest.on('close', (code) => {
  clearTimeout(timeout);
  console.log(`\n=== Test exited with code: ${code} ===\n`);
  process.exit(code);
});

vitest.on('error', (err) => {
  clearTimeout(timeout);
  console.error('Failed to start vitest:', err);
  process.exit(1);
});
