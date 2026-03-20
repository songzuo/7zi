#!/bin/bash

# Console cleanup script - Replace console.error/warn with logger

cd /root/.openclaw/workspace/7zi-project

# Files to process (excluding test files, logger itself, and examples)
FILES=(
  "src/lib/realtime/examples.tsx"
  "src/lib/realtime/useEnhancedWebSocket.ts"
  "src/lib/realtime/notification-service.ts"
  "src/lib/realtime/notification-provider.tsx"
  "src/lib/export/index.ts"
  "src/lib/global-error-handlers.ts"
  "src/lib/agents/middleware.ts"
  "src/lib/monitoring/sentry-test.ts"
  "src/lib/monitoring/web-vitals.ts"
  "src/lib/monitoring/performance.monitor.ts"
  "src/lib/monitoring/use-performance.tsx"
  "src/lib/monitoring/performance.alerts.ts"
  "src/lib/monitoring/alerts.ts"
  "src/lib/api/github-helper.ts"
  "src/lib/utils.ts"
  "src/lib/performance-monitor.ts"
  "src/app/loading-demo/page.tsx"
  "src/stores/dashboardStore.ts"
  "src/contexts/SettingsContext.tsx"
  "src/hooks/useDashboardData.ts"
  "src/hooks/useLocalStorage.ts"
  "src/hooks/useNotifications.ts"
  "src/hooks/useBatchSelection.ts"
  "src/components/ContactForm.tsx"
  "src/components/PWAInstallPrompt.tsx"
  "src/components/PerformanceMonitor.tsx"
  "src/components/optimized/LazyImage.optimized.tsx"
  "src/components/monitoring/MetricsDashboard.tsx"
  "src/components/BackupList.tsx"
  "src/components/meeting/MeetingRoom.tsx"
  "src/components/ErrorBoundary.tsx"
  "src/components/ErrorBoundaryWrapper.tsx"
  "src/components/DataExportPanel.tsx"
)

echo "Starting console cleanup..."
echo "=========================================="

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "Skipping: $file (not found)"
    continue
  fi

  echo "Processing: $file"

  # Check if logger is already imported
  if ! grep -q "from.*['\"].*logger['\"]" "$file" && ! grep -q "from.*['\"]@/lib/logger['\"]" "$file"; then
    # Find the last import line and add logger import after it
    sed -i '/^import/a\
import { logger } from '"'"'@/lib/logger'"'"';
' "$file"
    echo "  ✓ Added logger import"
  fi

  # Replace console.error with logger.error
  # Pattern: console.error('Message:', error);
  # Becomes: logger.error('Message', error);
  sed -i "s/console\.error('\([^']*\):', error);/logger.error('\1', error);/g" "$file"
  sed -i "s/console\.error('\([^']*\):', err);/logger.error('\1', err);/g" "$file"
  sed -i "s/console\.error('\([^']*\):', event);/logger.error('\1', event);/g" "$file"
  sed -i "s/console\.error('\([^']*\):', e);/logger.error('\1', e);/g" "$file"

  # Replace console.warn with logger.warn
  sed -i "s/console\.warn('\([^']*\):', error);/logger.warn('\1', error);/g" "$file"
  sed -i "s/console\.warn('\([^']*\):', err);/logger.warn('\1', err);/g" "$file"

  # Handle multiline console.error
  sed -i '/console\.error(/,/);/ {
    s/console\.error/logger.error/g
  }' "$file"

  # Handle multiline console.warn
  sed -i '/console\.warn(/,/);/ {
    s/console\.warn/logger.warn/g
  }' "$file"

  # Special case: trimAudio and convertAudio warnings - keep but add logger
  # These are implementation warnings, so we'll keep them as-is but could be enhanced
done

echo "=========================================="
echo "Console cleanup complete!"
