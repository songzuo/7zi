#!/bin/bash
# Cleanup Script for 7zi-Project Orphaned/Stale Files
# Based on CLEANUP_REPORT.md (2026-03-20)
# DRY-RUN MODE BY DEFAULT - Review before enabling delete mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=true  # Set to false to actually delete files
PROJECT_ROOT="/root/.openclaw/workspace/7zi-project"

# Counters
DELETED_COUNT=0
DELETED_SIZE=0

cd "$PROJECT_ROOT" || exit 1

echo "================================================"
echo "7zi-Project Cleanup Script"
echo "================================================"
echo ""
echo "Project Root: $PROJECT_ROOT"
echo "Mode: $( [ "$DRY_RUN" = true ] && echo -e "${YELLOW}DRY-RUN (no changes)${NC}" || echo -e "${GREEN}ACTIVE (will delete)${NC}" )"
echo ""
echo "Press Ctrl+C to cancel, or Enter to continue..."
read -r

echo ""
echo "================================================"
echo "Phase 1: Temporary Test Files (Root)"
echo "================================================"

# Test files to remove
TEST_FILES=(
  "test-output.txt"
  "test-output-full.txt"
  "test-api-performance.sh"
  "test-websocket.sh"
  "test-sse.sh"
  "test-optimization.js"
  "test-optimization.db"
  "test-darkmode.mjs"
  "test-debug.js"
  "test-deepclone-performance.ts"
)

for file in "${TEST_FILES[@]}"; do
  if [ -f "$file" ]; then
    size=$(du -h "$file" | cut -f1)
    if [ "$DRY_RUN" = true ]; then
      echo -e "${YELLOW}[DRY-RUN]${NC} Would remove: $file ($size)"
    else
      echo -e "${GREEN}Removing:${NC} $file ($size)"
      rm "$file"
    fi
    ((DELETED_COUNT++))
  fi
done

echo ""
echo "================================================"
echo "Phase 2: Build Log Files"
echo "================================================"

# Build logs to remove
rm -rf *.log 2>/dev/null || true
LOG_COUNT=$(find . -maxdepth 1 -name "*.log" -type f | wc -l)

if [ "$LOG_COUNT" -gt 0 ]; then
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY-RUN]${NC} Would remove $LOG_COUNT log files"
  else
    echo -e "${GREEN}Removing:${NC} $LOG_COUNT log files"
    find . -maxdepth 1 -name "*.log" -type f -delete
  fi
  ((DELETED_COUNT+=LOG_COUNT))
fi

echo ""
echo "================================================"
echo "Phase 3: Generated HTML Build Artifacts"
echo "================================================"

# HTML artifacts to remove
HTML_DIRS=(
  "html"
  "7zi-frontend/html"
)

for dir in "${HTML_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    size=$(du -sh "$dir" | cut -f1)
    if [ "$DRY_RUN" = true ]; then
      echo -e "${YELLOW}[DRY-RUN]${NC} Would remove: $dir/ ($size)"
    else
      echo -e "${GREEN}Removing:${NC} $dir/ ($size)"
      rm -rf "$dir"
    fi
    ((DELETED_COUNT++))
  fi
done

echo ""
echo "================================================"
echo "Phase 4: Demo/Experimental Code"
echo "================================================"

# Demo directories to remove
DEMO_DIRS=(
  "src/app/collaboration-demo"
  "src/app/sse-demo"
)

for dir in "${DEMO_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    size=$(du -sh "$dir" | cut -f1)
    if [ "$DRY_RUN" = true ]; then
      echo -e "${YELLOW}[DRY-RUN]${NC} Would remove: $dir/ ($size)"
    else
      echo -e "${GREEN}Removing:${NC} $dir/ ($size)"
      rm -rf "$dir"
    fi
    ((DELETED_COUNT++))
  fi
done

echo ""
echo "================================================"
echo "Phase 5: Test Coverage Artifacts"
echo "================================================"

# Test coverage artifacts
COVERAGE_FILES=(
  "coverage-a2a.json"
)

for file in "${COVERAGE_FILES[@]}"; do
  if [ -f "$file" ]; then
    if [ "$DRY_RUN" = true ]; then
      echo -e "${YELLOW}[DRY-RUN]${NC} Would remove: $file"
    else
      echo -e "${GREEN}Removing:${NC} $file"
      rm "$file"
    fi
    ((DELETED_COUNT++))
  fi
done

echo ""
echo "================================================"
echo "Phase 6: Archive Root-Level Reports"
echo "================================================"

# Create docs/reports directory if it doesn't exist
if [ "$DRY_RUN" = false ] && [ ! -d "docs/reports" ]; then
  mkdir -p docs/reports
  echo -e "${GREEN}Created:${NC} docs/reports/"
fi

# Root reports to move
ROOT_REPORTS=(
  "TEST_FAILURES.md"
  "TEST_FIXES.md"
  "DB_MOCK_FIX_STATUS.md"
  "API_ERROR_HANDLING_AUDIT.md"
  "API_PERFORMANCE_QUICK_START.md"
  "API_PERFORMANCE_VERIFICATION.md"
  "AUDIT_ANALYTICS_HEALTHDASHBOARD.md"
  "BUNDLE_OPTIMIZATION.md"
  "CODE_DUPLICATION_REPORT_2026-03-19.md"
  "CODE_OPTIMIZATION_CHECKLIST.md"
  "CODE_OPTIMIZATION_ROUND2.md"
  "CODE_QUALITY_REVIEW_2026-03-19.md"
  "DATABASE_OPTIMIZATION.md"
  "DATABASE_OPTIMIZATION_QUICK_START.md"
  "DB_OPTIMIZATION_FILES.md"
  "ERRORBOUNDARY_FIX_GUIDE.md"
  "MOBILE_OPTIMIZATION_PLAN.md"
  "MOBILE_QUICK_START.md"
  "OPTIMIZATION_GUIDE.md"
  "OPTIMIZATION_IMPLEMENTATION_GUIDE.md"
  "OPTIMIZATION_REPORT_QUERY_BUILDER.md"
  "PERFORMANCE_OPTIMIZATION_IMPLEMENTATION_GUIDE.md"
  "QUICK_FIX_GUIDE.md"
  "RBAC_COMPLETE.md"
  "REALTIME-DASHBOARD-FIX.md"
  "SECURITY-QUICK-FIXES.md"
  "SECURITY_FIX.md"
  "SSE_IMPLEMENTATION.md"
  "WEBSOCKET_IMPLEMENTATION.md"
)

for file in "${ROOT_REPORTS[@]}"; do
  if [ -f "$file" ]; then
    if [ "$DRY_RUN" = true ]; then
      echo -e "${YELLOW}[DRY-RUN]${NC} Would move: $file -> docs/reports/$file"
    else
      echo -e "${GREEN}Moving:${NC} $file -> docs/reports/$file"
      mv "$file" "docs/reports/$file"
    fi
    ((DELETED_COUNT++))
  fi
done

echo ""
echo "================================================"
echo "Summary"
echo "================================================"

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}DRY-RUN MODE${NC} - No files were actually deleted/moved"
  echo ""
  echo "To execute the cleanup, edit this script and set:"
  echo "  DRY_RUN=false"
else
  echo -e "${GREEN}Active Mode${NC} - Cleanup completed"
  echo ""
  echo "Files processed: $DELETED_COUNT"
fi

echo ""
echo "================================================"
echo "Manual Cleanup Required"
echo "================================================"
echo "The following items require manual review:"
echo ""
echo "1. Optimized Agent Files (src/lib/agents/*-optimized*.ts)"
echo "   - Not currently used in production"
echo "   - Only used in tests"
echo "   - Decide: Keep if optimization needed, or archive to docs/archived/"
echo ""
echo "2. Duplicate Dockerfiles (Dockerfile.optimized, .production, .static)"
echo "   - Review which versions are actively used"
echo "   - Remove unused variants"
echo ""
echo "3. GitHub Workflows (.github/workflows/*.yml)"
echo "   - Currently untracked"
echo "   - Decide: Add to git or remove if not needed"
echo ""
echo "4. Deploy Scripts (deploy-scripts/cluster/)"
echo "   - Review if actively used for deployment"
echo "   - Archive if obsolete"
echo ""
echo "5. Old Reports in reports/ directory"
echo "   - Keep recent reports, archive pre-2026-03-15"
echo ""
echo "See CLEANUP_REPORT.md for detailed analysis."
echo ""

echo "================================================"
echo "Done"
echo "================================================"
