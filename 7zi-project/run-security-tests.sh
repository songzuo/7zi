#!/bin/bash

echo "🚀 Running API Security Tests..."
echo ""

# Change to the project directory
cd /root/.openclaw/workspace/7zi-project

echo "📝 Test 1: Type Checking"
npx tsc --noEmit 2>&1 | head -50

echo ""
echo "✅ Type checking complete"
echo ""

echo "📊 Test 2: Running existing test suite"
npm run test:run 2>&1 | tail -100

echo ""
echo "✅ Test execution complete"
echo ""

echo "📁 Files created:"
find 7zi-frontend/src -type f \( -name "rate-limit/*" -o -name "audit/*" -o -name "validation-schemas.ts" -o -name "middleware.ts" \) | sort

echo ""
echo "✅ All tests completed"
