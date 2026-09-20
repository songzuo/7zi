#!/bin/bash

# Script to replace console statements with logger calls in non-test files

cd /root/.openclaw/workspace/7zi-project

# List of files to process
files=(
  "src/app/api/stream/analytics/route.ts"
  "src/app/api/stream/health/route.ts"
  "src/app/global-error.tsx"
  "src/components/BatchEditPanel.tsx"
  "src/components/ContactForm.tsx"
  "src/components/EnhancedContactForm.tsx"
  "src/components/ErrorBoundary.tsx"
  "src/components/ErrorBoundaryWrapper.tsx"
  "src/contexts/PermissionContext.tsx"
  "src/hooks/useBatchSelection.ts"
  "src/lib/a2a/jsonrpc-handler.ts"
  "src/lib/agents/middleware.ts"
  "src/lib/api/error-handler.ts"
  "src/lib/api/github-helper.ts"
  "src/lib/auth/middleware-rbac.ts"
  "src/lib/auth/middleware.ts"
  "src/lib/csrf.ts"
  "src/lib/export/index.ts"
  "src/lib/mcp/server.ts"
  "src/lib/middleware/api-performance.ts"
  "src/lib/monitoring/alerts.ts"
  "src/lib/monitoring/performance.monitor.ts"
  "src/lib/performance-monitor.ts"
  "src/lib/realtime/notification-provider.tsx"
  "src/lib/realtime/notification-service.ts"
  "src/lib/realtime/useEnhancedWebSocket.ts"
  "src/test/test-env.ts"
)

for file in "${files[@]}"; do
  echo "Processing $file..."
done

echo "Total files: ${#files[@]}"
