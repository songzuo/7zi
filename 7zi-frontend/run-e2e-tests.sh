#!/bin/bash

# E2E Test Runner Script
# 
# Usage:
#   ./run-e2e-tests.sh [options]
#
# Options:
#   --ui              Run with Playwright UI
#   --debug           Run with Playwright Inspector
#   --headed          Run with headed browser
#   --update-snapshots Update visual regression snapshots
#   --project NAME    Run specific project (chromium|firefox|webkit)
#   --grep PATTERN    Run tests matching pattern
#   --file FILE       Run specific test file
#   --ci              CI mode (no UI, full reports)

set -e

# Default values
MODE="run"
PROJECT=""
GREP=""
FILE=""
CI=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --ui)
      MODE="ui"
      shift
      ;;
    --debug)
      MODE="debug"
      shift
      ;;
    --headed)
      HEADED="--headed"
      shift
      ;;
    --update-snapshots)
      UPDATE="--update-snapshots"
      shift
      ;;
    --project)
      PROJECT="--project=$2"
      shift 2
      ;;
    --grep)
      GREP="--grep \"$2\""
      shift 2
      ;;
    --file)
      FILE="$2"
      shift 2
      ;;
    --ci)
      CI=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Change to 7zi-frontend directory
cd /root/.openclaw/workspace/7zi-frontend

# Ensure dependencies are installed
if [ ! -d "node_modules/@playwright" ]; then
  echo "Installing Playwright..."
  npm ci
  npx playwright install --with-deps
fi

# Ensure Next.js is built
if [ ! -d ".next" ]; then
  echo "Building Next.js..."
  npm run build
fi

# Run tests based on mode
case $MODE in
  ui)
    echo "🎭 Running Playwright UI..."
    npx playwright test --ui $HEADED $PROJECT "$GREP" "$FILE"
    ;;
  debug)
    echo "🔍 Running Playwright Debug..."
    npx playwright test --debug $HEADED $PROJECT "$GREP" "$FILE"
    ;;
  *)
    echo "🧪 Running E2E tests..."
    if [ "$CI" = true ]; then
      # CI mode: run all tests, generate reports
      npx playwright test $PROJECT "$GREP" "$FILE" $UPDATE --reporter=html,github
    else
      # Local mode: run with list reporter
      npx playwright test $PROJECT "$GREP" "$FILE" $HEADED $UPDATE
    fi
    ;;
esac

# Show report if not in CI
if [ "$CI" != true ]; then
  echo ""
  echo "📊 Opening test report..."
  npx playwright show-report
fi

echo ""
echo "✅ E2E tests completed!"
