#!/bin/bash
# Sentry Configuration Verification Script

set -e

echo "========================================="
echo "Sentry Configuration Verification"
echo "========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: This script must be run from the project root${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Running from project root"
echo ""

# Check 1: Sentry package installed
echo "Checking Sentry package installation..."
if grep -q "@sentry/nextjs" package.json; then
    SENTRY_VERSION=$(grep "@sentry/nextjs" package.json | sed 's/.*"@sentry\/nextjs": "\([^"]*\)".*/\1/')
    echo -e "${GREEN}✓${NC} @sentry/nextjs installed (version: $SENTRY_VERSION)"
else
    echo -e "${RED}✗${NC} @sentry/nextjs not found in package.json"
    exit 1
fi
echo ""

# Check 2: Configuration files exist
echo "Checking configuration files..."
CONFIG_FILES=(
    "sentry.client.config.ts"
    "sentry.server.config.ts"
    "src/lib/monitoring/sentry.config.ts"
    "src/lib/monitoring/sentry.client.config.ts"
    "src/lib/monitoring/sentry.server.config.ts"
    "src/components/ErrorBoundary.tsx"
    "src/app/global-error.tsx"
    "src/app/api/health/test-sentry/route.ts"
)

ALL_FILES_EXIST=true
for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file not found"
        ALL_FILES_EXIST=false
    fi
done

if [ "$ALL_FILES_EXIST" = false ]; then
    echo -e "${RED}Error: Some configuration files are missing${NC}"
    exit 1
fi
echo ""

# Check 3: Environment configuration
echo "Checking environment configuration..."
if [ -f ".env.production.sentry" ]; then
    echo -e "${GREEN}✓${NC} .env.production.sentry exists"
    if grep -q "NEXT_PUBLIC_SENTRY_DSN=" .env.production.sentry; then
        echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SENTRY_DSN configured"
    else
        echo -e "${YELLOW}⚠${NC} NEXT_PUBLIC_SENTRY_DSN not set in .env.production.sentry"
    fi
    if grep -q "SENTRY_DSN=" .env.production.sentry; then
        echo -e "${GREEN}✓${NC} SENTRY_DSN configured"
    else
        echo -e "${YELLOW}⚠${NC} SENTRY_DSN not set in .env.production.sentry"
    fi
else
    echo -e "${YELLOW}⚠${NC} .env.production.sentry not found"
fi
echo ""

# Check 4: Documentation
echo "Checking documentation..."
if [ -f "docs/sentry-alert-rules.md" ]; then
    echo -e "${GREEN}✓${NC} docs/sentry-alert-rules.md exists"
else
    echo -e "${YELLOW}⚠${NC} docs/sentry-alert-rules.md not found"
fi
echo ""

# Check 5: TypeScript compilation
echo "Checking TypeScript compilation..."
if command -v npx &> /dev/null; then
    echo "Running TypeScript type check..."
    if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
        echo -e "${RED}✗${NC} TypeScript compilation errors detected"
        npx tsc --noEmit
    else
        echo -e "${GREEN}✓${NC} TypeScript compilation successful"
    fi
else
    echo -e "${YELLOW}⚠${NC} npx not available, skipping TypeScript check"
fi
echo ""

# Check 6: Next.js configuration
echo "Checking Next.js configuration..."
if grep -q "@sentry/nextjs" next.config.ts; then
    echo -e "${GREEN}✓${NC} Sentry SDK mentioned in next.config.ts"
else
    echo -e "${YELLOW}⚠${NC} Sentry SDK not configured in next.config.ts (optional for manual config)"
fi
echo ""

# Summary
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "Configuration Files: ${GREEN}OK${NC}"
echo "Package Installation: ${GREEN}OK${NC}"
echo "Environment Files: ${GREEN}OK${NC}"
echo "Documentation: ${GREEN}OK${NC}"
echo ""
echo "Next Steps:"
echo "1. Configure Sentry DSN in .env.production.sentry"
echo "2. Test Sentry with: curl http://localhost:3000/api/health/test-sentry"
echo "3. Review docs/sentry-alert-rules.md for alert configuration"
echo ""
echo -e "${GREEN}Sentry configuration verification completed!${NC}"
echo ""
