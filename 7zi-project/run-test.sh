#!/bin/bash
# Run a single test file to diagnose issues

cd /root/.openclaw/workspace/7zi-project

echo "Running useBatchSelection test..."
npx vitest run src/hooks/useBatchSelection.test.ts --reporter=verbose 2>&1 | head -200

echo ""
echo "========================================"
echo ""

echo "Running useDashboardData test..."
npx vitest run src/hooks/useDashboardData.test.ts --reporter=verbose 2>&1 | head -200

echo ""
echo "========================================"
echo ""

echo "Running useGitHubData test..."
npx vitest run src/hooks/useGitHubData.test.ts --reporter=verbose 2>&1 | head -200
