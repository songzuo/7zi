#!/bin/bash
# Verification script for test fixes

echo "================================================"
echo "TEST FIXES VERIFICATION SCRIPT"
echo "================================================"
echo ""
echo "This script will verify the test fixes applied to:"
echo "  1. src/hooks/useBatchSelection.test.ts"
echo "  2. src/hooks/useDashboardData.test.ts"
echo "  3. src/hooks/useGitHubData.test.ts"
echo ""

# Check if files exist
echo "1. Checking file existence..."
for file in \
  "/root/.openclaw/workspace/7zi-project/src/hooks/useBatchSelection.test.ts" \
  "/root/.openclaw/workspace/7zi-project/src/hooks/useDashboardData.test.ts" \
  "/root/.openclaw/workspace/7zi-project/src/hooks/useGitHubData.test.ts" \
  "/root/.openclaw/workspace/7zi-project/src/test/setup.tsx"; do

  if [ -f "$file" ]; then
    echo "  ✓ $file exists"
  else
    echo "  ✗ $file NOT FOUND"
  fi
done

echo ""
echo "2. Checking for timer cleanup in test files..."

# Check useGitHubData.test.ts for try/finally blocks
if grep -q "try {" /root/.openclaw/workspace/7zi-project/src/hooks/useGitHubData.test.ts && \
   grep -q "vi.useRealTimers()" /root/.openclaw/workspace/7zi-project/src/hooks/useGitHubData.test.ts; then
  echo "  ✓ useGitHubData.test.ts has timer cleanup"
else
  echo "  ✗ useGitHubData.test.ts missing timer cleanup"
fi

# Check useDashboardData.test.ts for mock clearing
if grep -q "mockFetch.mockClear()" /root/.openclaw/workspace/7zi-project/src/hooks/useDashboardData.test.ts && \
   grep -q "vi.useRealTimers()" /root/.openclaw/workspace/7zi-project/src/hooks/useDashboardData.test.ts; then
  echo "  ✓ useDashboardData.test.ts has mock and timer cleanup"
else
  echo "  ✗ useDashboardData.test.ts missing cleanup"
fi

# Check useBatchSelection.test.ts for cleanup
if grep -q "vi.clearAllMocks()" /root/.openclaw/workspace/7zi-project/src/hooks/useBatchSelection.test.ts && \
   grep -q "vi.useRealTimers()" /root/.openclaw/workspace/7zi-project/src/hooks/useBatchSelection.test.ts; then
  echo "  ✓ useBatchSelection.test.ts has cleanup"
else
  echo "  ✗ useBatchSelection.test.ts missing cleanup"
fi

echo ""
echo "3. Checking setup.tsx for global cleanup..."

# Check setup.tsx for beforeEach and afterEach
if grep -q "beforeEach" /root/.openclaw/workspace/7zi-project/src/test/setup.tsx && \
   grep -q "vi.useRealTimers()" /root/.openclaw/workspace/7zi-project/src/test/setup.tsx; then
  echo "  ✓ setup.tsx has beforeEach/afterEach with timer cleanup"
else
  echo "  ✗ setup.tsx missing cleanup"
fi

echo ""
echo "4. Verifying test configuration..."

if [ -f "/root/.openclaw/workspace/7zi-project/vitest.config.ts" ]; then
  echo "  ✓ vitest.config.ts exists"
  if grep -q "testTimeout: 10000" /root/.openclaw/workspace/7zi-project/vitest.config.ts; then
    echo "  ✓ Test timeout is set to 10000ms"
  fi
else
  echo "  ✗ vitest.config.ts NOT FOUND"
fi

echo ""
echo "================================================"
echo "VERIFICATION COMPLETE"
echo "================================================"
echo ""
echo "To run the tests, execute:"
echo "  npm test -- --run"
echo ""
echo "Or run individual test files:"
echo "  npm test -- src/hooks/useBatchSelection.test.ts --run"
echo "  npm test -- src/hooks/useDashboardData.test.ts --run"
echo "  npm test -- src/hooks/useGitHubData.test.ts --run"
