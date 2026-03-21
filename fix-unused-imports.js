#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = '/root/.openclaw/workspace/7zi-project';

// Common unused imports to fix
const COMMON_UNUSED_PATTERNS = [
  { pattern: /afterEach\s*$/, import: 'afterEach', from: 'vitest' },
  { pattern: /beforeEach\s*$/, import: 'beforeEach', from: 'vitest' },
  { pattern: /vi\s*$/, import: 'vi', from: 'vitest' },
  { pattern: /getDatabaseAsync\s*$/, import: 'getDatabaseAsync', from: '@/lib/db' },
  { pattern: /logger\s*$/, import: 'logger', from: '@/lib/logger' },
  { pattern: /isClient\s*$/, import: 'isClient', from: '@/lib/utils' },
];

function findFiles(dir, extensions = ['.ts', '.tsx']) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...findFiles(path.join(dir, entry.name), extensions));
      }
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(path.join(dir, entry.name));
    }
  }

  return files;
}

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const { pattern, import: importName } of COMMON_UNUSED_PATTERNS) {
      // Find import statements with this import
      const importRegex = new RegExp(`import\\s+\\{([^}]*)\\}\\s+from\\s+['"]vitest['"];?`, 'g');
      const vitestMatches = [...content.matchAll(importRegex)];

      for (const match of vitestMatches) {
        const imports = match[1].split(',').map(s => s.trim());
        const index = imports.indexOf(importName);
        if (index !== -1) {
          // Check if it's actually used in the file
          const usageRegex = new RegExp(`\\b${importName}\\b`, 'g');
          const usages = content.match(usageRegex) || [];

          // Count usages that are not in the import statement itself
          const afterImportContent = content.substring(match.index + match[0].length);
          const afterUsages = afterImportContent.match(usageRegex) || [];

          if (afterUsages.length === 0) {
            // Remove the import
            imports.splice(index, 1);

            if (imports.length === 0) {
              // No imports left, remove the entire line
              const lines = content.split('\n');
              const lineStart = content.substring(0, match.index).lastIndexOf('\n');
              const lineEnd = content.indexOf('\n', match.index);
              content = content.substring(0, lineStart + 1) + content.substring(lineEnd + 1);
            } else {
              // Update the import statement
              const newImports = imports.join(', ');
              content = content.replace(match[0], match[0].replace(match[1], newImports));
            }

            modified = true;
            console.log(`  Removed unused import '${importName}' from ${path.relative(PROJECT_DIR, filePath)}`);
          }
        }
      }
    }

    // Fix logger imports from '@/lib/logger'
    const loggerImportRegex = /import\s*\{\s*logger\s*\}\s*from\s+['"]@\/lib\/logger['"];?\s*\n/g;
    const loggerMatches = [...content.matchAll(loggerImportRegex)];

    for (const match of loggerMatches) {
      const afterImport = content.substring(match.index + match[0].length);
      if (!afterImport.includes('logger.')) {
        content = content.replace(match[0], '');
        modified = true;
        console.log(`  Removed unused import 'logger' from ${path.relative(PROJECT_DIR, filePath)}`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
    }

    return modified;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('Scanning for files to fix...\n');

  const testFiles = findFiles(path.join(PROJECT_DIR, 'src'), ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx']);
  const libFiles = findFiles(path.join(PROJECT_DIR, 'src/lib'), ['.ts', '.tsx']);
  const componentFiles = findFiles(path.join(PROJECT_DIR, 'src/components'), ['.ts', '.tsx']);

  const allFiles = [...new Set([...testFiles, ...libFiles, ...componentFiles])];
  console.log(`Found ${allFiles.length} files to process\n`);

  let fixedCount = 0;
  for (const file of allFiles) {
    if (fixImportsInFile(file)) {
      fixedCount++;
    }
  }

  console.log(`\n\nFixed ${fixedCount} files`);
}

main();
