#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = '/root/.openclaw/workspace/7zi-project';

// Files to fix with specific replacements
const FILE_FIXES = [
  {
    file: 'src/lib/data-import-export.ts',
    replacements: [
      { search: /\bexportData\b/g, replace: '_exportData' },
      { search: /\bimportData\b/g, replace: '_importData' }
    ]
  },
  {
    file: 'src/app/api/database/optimize/route.ts',
    replacements: [
      { search: /import\s*\{\s*NextResponse\s*\}\s*from\s*['"]next\/server['"];?\s*\n/g, replace: '' }
    ]
  }
];

function fixFile(fix) {
  try {
    const filePath = path.join(PROJECT_DIR, fix.file);
    if (!fs.existsSync(filePath)) {
      console.log(`  ✗ File not found: ${fix.file}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const replacement of fix.replacements) {
      const newContent = content.replace(replacement.search, replacement.replace);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✓ Fixed: ${fix.file}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`  ✗ Error fixing ${fix.file}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Applying specific fixes...\n');

  let fixedCount = 0;
  for (const fix of FILE_FIXES) {
    if (fixFile(fix)) {
      fixedCount++;
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} files`);
}

main();
