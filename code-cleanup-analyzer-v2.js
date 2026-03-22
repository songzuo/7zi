#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Only target actual project code, excluding node_modules and botmem
const TARGET_DIRS = [
  '/root/.openclaw/workspace/xunshi-inspector/scripts',
  '/root/.openclaw/workspace/xunshi-inspector/tests',
  '/root/.openclaw/workspace/VM-0-4-opencloudos/scripts',
  '/root/.openclaw/workspace/VM-0-4-opencloudos/skills/serper/scripts',
  '/root/.openclaw/workspace/VM-0-4-opencloudos/skills/searxng/scripts',
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
  summary: {
    totalFiles: 0,
    jsFiles: 0,
    pyFiles: 0,
    unusedImports: 0,
    duplicateCode: 0,
    deadCode: 0
  },
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
  const declaredVars = new Set();

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Find import/require statements
    const requireMatch = line.match(/^(?:const|var|let)\s+(\w+)\s*=\s*require\s*\(['"]([^'"]+)['"]\)/);
    if (requireMatch) {
      const moduleName = requireMatch[2].split('/').pop();
      importStatements.push({ line: index + 1, name: requireMatch[1], module: moduleName, type: 'require' });
      declaredVars.add(requireMatch[1]);
    }

    const es6ImportMatch = line.match(/^import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/);
    if (es6ImportMatch) {
      const imports = es6ImportMatch[1].split(',').map(s => s.trim());
      imports.forEach(imp => {
        const name = imp.split(' as ').pop().trim();
        importStatements.push({ line: index + 1, name: name, module: es6ImportMatch[2], type: 'es6-named' });
        declaredVars.add(name);
      });
    }

    const defaultImportMatch = line.match(/^import\s+(\w+)\s*,?\s*{?([^}]*)}?\s*from\s+['"]([^'"]+)['"]/);
    if (defaultImportMatch) {
      importStatements.push({ line: index + 1, name: defaultImportMatch[1], module: defaultImportMatch[3], type: 'es6-default' });
      declaredVars.add(defaultImportMatch[1]);
    }

    const simpleDefaultImport = line.match(/^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (simpleDefaultImport) {
      importStatements.push({ line: index + 1, name: simpleDefaultImport[1], module: simpleDefaultImport[2], type: 'es6-default' });
      declaredVars.add(simpleDefaultImport[1]);
    }

    // Collect variable declarations
    const varDeclMatch = line.match(/^(?:const|var|let)\s+(\w+)\s*=/);
    if (varDeclMatch && !line.includes('require')) {
      declaredVars.add(varDeclMatch[1]);
    }

    // Collect used identifiers (excluding common keywords)
    const identifierMatches = line.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g);
    if (identifierMatches) {
      const keywords = new Set(['if', 'else', 'for', 'while', 'function', 'return', 'const', 'var', 'let', 'class', 'import', 'from', 'export', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'typeof', 'instanceof']);
      identifierMatches.forEach(id => {
        if (!keywords.has(id)) {
          usedIdentifiers.add(id);
        }
      });
    }

    // Check for commented out code
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      const uncommented = trimmed.substring(trimmed.startsWith('//') ? 2 : 1).trim();
      if (/(function|const|var|let|class|if|for|while|import)\s/.test(uncommented) && uncommented.length > 5) {
        results.deadCode.push({
          file: filePath,
          line: index + 1,
          reason: 'Commented code',
          snippet: trimmed.substring(0, 100)
        });
      }
    }

    // Multi-line comment blocks
    if (trimmed.startsWith('/*')) {
      results.deadCode.push({
        file: filePath,
        line: index + 1,
        reason: 'Multi-line comment start',
        snippet: trimmed.substring(0, 100)
      });
    }
  });

  // Check for unused imports and variables
  declaredVars.forEach(varName => {
    if (!usedIdentifiers.has(varName) && varName.length > 1) {
      const importInfo = importStatements.find(imp => imp.name === varName);
      if (importInfo) {
        results.unusedImports.push({
          file: filePath,
          line: importInfo.line,
          import: varName,
          module: importInfo.module
        });
      } else {
        results.unusedVariables.push({
          file: filePath,
          variable: varName,
          note: 'Declared but not used in file'
        });
      }
    }
  });
}

function analyzePythonFile(filePath, content) {
  const lines = content.split('\n');
  const importStatements = [];
  const usedIdentifiers = new Set();
  const declaredVars = new Set();

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Find import statements
    const importMatch = line.match(/^import\s+(\w+)(?:\s+as\s+(\w+))?/);
    if (importMatch) {
      const name = importMatch[2] || importMatch[1];
      importStatements.push({ line: index + 1, name: name, module: importMatch[1] });
      declaredVars.add(name);
    }

    const fromImportMatch = line.match(/^from\s+(\S+)\s+import\s+([^\n#]+)/);
    if (fromImportMatch) {
      const imports = fromImportMatch[2].split(',').map(s => s.trim().split(' as ')[0]);
      imports.forEach(imp => {
        if (imp !== '*') {
          importStatements.push({ line: index + 1, name: imp, module: fromImportMatch[1] });
          declaredVars.add(imp);
        }
      });
    }

    // Collect function/class definitions
    const defMatch = line.match(/^def\s+(\w+)\s*\(/);
    if (defMatch) {
      declaredVars.add(defMatch[1]);
    }

    const classMatch = line.match(/^class\s+(\w+)/);
    if (classMatch) {
      declaredVars.add(classMatch[1]);
    }

    // Collect used identifiers
    const identifierMatches = line.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
    if (identifierMatches) {
      const keywords = new Set(['if', 'else', 'elif', 'for', 'while', 'def', 'class', 'return', 'import', 'from', 'as', 'pass', 'break', 'continue', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'yield', 'global', 'nonlocal', 'assert', 'async', 'await']);
      identifierMatches.forEach(id => {
        if (!keywords.has(id)) {
          usedIdentifiers.add(id);
        }
      });
    }

    // Check for commented out code
    if (trimmed.startsWith('#')) {
      const uncommented = trimmed.substring(1).trim();
      if (/(def|class|if|for|while|import|from)\s/.test(uncommented) && uncommented.length > 5) {
        results.deadCode.push({
          file: filePath,
          line: index + 1,
          reason: 'Commented code',
          snippet: trimmed.substring(0, 100)
        });
      }
    }
  });

  // Check for unused imports
  declaredVars.forEach(varName => {
    if (!usedIdentifiers.has(varName) && varName.length > 1) {
      const importInfo = importStatements.find(imp => imp.name === varName);
      if (importInfo) {
        results.unusedImports.push({
          file: filePath,
          line: importInfo.line,
          import: varName,
          module: importInfo.module
        });
      }
    }
  });
}

function findDuplicateCode(fileList) {
  const patterns = {};

  fileList.forEach(({ file, content }) => {
    const lines = content.split('\n');

    // Extract function definitions
    lines.forEach((line, index) => {
      const jsFuncMatch = line.match(/^(?:async\s+)?function\s+(\w+)\s*\(/);
      const jsArrowMatch = line.match(/^const\s+(\w+)\s*=\s*(?:async\s+)?\(?\)?\s*=>/);
      const pyFuncMatch = line.match(/^def\s+(\w+)\s*\(/);

      let funcName = null;
      let signature = null;

      if (jsFuncMatch) {
        funcName = jsFuncMatch[1];
        signature = line.trim();
      } else if (jsArrowMatch) {
        funcName = jsArrowMatch[1];
        signature = line.trim();
      } else if (pyFuncMatch) {
        funcName = pyFuncMatch[1];
        signature = line.trim();
      }

      if (funcName && signature && signature.length < 200) {
        if (!patterns[signature]) {
          patterns[signature] = [];
        }
        patterns[signature].push({ file, line: index + 1, funcName });
      }
    });
  });

  // Find duplicates
  Object.entries(patterns).forEach(([signature, locations]) => {
    if (locations.length > 1 && locations.length < 50) {
      results.duplicateCode.push({
        pattern: signature.substring(0, 120),
        occurrences: locations.length,
        funcName: locations[0].funcName,
        files: locations.map(l => `${l.file}:${l.line}`)
      });
    }
  });
}

function main() {
  console.log('Starting code cleanup analysis...\n');
  console.log('Scanning project code (excluding node_modules and botmem)...\n');

  const allFiles = [];

  TARGET_DIRS.forEach(dir => {
    if (!fs.existsSync(dir)) return;

    const walkDir = (currentDir) => {
      try {
        const files = fs.readdirSync(currentDir);
        files.forEach(file => {
          const filePath = path.join(currentDir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            // Skip node_modules and botmem directories
            if (file === 'node_modules' || file === 'botmem' || file === '.git') {
              return;
            }
            walkDir(filePath);
          } else if (stat.isFile()) {
            if (isJavaScript(filePath)) {
              const content = getFileContent(filePath);
              if (content) {
                analyzeJSFile(filePath, content);
                results.summary.jsFiles++;
                allFiles.push({ file: filePath, content });
              }
            } else if (isPython(filePath)) {
              const content = getFileContent(filePath);
              if (content) {
                analyzePythonFile(filePath, content);
                results.summary.pyFiles++;
                allFiles.push({ file: filePath, content });
              }
            }
          }
        });
      } catch (e) {
        // Skip directories we can't read
      }
    };

    walkDir(dir);
  });

  results.summary.totalFiles = results.summary.jsFiles + results.summary.pyFiles;
  results.summary.unusedImports = results.unusedImports.length;
  results.summary.unusedVariables = results.unusedVariables.length;
  results.summary.deadCode = results.deadCode.length;

  findDuplicateCode(allFiles);
  results.summary.duplicateCode = results.duplicateCode.length;

  console.log('=== CODE CLEANUP REPORT ===\n');
  console.log('Summary:');
  console.log(`  Total files scanned: ${results.summary.totalFiles}`);
  console.log(`  JavaScript/TypeScript files: ${results.summary.jsFiles}`);
  console.log(`  Python files: ${results.summary.pyFiles}`);
  console.log('');

  console.log('1. Unused Imports/Variables');
  console.log(`   Total found: ${results.summary.unusedImports}`);
  if (results.unusedImports.length > 0) {
    console.log('\n   Top 30 issues:');
    results.unusedImports.slice(0, 30).forEach(item => {
      const shortFile = item.file.replace('/root/.openclaw/workspace/', '');
      console.log(`     ${shortFile}:${item.line} - ${item.import} from ${item.module}`);
    });
    if (results.unusedImports.length > 30) {
      console.log(`     ... and ${results.unusedImports.length - 30} more`);
    }
  }

  console.log(`\n2. Duplicate Code Patterns`);
  console.log(`   Total found: ${results.summary.duplicateCode}`);
  if (results.duplicateCode.length > 0) {
    console.log('\n   Top 20 duplicate patterns:');
    results.duplicateCode.slice(0, 20).forEach(item => {
      const shortFile1 = item.files[0].replace('/root/.openclaw/workspace/', '');
      const shortFile2 = item.files[1].replace('/root/.openclaw/workspace/', '');
      console.log(`     Pattern: ${item.pattern}`);
      console.log(`       Occurrences: ${item.occurrences}`);
      console.log(`       Example: ${shortFile1} and ${shortFile2}\n`);
    });
    if (results.duplicateCode.length > 20) {
      console.log(`     ... and ${results.duplicateCode.length - 20} more`);
    }
  }

  console.log(`\n3. Commented-out Dead Code`);
  console.log(`   Total found: ${results.summary.deadCode}`);
  if (results.deadCode.length > 0) {
    console.log('\n   Top 30 instances:');
    results.deadCode.slice(0, 30).forEach(item => {
      const shortFile = item.file.replace('/root/.openclaw/workspace/', '');
      console.log(`     ${shortFile}:${item.line} - ${item.reason}`);
      console.log(`       ${item.snippet}`);
    });
    if (results.deadCode.length > 30) {
      console.log(`     ... and ${results.deadCode.length - 30} more`);
    }
  }

  // Save full results to JSON
  const reportPath = '/root/.openclaw/workspace/code-cleanup-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nFull report saved to: ${reportPath}`);
}

main();