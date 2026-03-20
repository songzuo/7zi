#!/bin/bash

echo "=== MODULE TEST COVERAGE ANALYSIS ==="
echo ""
echo "Format: Module | Source Files | Tested Files | Uncovered | Coverage"
echo "--------------------------------------------------------------------"

analyze_module() {
  local module_dir=$1
  local source_files=$(find "$module_dir" -maxdepth 1 -type f \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.test.*" ! -name "*.spec.*" 2>/dev/null)
  local source_count=$(echo "$source_files" | grep -c "^" || echo 0)
  
  if [ "$source_count" -eq 0 ]; then
    return
  fi
  
  local tested_count=0
  while IFS= read -r file; do
    if [ -f "$file" ]; then
      local base_name=$(basename "$file")
      local dir_name=$(dirname "$file")
      local test_file=$(find "$dir_name" -maxdepth 2 -name "${base_name%.*}.test.*" -o -name "${base_name%.*}.spec.*" 2>/dev/null | head -1)
      if [ -n "$test_file" ]; then
        tested_count=$((tested_count + 1))
      fi
    fi
  done <<< "$source_files"
  
  local uncovered=$((source_count - tested_count))
  local coverage=0
  if [ "$source_count" -gt 0 ]; then
    coverage=$((tested_count * 100 / source_count))
  fi
  
  local short_dir=$(echo "$module_dir" | sed 's|src/||')
  printf "%-40s %-14d %-13d %-9d %d%%\n" "$short_dir" "$source_count" "$tested_count" "$uncovered" "$coverage"
}

# Analyze main modules
for dir in $(find src -type d -mindepth 1 ! -name "__tests__" ! -name "test" | sort); do
  analyze_module "$dir"
done | sort -k5 -rn

echo ""
echo "=== SUMMARY ==="
echo "Total source files: $(find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.test.*" ! -name "*.spec.*" ! -path "*/test/*" | wc -l)"
echo "Total test files: $(find src -type f \( -name "*.test.*" -o -name "*.spec.*" \) ! -path "*/test/*" | wc -l)"
echo "Test directories: $(find src -type d -name "__tests__" | wc -l)"
echo ""
