#!/bin/bash

# Script to run all new test files created for coverage improvement

set -e

echo "====================================="
echo "Running New Test Coverage Tests"
echo "====================================="
echo ""

cd /root/.openclaw/workspace/7zi-project

echo "1. Testing Database Module..."
npx vitest run tests/lib/db.test.ts --reporter=dot || echo "DB tests had issues"

echo ""
echo "2. Testing Permissions Module..."
npx vitest run tests/lib/permissions.test.ts --reporter=dot || echo "Permissions tests had issues"

echo ""
echo "3. Testing MCP Tools Module..."
npx vitest run tests/lib/mcp-tools.test.ts --reporter=dot || echo "MCP Tools tests had issues"

echo ""
echo "4. Testing useThemeEnhanced Hook..."
npx vitest run tests/hooks/useThemeEnhanced.test.ts --reporter=dot || echo "useThemeEnhanced tests had issues"

echo ""
echo "5. Testing Dashboard Store..."
npx vitest run tests/stores/dashboardStore.test.ts --reporter=dot || echo "Dashboard Store tests had issues"

echo ""
echo "6. Testing Auth Store (placeholder)..."
npx vitest run tests/stores/authStore.test.ts --reporter=dot || echo "Auth Store tests had issues"

echo ""
echo "====================================="
echo "All New Tests Completed"
echo "====================================="
