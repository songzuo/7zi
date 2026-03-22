#!/bin/bash

# Fix incorrect function names in backup API routes

FILES=(
  "src/app/api/backup/schedule/[id]/route.ts"
  "src/app/api/backup/schedule/[id]/trigger/route.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Replace createNotFoundResponse with createNotFoundError
    sed -i 's/createNotFoundResponse/createNotFoundError/g' "$file"
    echo "Fixed: $file"
  fi
done

echo "Function name fixes completed!"
