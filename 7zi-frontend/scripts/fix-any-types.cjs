#!/usr/bin/env node
/**
 * Replaces `Record<string, any>` with `Record<string, unknown>` in carefully
 * selected, low-risk positions (optional metadata / context payload fields).
 *
 * Only touches files listed in the allowlist below, and only the exact
 * patterns:
 *   metadata?: Record<string, any>
 *   context?: Record<string, any>
 *   metadata: Record<string, any>
 *   context: Record<string, any>
 *
 * These are pure pass-through payload bags; `unknown` is strictly safer than
 * `any` and forces call sites to narrow before use.
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

// Files where the pattern was verified to be a pure pass-through payload.
const ALLOWLIST = [
  'src/lib/performance/anomaly-detection/types.ts',
  'src/lib/performance/offline-storage.ts',
  'src/lib/performance/alerting/types.ts',
  'src/lib/performance/alerting/alerter.ts',
  'src/lib/performance/root-cause-analysis/types.ts',
  'src/lib/performance/root-cause-analysis/api-tracker.ts',
  'src/lib/performance/root-cause-analysis/database-tracker.ts',
  'src/lib/search/search-history.ts',
  'src/lib/knowledge/types.ts',
  'src/lib/knowledge/smart-retriever.ts',
  'src/lib/knowledge/document-pipeline.ts',
  'src/lib/knowledge/vector-store.ts',
  'src/lib/monitoring/monitor.ts',
  'src/lib/monitoring/types.ts',
  'src/lib/monitoring/utils.ts',
  'src/lib/error-reporting/error-reporting.ts',
  'src/lib/alerting/channels/NotificationChannel.ts',
  'src/lib/search/suggestions.ts',
  'src/features/monitoring/lib/utils.ts',
  'src/features/monitoring/lib/monitor.ts',
];

const PATTERN = /(\bmetadata\??|\bcontext\??)\s*:\s*Record<string,\s*any>/g;

let changed = 0;
let total = 0;
for (const rel of ALLOWLIST) {
  const file = path.join(projectRoot, rel);
  if (!fs.existsSync(file)) {
    console.warn('SKIP (missing): ' + rel);
    continue;
  }
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(PATTERN, (m, key) => `${key}: Record<string, unknown>`);
  if (after !== before) {
    fs.writeFileSync(file, after);
    const n = (before.match(PATTERN) || []).length;
    total += n;
    changed++;
    console.log(`${rel}: ${n} replacement(s)`);
  }
}

console.log(`\n${total} replacements across ${changed} files.`);
