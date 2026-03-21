#!/bin/bash

# Fix import errors in backup API routes

FILES=(
  "src/app/api/backup/import/route.ts"
  "src/app/api/backup/restore/route.ts"
  "src/app/api/backup/schedule/route.ts"
  "src/app/api/backup/jobs/route.ts"
  "src/app/api/backup/statistics/route.ts"
  "src/app/api/backup/schedule/[id]/route.ts"
  "src/app/api/backup/schedule/[id]/trigger/route.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Replace the incorrect import with correct one
    sed -i "s|from '@/lib/api/utils'|from '@/lib/api/error-handler'|g" "$file"

    # Move createSuccessResponse back to utils if it was moved
    sed -i "s|import { createSuccessResponse, \([^}]*\) } from '@/lib/api/error-handler'|import { createSuccessResponse } from '@/lib/api/utils';\nimport { \1 } from '@/lib/api/error-handler'|g" "$file"

    echo "Fixed: $file"
  fi
done

echo "Import fixes completed!"
