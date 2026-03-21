#!/usr/bin/env node

/**
 * Code Cleanup Script - Removes dead code and unused imports based on unused-code-analysis-report.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = __dirname;
const REPORT_FILE = path.join(PROJECT_ROOT, 'unused-code-analysis-report.json');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    log(`Error reading file: ${filePath}`, colors.red);
    return null;
  }
}

function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    log(`Error writing file: ${filePath}`, colors.red);
    return false;
  }
}

// Remove unused imports from a file
function removeUnusedImports(filePath, unusedImports) {
  const content = readFile(filePath);
  if (!content) return { success: false, message: 'Could not read file' };

  let modifiedContent = content;
  let changes = 0;

  // Process each unused import
  for (const unused of unusedImports) {
    if (unused.named && unused.named.length > 0) {
      for (const name of unused.named) {
        // Remove from named imports: import { A, B, C } from 'module' -> import { A, C } from 'module'
        const namedRegex = new RegExp(
          `import\\s*\\{([^}]*)\\}\\s*from\\s*['"](${unused.source})['"]`,
          'g'
        );

        modifiedContent = modifiedContent.replace(namedRegex, (match, imports) => {
          const importList = imports.split(',').map(i => i.trim());
          const newImports = importList.filter(i => i !== name && i !== `${name} as ${name}`);

          if (newImports.length === 0) {
            // Remove entire import line
            changes++;
            return '';
          } else if (newImports.length !== importList.length) {
            changes++;
            return `import { ${newImports.join(', ')} } from '${unused.source}'`;
          }
          return match;
        });
      }
    }

    if (unused.default && unused.default.length > 0) {
      for (const defaultImport of unused.default) {
        // Remove default import: import DefaultName from 'module'
        const defaultRegex = new RegExp(
          `import\\s+${defaultImport.varName}\\s+from\\s*['"]${unused.source}['"];?\\s*\\n`,
          'g'
        );
        const replacement = modifiedContent.replace(defaultRegex, '');
        if (replacement !== modifiedContent) {
          modifiedContent = replacement;
          changes++;
        }
      }
    }
  }

  if (changes > 0) {
    // Clean up empty import blocks
    modifiedContent = modifiedContent.replace(/import\s*\{\s*\}\s*from\s*['"][^'"]+['"];?\s*\n/g, '');
    // Remove duplicate newlines
    modifiedContent = modifiedContent.replace(/\n\n\n+/g, '\n\n');

    if (writeFile(filePath, modifiedContent)) {
      return { success: true, changes, message: `Removed ${changes} unused imports` };
    }
  }

  return { success: false, changes: 0, message: 'No changes made' };
}

// Remove unused exports (dead code functions/exports)
function removeUnusedExports(filePath, unusedExports) {
  const content = readFile(filePath);
  if (!content) return { success: false, message: 'Could not read file' };

  let modifiedContent = content;
  let changes = 0;

  if (!unusedExports.named || unusedExports.named.length === 0) {
    return { success: false, changes: 0, message: 'No unused exports to remove' };
  }

  for (const exportName of unusedExports.named) {
    // Remove named export: export function name() {}
    const functionRegex = new RegExp(
      `export\\s+(?:async\\s+)?function\\s+${exportName}\\s*\\([^)]*\\)\\s*\\{[^}]*\\}`,
      'g'
    );
    modifiedContent = modifiedContent.replace(functionRegex, (match) => {
      if (match.includes('export')) {
        changes++;
        return '';
      }
      return match;
    });

    // Remove exported variables: export const name = ...
    const constRegex = new RegExp(
      `export\\s+(?:const|let|var)\\s+${exportName}\\s*=[^;]+;\\s*\\n`,
      'g'
    );
    modifiedContent = modifiedContent.replace(constRegex, (match) => {
      if (match.includes('export')) {
        changes++;
        return '';
      }
      return match;
    });

    // Remove exported classes: export class Name {}
    const classRegex = new RegExp(
      `export\\s+class\\s+${exportName}\\s*\\{[^}]*\\}`,
      'g'
    );
    modifiedContent = modifiedContent.replace(classRegex, (match) => {
      if (match.includes('export')) {
        changes++;
        return '';
      }
      return match;
    });
  }

  if (changes > 0) {
    if (writeFile(filePath, modifiedContent)) {
      return { success: true, changes, message: `Removed ${changes} unused exports` };
    }
  }

  return { success: false, changes: 0, message: 'No changes made' };
}

// Main cleanup function
function runCleanup() {
  log('\n🧹 Starting code cleanup...\n', colors.cyan);

  // Load the report
  if (!fs.existsSync(REPORT_FILE)) {
    log(`Error: Report file not found: ${REPORT_FILE}`, colors.red);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));

  let totalFilesCleaned = 0;
  let totalImportsRemoved = 0;
  let totalExportsRemoved = 0;

  // Process unused imports
  log('📦 Processing unused imports...', colors.yellow);

  for (const item of report.unusedImports) {
    const filePath = path.join(PROJECT_ROOT, item.file);
    if (!fs.existsSync(filePath)) continue;

    const result = removeUnusedImports(filePath, [item]);
    if (result.success) {
      totalFilesCleaned++;
      totalImportsRemoved += result.changes;
      log(`  ✓ ${item.file}: ${result.message}`, colors.green);
    }
  }

  // Process unused exports (dead code)
  log('\n💀 Processing dead code (unused exports)...', colors.yellow);

  for (const item of report.unusedExports) {
    const filePath = path.join(PROJECT_ROOT, item.file);
    if (!fs.existsSync(filePath)) continue;

    // Skip API routes - they need their exports
    if (item.file.includes('/api/')) continue;

    // Skip components that might be dynamically imported
    if (item.file.includes('/components/LazyComponents.tsx')) continue;

    const result = removeUnusedExports(filePath, item);
    if (result.success) {
      totalFilesCleaned++;
      totalExportsRemoved += result.changes;
      log(`  ✓ ${item.file}: ${result.message}`, colors.green);
    }
  }

  // Summary
  log('\n' + '='.repeat(60), colors.cyan);
  log('📊 Cleanup Summary:', colors.cyan);
  log(`  Files cleaned: ${totalFilesCleaned}`, colors.green);
  log(`  Imports removed: ${totalImportsRemoved}`, colors.green);
  log(`  Exports removed: ${totalExportsRemoved}`, colors.green);
  log('='.repeat(60) + '\n', colors.cyan);

  log('✨ Cleanup complete! Running build to verify...', colors.cyan);

  try {
    execSync('pnpm build', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    log('\n✅ Build successful! Code cleanup is verified.', colors.green);
  } catch (error) {
    log('\n❌ Build failed! Some changes may need to be reverted.', colors.red);
    log('Check the build output for errors.', colors.yellow);
    process.exit(1);
  }
}

// Run the cleanup
runCleanup();
