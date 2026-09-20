#!/bin/bash

# Add timestamp property checks to all error response assertions in test files
# This ensures tests verify the standard error response format

FILES="src/app/api/auth/__tests__/auth.routes.test.ts"

for file in $FILES; do
  echo "Processing $file..."

  # Add timestamp check after error type assertions in auth routes test
  # Using sed to add the line after each error.type assertion

  sed -i '/expect(data.error.type).*/a\      expect(data.error).toHaveProperty("timestamp");' "$file"
done

echo "Done!"
