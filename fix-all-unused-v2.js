#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = '/root/.openclaw/workspace/7zi-project';

function getLintOutput() {
  try {
    const output = execSync('npx eslint src --format=unix', {
      cwd: PROJECT_DIR,
      encoding: 'utf8',
      timeout: 120000
    });
    return output;
  } catch (error) {
    return error.stdout || '';
  }
}

function parseWarnings(output) {
  const lines = output.split('\n');
  const warnings = [];

  for (const line of lines) {
    if (!line.includes('no-unused-vars')) continue;

    // Parse unix format: /path/to/file.ts:line:col: error message @rule
    const match = line.match(/^([^:]+):(\d+):(\d+):\s+['"]([^'"]+)['"]\s+is\s+(defined\s+but\s+never\s+used|assigned\s+a\s+value\s+but\s+never\s+used)/);
    if (!match) {
      const match2 = line.match(/^([^:]+):(\d+):(\d+):\s+.*['"]([^'"]+)['"]\s+is\s+(defined\s+but\s+never\s+used|assigned\s+a\s+value\s+but\s+never\s+used)/);
      if (match2) {
        warnings.push({
          filePath: path.resolve(PROJECT_DIR, match2[1]),
          lineNum: parseInt(match2[2]),
          colNum: parseInt(match2[3]),
          varName: match2[4],
          type: match2[5]
        });
      }
    } else {
      warnings.push({
        filePath: path.resolve(PROJECT_DIR, match[1]),
        lineNum: parseInt(match[2]),
        colNum: parseInt(match[3]),
        varName: match[4],
        type: match[5]
      });
    }
  }

  return warnings;
}

function groupWarningsByFile(warnings) {
  const grouped = {};
  for (const warning of warnings) {
    if (!grouped[warning.filePath]) {
      grouped[warning.filePath] = [];
    }
    grouped[warning.filePath].push(warning);
  }
  return grouped;
}

function removeUnusedImport(content, lineNum, varName) {
  const lines = content.split('\n');
  const line = lines[lineNum - 1];

  // Check if it's an import statement
  const importMatch = line.match(/^import\s+\{([^}]*)\}\s+from\s+['"][^'"]+['"]/);
  if (importMatch) {
    const imports = importMatch[1].split(',').map(s => s.trim());
    const index = imports.indexOf(varName);

    if (index !== -1) {
      imports.splice(index, 1);

      if (imports.length === 0) {
        // Remove entire import line
        lines.splice(lineNum - 1, 1);
        // Remove empty line after if exists
        if (lines[lineNum - 1] && lines[lineNum - 1].trim() === '') {
          lines.splice(lineNum - 1, 1);
        }
      } else {
        // Update import
        const newImport = `import { ${imports.join(', ')} } ${line.substring(importMatch[0].length - importMatch[2].length)}`;
        lines[lineNum - 1] = newImport;
      }

      return lines.join('\n');
    }
  }

  return null;
}

function fixUnusedVariable(content, lineNum, varName) {
  const lines = content.split('\n');
  const line = lines[lineNum - 1];

  // Check if it's a variable declaration
  const varMatch = line.match(/^\s*(const|let|var)\s+(\w+)\s*[:=]/);
  if (varMatch && varMatch[2] === varName) {
    // Prefix with underscore
    lines[lineNum - 1] = line.replace(
      new RegExp(`\\b${varName}\\b`),
      `_${varName}`
    );
    return lines.join('\n');
  }

  return null;
}

function fixFile(filePath, fileWarnings) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Sort warnings by line number in descending order to avoid line number shifts
    const sorted = [...fileWarnings].sort((a, b) => b.lineNum - a.lineNum);

    for (const warning of sorted) {
      // First try to remove as import
      const result = removeUnusedImport(content, warning.lineNum, warning.varName);

      if (result !== null) {
        content = result;
        modified = true;
        console.log(`  ✓ Removed unused import '${warning.varName}' from ${path.relative(PROJECT_DIR, filePath)}:${warning.lineNum}`);
        continue;
      }

      // Then try to fix as variable declaration
      const varResult = fixUnusedVariable(content, warning.lineNum, warning.varName);

      if (varResult !== null) {
        content = varResult;
        modified = true;
        console.log(`  ✓ Renamed unused variable '${warning.varName}' to '_${warning.varName}' in ${path.relative(PROJECT_DIR, filePath)}:${warning.lineNum}`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
    }

    return modified;
  } catch (error) {
    console.error(`  ✗ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔍 Analyzing unused variable warnings...\n');

  const output = getLintOutput();
  const warnings = parseWarnings(output);
  console.log(`Found ${warnings.length} unused variable warnings\n`);

  const grouped = groupWarningsByFile(warnings);
  console.log(`Files with warnings: ${Object.keys(grouped).length}\n`);

  let fixedCount = 0;
  let totalFixed = 0;

  for (const [filePath, fileWarnings] of Object.entries(grouped)) {
    console.log(`Processing: ${path.relative(PROJECT_DIR, filePath)} (${fileWarnings.length} issues)`);
    if (fixFile(filePath, fileWarnings)) {
      fixedCount++;
      totalFixed += fileWarnings.length;
    }
    console.log();
  }

  console.log(`\n✅ Summary:`);
  console.log(`  Fixed files: ${fixedCount}`);
  console.log(`  Total warnings fixed: ${totalFixed}`);
}

main();
