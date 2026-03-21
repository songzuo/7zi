#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Directories to scan
const directories = [
  path.join(__dirname, '../src/lib'),
  path.join(__dirname, '../src/components')
];

// File extensions to check
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

// Function to get all files
function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (extensions.includes(path.extname(file))) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Function to extract code blocks
function extractCodeBlocks(content, minLines = 5) {
  const lines = content.split('\n');
  const blocks = [];

  for (let i = 0; i <= lines.length - minLines; i++) {
    const block = lines.slice(i, i + minLines).join('\n');
    blocks.push({
      startLine: i + 1,
      lines: minLines,
      code: block
    });
  }

  return blocks;
}

// Function to normalize code (remove whitespace, comments for comparison)
function normalizeCode(code) {
  return code
    .replace(/\/\/.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

// Scan for duplicates
console.log('🔍 Scanning for duplicate code...\n');

const allFiles = [];
directories.forEach(dir => {
  allFiles.push(...getAllFiles(dir));
});

console.log(`Found ${allFiles.length} files to analyze\n`);

const codeSignatures = new Map();
const duplicates = [];

allFiles.forEach(filePath => {
  const relativePath = path.relative(__dirname, filePath);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract and compare code blocks
  const blocks = extractCodeBlocks(content, 5);

  blocks.forEach(block => {
    const normalized = normalizeCode(block.code);
    const signature = normalized.substring(0, 200); // Use first 200 chars as signature

    if (normalized.length > 100) { // Only check blocks with meaningful content
      if (codeSignatures.has(signature)) {
        const existing = codeSignatures.get(signature);
        duplicates.push({
          signature: normalized.substring(0, 100) + '...',
          files: [
            { path: existing.path, line: existing.line },
            { path: relativePath, line: block.startLine }
          ],
          sample: block.code.substring(0, 200)
        });
      } else {
        codeSignatures.set(signature, {
          path: relativePath,
          line: block.startLine
        });
      }
    }
  });
});

// Remove duplicate entries (same file pair may appear multiple times)
const uniqueDuplicates = [];
const seen = new Set();

duplicates.forEach(dup => {
  const key = dup.files.map(f => f.path).sort().join('|');
  if (!seen.has(key)) {
    seen.add(key);
    uniqueDuplicates.push(dup);
  }
});

// Report results
console.log('\n📊 DUPLICATE CODE REPORT\n');
console.log('=====================\n');

if (uniqueDuplicates.length === 0) {
  console.log('✅ No duplicate code blocks found!\n');
} else {
  console.log(`⚠️  Found ${uniqueDuplicates.length} potential duplicate code blocks:\n`);

  uniqueDuplicates.forEach((dup, index) => {
    console.log(`${index + 1}. Files involved:`);
    dup.files.forEach(file => {
      console.log(`   - ${file.path}:${file.line}`);
    });
    console.log(`   Sample: ${dup.sample}...\n`);
  });
}

console.log(`\nTotal files scanned: ${allFiles.length}`);
console.log(`Total duplicate blocks found: ${uniqueDuplicates.length}`);
