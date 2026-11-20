#!/bin/bash
# API Performance Optimization Quick Start Script
# API 性能优化快速启动脚本

set -e

echo "=================================================="
echo "  7zi-Project API Performance Optimization"
echo "  性能优化快速启动脚本"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if in project root
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_success "Detected 7zi-project root directory"
echo ""

# Step 1: Backup existing files
echo "=================================================="
echo "Step 1: Backing up existing files..."
echo "=================================================="

BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "src/app/api/users/route.ts" ]; then
    cp src/app/api/users/route.ts "$BACKUP_DIR/users-route.ts.backup"
    print_success "Backed up src/app/api/users/route.ts"
fi

if [ -f "src/lib/auth/repository.ts" ]; then
    cp src/lib/auth/repository.ts "$BACKUP_DIR/auth-repository.ts.backup"
    print_success "Backed up src/lib/auth/repository.ts"
fi

if [ -f "src/app/api/backup/route.ts" ]; then
    cp src/app/api/backup/route.ts "$BACKUP_DIR/backup-route.ts.backup"
    print_success "Backed up src/app/api/backup/route.ts"
fi

echo ""
echo "Backups saved to: $BACKUP_DIR"
echo ""

# Step 2: Check for optimized files
echo "=================================================="
echo "Step 2: Checking for optimized files..."
echo "=================================================="

MISSING_FILES=()

if [ ! -f "src/lib/middleware/compression.ts" ]; then
    MISSING_FILES+=("src/lib/middleware/compression.ts")
else
    print_success "Found src/lib/middleware/compression.ts"
fi

if [ ! -f "src/lib/auth/repository-optimized.ts" ]; then
    MISSING_FILES+=("src/lib/auth/repository-optimized.ts")
else
    print_success "Found src/lib/auth/repository-optimized.ts"
fi

if [ ! -f "src/app/api/users/route.optimized.ts" ]; then
    MISSING_FILES+=("src/app/api/users/route.optimized.ts")
else
    print_success "Found src/app/api/users/route.optimized.ts"
fi

if [ ! -f "src/app/api/backup/route.optimized.ts" ]; then
    MISSING_FILES+=("src/app/api/backup/route.optimized.ts")
else
    print_success "Found src/app/api/backup/route.optimized.ts"
fi

echo ""

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    print_error "The following optimized files are missing:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    echo ""
    print_warning "Please run the API performance optimization task first"
    exit 1
fi

print_success "All optimized files found"
echo ""

# Step 3: Ask user for deployment mode
echo "=================================================="
echo "Step 3: Choose deployment mode..."
echo "=================================================="
echo ""
echo "1. Safe Mode (Recommended)"
echo "   - Create parallel optimized endpoints"
echo "   - No changes to existing endpoints"
echo "   - Test before switching"
echo ""
echo "2. Direct Replacement"
echo "   - Replace existing files with optimized versions"
echo "   - Fast but requires thorough testing"
echo ""
echo "3. Abort"
echo "   - Exit without making changes"
echo ""

read -p "Select mode (1/2/3): " mode

case $mode in
    1)
        echo ""
        echo "=================================================="
        echo "Mode: Safe Deployment"
        echo "=================================================="
        echo ""

        # Create parallel endpoints
        if [ -f "src/app/api/users/route.optimized.ts" ]; then
            cp src/app/api/users/route.optimized.ts src/app/api/users-v2/route.ts
            mkdir -p src/app/api/users-v2
            cp src/app/api/users/route.optimized.ts src/app/api/users-v2/route.ts
            print_success "Created /api/users-v2 endpoint"
        fi

        if [ -f "src/app/api/backup/route.optimized.ts" ]; then
            mkdir -p src/app/api/backup-v2
            cp src/app/api/backup/route.optimized.ts src/app/api/backup-v2/route.ts
            print_success "Created /api/backup-v2 endpoint"
        fi

        echo ""
        print_success "Safe deployment complete!"
        echo ""
        echo "You can now test the optimized endpoints:"
        echo "  - http://localhost:3000/api/users-v2"
        echo "  - http://localhost:3000/api/backup-v2"
        echo ""
        print_warning "After testing, you can switch to the new endpoints"
        ;;
    2)
        echo ""
        echo "=================================================="
        echo "Mode: Direct Replacement"
        echo "=================================================="
        echo ""
        print_warning "This will replace existing files. Make sure you have backups!"
        echo ""

        read -p "Are you sure? (yes/no): " confirm

        if [ "$confirm" != "yes" ]; then
            print_warning "Operation cancelled"
            exit 0
        fi

        echo ""

        # Replace files
        if [ -f "src/app/api/users/route.optimized.ts" ]; then
            cp src/app/api/users/route.optimized.ts src/app/api/users/route.ts
            print_success "Replaced src/app/api/users/route.ts"
        fi

        if [ -f "src/app/api/backup/route.optimized.ts" ]; then
            cp src/app/api/backup/route.optimized.ts src/app/api/backup/route.ts
            print_success "Replaced src/app/api/backup/route.ts"
        fi

        # Copy optimized repository
        if [ -f "src/lib/auth/repository-optimized.ts" ]; then
            cp src/lib/auth/repository-optimized.ts src/lib/auth/repository-optimized.ts.new
            print_warning "Note: src/lib/auth/repository-optimized.ts requires manual integration"
        fi

        echo ""
        print_success "Direct replacement complete!"
        echo ""
        print_warning "Please run tests before deploying to production"
        ;;
    3)
        echo ""
        print_warning "Operation cancelled"
        exit 0
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "=================================================="
echo "Next Steps"
echo "=================================================="
echo ""
echo "1. Run tests:"
echo "   npm test"
echo ""
echo "2. Build the project:"
echo "   npm run build"
echo ""
echo "3. Start the development server:"
echo "   npm run dev"
echo ""
echo "4. Test the optimized endpoints:"
if [ "$mode" = "1" ]; then
    echo "   curl http://localhost:3000/api/users-v2"
    echo "   curl http://localhost:3000/api/backup-v2"
else
    echo "   curl http://localhost:3000/api/users"
    echo "   curl http://localhost:3000/api/backup"
fi
echo ""
echo "5. Check compression headers:"
echo "   curl -I -H 'Accept-Encoding: gzip' http://localhost:3000/api/users"
echo ""
echo "6. Monitor cache performance:"
echo "   Check X-Cache header in responses"
echo ""
echo "=================================================="
echo "Documentation"
echo "=================================================="
echo ""
echo "For detailed information, see:"
echo "  - API_OPTIMIZATION_REPORT.md (Performance analysis)"
echo "  - API_OPTIMIZATION_GUIDE.md (Implementation guide)"
echo ""
echo "=================================================="
print_success "Setup complete!"
echo "=================================================="
