#!/bin/bash
# Script to run L1 Cache + Bull Queue integration tests

set -e

echo "=========================================="
echo "Running L1 Cache + Bull Queue Integration Tests"
echo "=========================================="
echo ""

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Warning: Redis is not accessible"
    echo "   Tests may fail if Redis is required"
    echo ""
fi

# Run the integration test
echo "Running integration test..."
echo ""

cd /root/.openclaw/workspace/7zi-project

./node_modules/.bin/vitest \
  run \
  src/lib/cache/__tests__/cache-queue-integration.test.ts \
  --reporter=verbose \
  --no-coverage

echo ""
echo "=========================================="
echo "Integration tests completed"
echo "=========================================="
