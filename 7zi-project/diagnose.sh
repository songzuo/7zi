#!/bin/bash
# Simple diagnostic script

echo "=== Environment Check ==="
echo "Node version:"
node --version
echo "NPM version:"
npm --version

echo ""
echo "=== Project Structure Check ==="
echo "Test files:"
find /root/.openclaw/workspace/7zi-project/src/hooks -name "*.test.ts" | head -10

echo ""
echo "=== Vitest Config Check ==="
if [ -f /root/.openclaw/workspace/7zi-project/vitest.config.ts ]; then
  echo "vitest.config.ts exists"
else
  echo "vitest.config.ts NOT FOUND"
fi

echo ""
echo "=== Setup File Check ==="
if [ -f /root/.openclaw/workspace/7zi-project/src/test/setup.tsx ]; then
  echo "setup.tsx exists"
  head -20 /root/.openclaw/workspace/7zi-project/src/test/setup.tsx
else
  echo "setup.tsx NOT FOUND"
fi

echo ""
echo "=== Test File Syntax Check ==="
for file in /root/.openclaw/workspace/7zi-project/src/hooks/useBatchSelection.test.ts \
            /root/.openclaw/workspace/7zi-project/src/hooks/useDashboardData.test.ts \
            /root/.openclaw/workspace/7zi-project/src/hooks/useGitHubData.test.ts; do
  echo "Checking: $file"
  if [ -f "$file" ]; then
    echo "  File exists"
    # Check if it starts with a describe block
    head -5 "$file"
  else
    echo "  File NOT FOUND"
  fi
  echo ""
done
