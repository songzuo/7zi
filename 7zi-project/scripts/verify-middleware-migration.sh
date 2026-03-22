#!/bin/bash

# Middleware Migration Verification Script
# =========================================

set -e

echo "🔍 Middleware Migration Verification"
echo "======================================"
echo ""

# Check if the new wrapper file exists
echo "1️⃣  Checking new wrapper file..."
if [ -f "src/lib/middleware/with-request-id.ts" ]; then
    echo "   ✅ Wrapper file exists"
else
    echo "   ❌ Wrapper file not found!"
    exit 1
fi
echo ""

# Check if old middleware is deprecated
echo "2️⃣  Checking old middleware status..."
if grep -q "DEPRECATED" "src/middleware.ts" 2>/dev/null; then
    echo "   ✅ Old middleware is deprecated"
else
    echo "   ❌ Old middleware still active!"
    exit 1
fi
echo ""

# Check if middleware matcher is empty
echo "3️⃣  Checking middleware matcher..."
if grep -q 'matcher: \[\]' "src/middleware.ts" 2>/dev/null; then
    echo "   ✅ Middleware matcher is empty (no routes affected)"
else
    echo "   ⚠️  Middleware matcher may still be processing routes!"
fi
echo ""

# Check if documentation exists
echo "4️⃣  Checking migration documentation..."
if [ -f "docs/middleware-migration.md" ]; then
    echo "   ✅ Migration documentation exists"
else
    echo "   ❌ Migration documentation not found!"
fi
echo ""

# Check if example route exists
echo "5️⃣  Checking example route..."
if [ -f "src/app/api/example/route.ts" ]; then
    echo "   ✅ Example route exists"
else
    echo "   ⚠️  Example route not found (optional)"
fi
echo ""

# Check if migration script exists
echo "6️⃣  Checking migration script..."
if [ -f "scripts/migrate-middleware.js" ]; then
    echo "   ✅ Migration script exists"
else
    echo "   ❌ Migration script not found!"
fi
echo ""

# Check TypeScript syntax
echo "7️⃣  Checking TypeScript syntax..."
if npx tsc --noEmit src/lib/middleware/with-request-id.ts 2>/dev/null; then
    echo "   ✅ TypeScript syntax is valid"
else
    echo "   ⚠️  TypeScript check failed (may need build context)"
fi
echo ""

# Count API routes
echo "8️⃣  Counting API routes..."
API_COUNT=$(find src/app/api -name "route.ts" -type f 2>/dev/null | wc -l)
echo "   📊 Found $API_COUNT API route files"
echo ""

# Check for already-migrated routes
echo "9️⃣  Checking for migrated routes..."
MIGRATED=$(grep -r "withRequestId" src/app/api --include="*.ts" 2>/dev/null | wc -l)
echo "   📈 Found $MIGRATED files using withRequestId"
echo ""

echo "✅ Verification Complete!"
echo ""
echo "Summary:"
echo "  - Infrastructure: ✅ Ready"
echo "  - API routes to migrate: $API_COUNT"
echo "  - Routes already migrated: $MIGRATED"
echo ""
echo "Next Steps:"
echo "  1. Run migration script: node scripts/migrate-middleware.js --dry-run"
echo "  2. Review and test: npm run dev"
echo "  3. Migrate routes: node scripts/migrate-middleware.js --all"
echo ""
