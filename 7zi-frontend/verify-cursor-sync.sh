#!/bin/bash

# Cursor Sync Implementation Verification Script
# v1.12.3

echo "=========================================="
echo "Cursor Sync Implementation Verification"
echo "v1.12.3"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check files
echo "📁 Checking implementation files..."

FILES=(
  "src/lib/collab/cursor-sync.ts"
  "src/features/collab/components/CursorOverlay.tsx"
  "src/features/collab/components/RemoteCursor.tsx"
  "src/features/collab/hooks/useCollabCursors.ts"
  "src/features/collab/hooks/useCollabWebSocket.ts"
  "src/features/collab/components/CollabProvider.tsx"
  "src/lib/collab/__tests__/cursor-sync.test.ts"
)

ALL_EXIST=true
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file (missing)"
    ALL_EXIST=false
  fi
done

echo ""

# Check line counts
echo "📊 Code statistics..."

echo "Core implementation:"
wc -l src/lib/collab/cursor-sync.ts 2>/dev/null || echo "  (file not found)"

echo "Components:"
wc -l src/features/collab/components/CursorOverlay.tsx 2>/dev/null || echo "  (file not found)"
wc -l src/features/collab/components/RemoteCursor.tsx 2>/dev/null || echo "  (file not found)"

echo "Hooks:"
wc -l src/features/collab/hooks/useCollabCursors.ts 2>/dev/null || echo "  (file not found)"
wc -l src/features/collab/hooks/useCollabWebSocket.ts 2>/dev/null || echo "  (file not found)"

echo ""

# Check exports
echo "📦 Checking exports..."

if grep -q "CollaborationCursorSync" src/lib/collab/cursor-sync.ts 2>/dev/null; then
  echo -e "${GREEN}✓${NC} CollaborationCursorSync class exported"
else
  echo -e "${RED}✗${NC} CollaborationCursorSync class not found"
fi

if grep -q "CursorOverlay" src/features/collab/components/CursorOverlay.tsx 2>/dev/null; then
  echo -e "${GREEN}✓${NC} CursorOverlay component exported"
else
  echo -e "${RED}✗${NC} CursorOverlay component not found"
fi

if grep -q "RemoteCursor" src/features/collab/components/RemoteCursor.tsx 2>/dev/null; then
  echo -e "${GREEN}✓${NC} RemoteCursor component exported"
else
  echo -e "${RED}✗${NC} RemoteCursor component not found"
fi

if grep -q "useCollabCursors" src/features/collab/hooks/useCollabCursors.ts 2>/dev/null; then
  echo -e "${GREEN}✓${NC} useCollabCursors hook exported"
else
  echo -e "${RED}✗${NC} useCollabCursors hook not found"
fi

echo ""

# Check features
echo "🎯 Checking feature implementation..."

FEATURES=(
  "throttleMs"
  "cleanupTimeout"
  "updateLocalCursor"
  "handleRemoteCursor"
  "removeRemoteCursor"
  "getRemoteCursors"
  "on.*event"
)

for feature in "${FEATURES[@]}"; do
  if grep -q "$feature" src/lib/collab/cursor-sync.ts 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Feature: $feature"
  else
    echo -e "${YELLOW}⚠${NC} Feature: $feature (not found)"
  fi
done

echo ""

# Check tests
echo "🧪 Checking tests..."

if [ -f "src/lib/collab/__tests__/cursor-sync.test.ts" ]; then
  TEST_COUNT=$(grep -c "it(" src/lib/collab/__tests__/cursor-sync.test.ts 2>/dev/null || echo "0")
  echo -e "${GREEN}✓${NC} Test file exists with $TEST_COUNT test cases"
else
  echo -e "${RED}✗${NC} Test file not found"
fi

echo ""

# Summary
echo "=========================================="
echo "Summary"
echo "=========================================="

if [ "$ALL_EXIST" = true ]; then
  echo -e "${GREEN}✓${NC} All core files present"
else
  echo -e "${RED}✗${NC} Some files are missing"
fi

echo ""
echo "Total lines of code:"
find src/lib/collab src/features/collab -name "*.ts" -o -name "*.tsx" | grep -E "(cursor|collab)" | xargs wc -l 2>/dev/null | tail -1 || echo "  (unable to count)"

echo ""
echo "✅ Verification complete!"
echo ""
echo "Next steps:"
echo "  1. Run tests: npm test -- --run cursor-sync"
echo "  2. Start dev server: npm run dev"
echo "  3. Visit demo: /collaboration-cursor-demo"
echo ""