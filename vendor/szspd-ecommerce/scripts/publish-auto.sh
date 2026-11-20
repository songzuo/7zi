#!/bin/bash
set -e

PROJECT_DIR="/root/7zi-project/7zi-frontend"
cd "$PROJECT_DIR"

log() { echo "[$(date +'%H:%M:%S')] $*"; }

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  log "Not main branch: $BRANCH, skip"
  exit 0
fi

# Use standalone output mode (not static export) to support SSR
# The next.config.ts already has output: 'standalone'
log "Building with standalone output..."
log "Building..."
# Explicitly set NODE_ENV to production to avoid Next.js prerender issue
export NODE_ENV=production
pnpm build > /tmp/build.log 2>&1 || {
  log "Build failed"
  cat /tmp/build.log
  exit 1
}
log "Build success"

# Check version
CURRENT_VERSION=$(node -p "require('./package.json').version")
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo "")

if [ "$CURRENT_VERSION" = "$LAST_TAG" ]; then
  log "No version change"
  exit 0
fi

log "Version bump: $LAST_TAG → $CURRENT_VERSION"

# Upload to 7zi
log "Publishing to 7zi..."
cd /root/7zi-project
npx tsx scripts/publish.ts > /tmp/publish.log 2>&1 || {
  log "Publish failed"
  cat /tmp/publish.log
  exit 1
}
log "Publish success"

# Push
cd "$PROJECT_DIR"
git push origin main || git push github main
git push --tags 2>/dev/null || git push github --tags --force

log "Release done: v$CURRENT_VERSION"
