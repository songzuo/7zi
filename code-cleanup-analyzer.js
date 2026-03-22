#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Target directories to analyze (excluding node_modules and botmem)
const TARGET_DIRS = [
  '/root/.openclaw/workspace/xunshi-inspector/scripts',
  '/root/.openclaw/workspace/xunshi-inspector/tests',
  '/root/.openclaw/workspace/VM-0-4-opencloudos/scripts',
  '/root/.openclaw/workspace/VM-0-4-opencloudos/skills',
  '/root/.openclaw/workspace/commander',
  '/root/.openclaw/workspace/bot-8.215.23.144/tools',
  '/root/.openclaw/workspace/bot6/projects',
  '/root/.openclaw/workspace/bot6/user-api',
  '/root/.openclaw/workspace/bot6/skills',
  '/root/.openclaw/workspace/bot6/e2e',
  '/root/.openclaw/workspace/bot2/tools',
  '/root/.openclaw/workspace/tests',
  '/root/.openclaw/workspace/tools'
];

const JS_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
const PY_EXTENSIONS = ['.py'];

const results = {
  unusedImports: [],
  unusedVariables: [],
  duplicateCode: [],
  deadCode: []
};

function getFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
}

function isJavaScript(filePath) {
  return JS_EXTENSIONS.includes(path.extname(filePath));
}

function isPython(filePath) {
  return PY_EXTENSIONS.includes(path.extname(filePath));
}

function analyzeJSFile(filePath, content) {
  const lines = content.split('\n');
  const importStatements = [];
  const usedIdentifiers = new Set();
  const unusedInFile = [];

  lines.forEach((line, index) => {
    // Find import/require statements
    const importMatch = line.match(/^(?:import|const|var|let)\s+.*?require\s*\(['"]([^'"]+)['"]\)/);
    if (importMatch) {
      const moduleName = importMatch[1].split('/').pop();
      const varMatch = line.match(/^(?:const|var|let)\s+(\w+)/);
      if (varMatch) {
        importStatements.push({ line: index + 1, name: varMatch[1], module: moduleName });
      }
    }

    const es6ImportMatch = line.match(/^import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/);
    if (es6ImportMatch) {
      const imports = es6ImportMatch[1].split(',').map(s => s.trim());
      imports.forEach(imp => {
        const name = imp.split(' as ').pop().trim();
        importStatements.push({ line: index + 1, name: name, module: es6ImportMatch[2] });
      });
    }

    const defaultImportMatch = line.match(/^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (defaultImportMatch) {
      importStatements.push({ line: index + 1, name: defaultImportMatch[1], module: defaultImportMatch[2] });
    }

    // Collect used identifiers (simple heuristic)
    const identifierMatches = line.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g);
    if (identifierMatches) {
      identifierMatches.forEach(id => usedIdentifiers.add(id));
    }

    // Check for commented out code blocks
    if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
      // Check if it looks like commented code (has function, const, var, etc.)
      if (/(function|const|var|let|class|if|for|while|import)\s/.test(line.substring(line.startsWith('//') ? 2 : 1).trim())) {
        results.deadCode.push({
          file: filePath,
          line: index + 1,
          reason: 'Commented code',
          snippet: line.trim()
        });
      }
    }
  });

  // Check for unused imports
  importStatements.forEach(imp => {
    if (!usedIdentifiers.has(imp.name) && imp.name !== 'default') {
      results.unusedImports.push({
        file: filePath,
        line: imp.line,
        import: imp.name,
        module: imp.module
      });
    }
  });
}

function analyzePythonFile(filePath, content) {
  const lines = content.split('\n');
  const importStatements = [];
  const usedIdentifiers = new Set();

  lines.forEach((line, index) => {
    // Find import statements
    const importMatch = line.match(/^import\s+(\w+)/);
    if (importMatch) {
      importStatements.push({ line: index + 1, name: importMatch[1], module: importMatch[1] });
    }

    const fromImportMatch = line.match(/^from\s+(\S+)\s+import\s+([^\n#]+)/);
    if (fromImportMatch) {
      const imports = fromImportMatch[2].split(',').map(s => s.trim().split(' as ')[0]);
      imports.forEach(imp => {
        importStatements.push({ line: index + 1, name: imp, module: fromImportMatch[1] });
      });
    }

    // Collect used identifiers
    const identifierMatches = line.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
    if (identifierMatches) {
      identifierMatches.forEach(id => usedIdentifiers.add(id));
    }

    // Check for commented out code blocks
    if (line.trim().startsWith('#')) {
      const uncommented = line.substring(1).trim();
      if (/(def|class|if|for|while|import|from)\s/.test(uncommented)) {
        results.deadCode.push({
          file: filePath,
          line: index + 1,
          reason: 'Commented code',
          snippet: line.trim()
        });
      }
    }
  });

  // Check for unused imports
  importStatements.forEach(imp => {
    if (!usedIdentifiers.has(imp.name)) {
      results.unusedImports.push({
        file: filePath,
        line: imp.line,
        import: imp.name,
        module: imp.module
      });
    }
  });
}

function findDuplicateCode() {
  const fileContents = [];

  TARGET_DIRS.forEach(dir => {
    if (!fs.existsSync(dir)) return;

    const walkDir = (currentDir) => {
      const files = fs.readdirSync(currentDir);
      files.forEach(file => {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (stat.isFile()) {
          const ext = path.extname(file);
          if (JS_EXTENSIONS.includes(ext) || PY_EXTENSIONS.includes(ext)) {
            const content = getFileContent(filePath);
            if (content) {
              fileContents.push({
                file: filePath,
                content: content
              });
            }
          }
        }
      });
    };

    walkDir(dir);
  });

  // Simple duplicate detection based on similar function patterns
  const patterns = {};
  fileContents.forEach(({ file, content }) => {
    const lines = content.split('\n');

    // Extract function/class definitions
    const funcPattern = /(?:function|const\s+\w+\s*=\s*(?:async\s*)?\(|def\s+(\w+)|class\s+(\w+))/g;
    let match;
    while ((match = funcPattern.exec(content)) !== null) {
      const funcName = match[1] || match[2] || 'anonymous';
      const startIdx = content.substring(0, match.index).split('\n').length;

      // Get function body (simplified)
      let braceCount = 0;
      let endIdx = startIdx;
      const startLine = lines[startIdx - 1];

      if (startLine.includes('function') || startLine.includes('def')) {
        const signature = startLine.trim();
        if (!patterns[signature]) {
          patterns[signature] = [];
        }
        patterns[signature].push({ file, line: startIdx });
      }
    }
  });

  // Find duplicates
  Object.entries(patterns).forEach(([signature, locations]) => {
    if (locations.length > 1 && locations.length < 10) { // Ignore very common patterns
      results.duplicateCode.push({
        pattern: signature.substring(0, 100) + '...',
        occurrences: locations.length,
        files: locations.map(l => `${l.file}:${l.line}`)
      });
    }
  });
}

function main() {
  console.log('Starting code cleanup analysis...\n');

  TARGET_DIRS.forEach(dir => {
    if (!fs.existsSync(dir)) return;

    const walkDir = (currentDir) => {
      const files = fs.readdirSync(currentDir);
      files.forEach(file => {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (stat.isFile()) {
          if (isJavaScript(filePath)) {
            const content = getFileContent(filePath);
            if (content) {
              analyzeJSFile(filePath, content);
            }
          } else if (isPython(filePath)) {
            const content = getFileContent(filePath);
            if (content) {
              analyzePythonFile(filePath, content);
            }
          }
        }
      });
    };

    walkDir(dir);
  });

  findDuplicateCode();

  console.log('=== CODE CLEANUP REPORT ===\n');
  console.log(`1. Unused Imports/Variables: ${results.unusedImports.length} found`);
  if (results.unusedImports.length > 0) {
    console.log('\nTop 20 unused imports:');
    results.unusedImports.slice(0, 20).forEach(item => {
      console.log(`  ${item.file}:${item.line} - ${item.import} from ${item.module}`);
    });
  }

  console.log(`\n2. Duplicate Code Patterns: ${results.duplicateCode.length} found`);
  if (results.duplicateCode.length > 0) {
    console.log('\nTop 10 duplicate patterns:');
    results.duplicateCode.slice(0, 10).forEach(item => {
      console.log(`  Pattern: ${item.pattern}`);
      console.log(`    Occurrences: ${item.occurrences}`);
      console.log(`    Files: ${item.files.slice(0, 3).join(', ')}${item.files.length > 3 ? '...' : ''}\n`);
    });
  }

  console.log(`\n3. Commented-out Dead Code: ${results.deadCode.length} found`);
  if (results.deadCode.length > 0) {
    console.log('\nTop 20 dead code instances:');
    results.deadCode.slice(0, 20).forEach(item => {
      console.log(`  ${item.file}:${item.line} - ${item.reason}`);
      console.log(`    ${item.snippet.substring(0, 80)}...\n`);
    });
  }

  // Save full results to JSON
  fs.writeFileSync('/root/.openclaw/workspace/code-cleanup-report.json', JSON.stringify(results, null, 2));
  console.log('\nFull report saved to: /root/.openclaw/workspace/code-cleanup-report.json');
}

main();