#!/bin/bash

# Archive cleanup script
# Move temporary reports and session documents to archive/

cd /root/.openclaw/workspace/7zi-project

# Create archive directories
mkdir -p archive/reports archive/audits archive/sessions

# Move report files
echo "Moving report files..."
mv *_REPORT.md archive/reports/ 2>/dev/null || true
mv *_SUMMARY.md archive/reports/ 2>/dev/null || true

# Move audit files
echo "Moving audit files..."
mv *_AUDIT*.md archive/audits/ 2>/dev/null || true

# Move session files
echo "Moving session files..."
mv *_SESSION*.md archive/sessions/ 2>/dev/null || true

# Move other temporary files
echo "Moving other temporary files..."
mv ANALYTICS_*.md archive/reports/ 2>/dev/null || true
mv TEST_*.md archive/reports/ 2>/dev/null || true
mv PERFORMANCE*.md archive/reports/ 2>/dev/null || true
mv BUNDLE_*.md archive/reports/ 2>/dev/null || true
mv CSS_*.md archive/reports/ 2>/dev/null || true
mv CODE_*.md archive/reports/ 2>/dev/null || true
mv API_*.md archive/reports/ 2>/dev/null || true
mv COMPONENT_*.md archive/reports/ 2>/dev/null || true
mv DEPENDENCY*.md archive/reports/ 2>/dev/null || true
mv SECURITY*.md archive/reports/ 2>/dev/null || true
mv OPTIMIZATION*.md archive/reports/ 2>/dev/null || true

echo "Archive cleanup complete!"
ls -la archive/reports/ | head -20
