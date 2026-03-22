#!/usr/bin/env tsx

/**
 * Script to analyze exports from src/lib modules and check for unused imports
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { execSync } from 'child_process';

const LIB_DIR = '/root/.openclaw/workspace/7zi-project/src/lib';
const PROJECT_ROOT = '/root/.openclaw/workspace/7zi-project';

interface ExportInfo {
  filePath: string;
  exports: string[];
  hasNamedExport: boolean;
  hasDefaultExport: boolean;
}

interface ImportInfo {
  filePath: string;
  imports: { from: string; names: string[] }[];
}

// Regex patterns
const EXPORT_PATTERN = /export\s+(?:const|function|class|type|interface|enum)\s+(\w+)/g;
const NAMED_EXPORT_PATTERN = /export\s+\{\s*([^}]+)\s*\}/g;
const DEFAULT_EXPORT_PATTERN = /export\s+default/g;
const IMPORT_PATTERN = /import\s+(?:(?:\{([^}]+)\})|(\*?\s*\w+))\s+from\s+['"]([^'"]+)['"]/g;

function getAllFiles(dir: string, ext: string = '.ts'): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('__') && entry.name !== 'node_modules') {
      files.push(...getAllFiles(fullPath, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      files.push(fullPath);
    }
  }
  return files;
}

function analyzeExports(filePath: string): ExportInfo {
  const content = readFileSync(filePath, 'utf-8');
  const exports = new Set<string>();

  // Match export const/function/class/type/interface/enum
  let match;
  while ((match = EXPORT_PATTERN.exec(content)) !== null) {
    exports.add(match[1]);
  }

  // Match export { ... }
  while ((match = NAMED_EXPORT_PATTERN.exec(content)) !== null) {
    const exportedNames = match[1].split(',').map(n => n.trim().split(' as ')[0]);
    exportedNames.forEach(n => {
      if (n) exports.add(n);
    });
  }

  return {
    filePath,
    exports: Array.from(exports),
    hasNamedExport: exports.size > 0,
    hasDefaultExport: DEFAULT_EXPORT_PATTERN.test(content)
  };
}

function analyzeImports(filePath: string): ImportInfo {
  const content = readFileSync(filePath, 'utf-8');
  const imports: { from: string; names: string[] }[] = [];

  let match;
  while ((match = IMPORT_PATTERN.exec(content)) !== null) {
    const namedImports = match[1];
    const defaultImport = match[2];
    const from = match[3];

    const names: string[] = [];
    if (namedImports) {
      namedImports.split(',').forEach(n => {
        const name = n.trim().split(' as ')[0];
        if (name && name !== 'type') {
          names.push(name);
        }
      });
    }
    if (defaultImport) {
      names.push(defaultImport.trim());
    }

    if (names.length > 0) {
      imports.push({ from, names });
    }
  }

  return { filePath, imports };
}

function resolveImportPath(importPath: string, sourceFile: string): string | null {
  if (importPath.startsWith('.') || importPath.startsWith('@/lib')) {
    // Relative or alias import
    let resolvedPath: string;

    if (importPath.startsWith('@/lib')) {
      // Handle @/lib alias
      resolvedPath = join(PROJECT_ROOT, 'src', importPath.replace('@/lib', 'lib'));
      if (!resolvedPath.endsWith('.ts')) {
        resolvedPath += '.ts';
      }
    } else {
      // Relative import
      const sourceDir = dirname(sourceFile);
      resolvedPath = join(sourceDir, importPath);
      if (!resolvedPath.endsWith('.ts')) {
        resolvedPath += '.ts';
      }
    }

    if (existsSync(resolvedPath)) {
      return resolvedPath;
    }

    // Try directory index
    if (existsSync(join(resolvedPath, 'index.ts'))) {
      return join(resolvedPath, 'index.ts');
    }
  }

  return null;
}

function main() {
  console.log('🔍 Analyzing src/lib exports...\n');

  // Get all lib files (excluding tests)
  const libFiles = getAllFiles(LIB_DIR).filter(f => !f.endsWith('.test.ts'));

  console.log(`Found ${libFiles.length} lib files\n`);

  // Analyze exports
  const exportInfos: Map<string, ExportInfo> = new Map();
  libFiles.forEach(file => {
    const info = analyzeExports(file);
    exportInfos.set(file, info);
  });

  // Print all exports
  console.log('📋 All Module Exports:\n');
  libFiles.forEach(file => {
    const info = exportInfos.get(file)!;
    const relativePath = file.replace(LIB_DIR + '/', '');
    if (info.exports.length > 0 || info.hasDefaultExport) {
      console.log(`${relativePath}:`);
      if (info.exports.length > 0) {
        info.exports.forEach(exp => console.log(`  - ${exp}`));
      }
      if (info.hasDefaultExport) {
        console.log(`  - default`);
      }
    }
  });

  // Get all source files for import analysis
  const sourceFiles = [
    ...getAllFiles(join(PROJECT_ROOT, 'src/app/api'), '.ts'),
    ...getAllFiles(join(PROJECT_ROOT, 'src/components'), '.ts'),
    ...getAllFiles(join(PROJECT_ROOT, 'src/app'), '.ts'),
  ].filter(f => !f.endsWith('.test.ts'));

  // Analyze imports and find usage
  const usageMap: Map<string, Set<string>> = new Map();

  sourceFiles.forEach(sourceFile => {
    try {
      const importInfo = analyzeImports(sourceFile);
      importInfo.imports.forEach(({ from, names }) => {
        const resolvedPath = resolveImportPath(from, sourceFile);
        if (resolvedPath && exportInfos.has(resolvedPath)) {
          if (!usageMap.has(resolvedPath)) {
            usageMap.set(resolvedPath, new Set());
          }
          names.forEach(name => usageMap.get(resolvedPath)!.add(name));
        }
      });
    } catch (e) {
      // Skip files with syntax errors
    }
  });

  // Find unused exports
  console.log('\n\n🔴 Potentially Unused Exports:\n');

  let hasUnused = false;
  libFiles.forEach(file => {
    const info = exportInfos.get(file)!;
    const usage = usageMap.get(file) || new Set();

    const unusedExports = info.exports.filter(exp => !usage.has(exp));

    if (unusedExports.length > 0) {
      hasUnused = true;
      const relativePath = file.replace(LIB_DIR + '/', '');
      console.log(`${relativePath}:`);
      unusedExports.forEach(exp => console.log(`  - ${exp}`));
    }
  });

  if (!hasUnused) {
    console.log('✅ No potentially unused exports found!');
  }
}

main();
