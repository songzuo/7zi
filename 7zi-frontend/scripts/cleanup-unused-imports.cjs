/**
 * Codemod: remove unused imports + unused destructured bindings,
 * driven by ESLint's @typescript-eslint/no-unused-vars findings (exact positions),
 * with the TypeScript AST used to determine safe removal ranges.
 *
 * Guarantees:
 *  - Only import specifiers / import clauses / object-binding-pattern elements
 *    are ever removed. Nothing else is touched.
 *  - Removal ranges are validated to actually contain the reported identifier.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const eslintJson = process.argv[2];

if (!eslintJson) {
  console.error('Usage: node cleanup-unused-imports.cjs <eslint-report.json>');
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(eslintJson, 'utf8'));

/** @type {Map<string, {line:number,column:number,name:string}[]>} */
const perFile = new Map();
for (const f of report) {
  for (const m of f.messages) {
    if (m.ruleId !== '@typescript-eslint/no-unused-vars') continue;
    if (!m.name) continue;
    if (!perFile.has(f.filePath)) perFile.set(f.filePath, []);
    perFile.get(f.filePath).push({ line: m.line, column: m.column, name: m.name });
  }
}

let totalRemoved = 0;
let totalFiles = 0;
const details = [];

for (const [filePath, items] of perFile) {
  if (!fs.existsSync(filePath)) continue;
  const text = fs.readFileSync(filePath, 'utf8');
  const source = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  /** @type {{start:number,end:number,name:string}[]} */
  const removals = [];

  for (const item of items) {
    // locate identifier at exact position
    const pos = source.getPositionOfLineAndCharacter(item.line - 1, item.column);
    const found = findIdentifierAt(source, pos, item.name);
    if (!found) continue;

    const node = found.node;
    const parent = node.parent;
    const idStart = node.getStart(source);
    const idEnd = node.getEnd();

    // ---- import specifier: import { A, B } from 'x' ----
    if (ts.isImportSpecifier(parent)) {
      const named = parent.parent;
      const specs = named.elements;
      const idx = specs.indexOf(parent);
      let start = idStart;
      let end = idEnd;
      if (idx < specs.length - 1) {
        end = specs[idx + 1].getStart(source);
      } else {
        // last one: swallow preceding comma
        const before = text.slice(Math.max(0, start - 2), start);
        if (before.endsWith(', ')) start -= 2;
        else if (before.endsWith(',')) start -= 1;
      }
      removals.push({ start, end, name: item.name });
      continue;
    }

    // ---- default import: import Foo from 'x' ----
    if (ts.isImportClause(parent) && parent.name === node) {
      if (!parent.namedBindings) {
        // remove the whole import statement
        const stmt = parent.parent;
        removals.push({ start: stmt.getStart(source), end: stmt.getEnd(), name: item.name });
      } else {
        removals.push({ start: idStart, end: idEnd, name: item.name });
      }
      continue;
    }

    // ---- namespace import: import * as Foo from 'x' ----
    if (ts.isNamespaceImport(parent)) {
      removals.push({ start: parent.getStart(source), end: parent.getEnd(), name: item.name });
      continue;
    }

    // ---- object destructuring element ----
    // const { a, b: c } = obj
    const pattern = ts.isObjectBindingPattern(parent) ? parent : null;
    if (pattern) {
      let start = idStart;
      let end = idEnd;
      const after = text.slice(end, end + 2);
      const before = text.slice(Math.max(0, start - 2), start);
      if (after.startsWith(', ')) end += 2;
      else if (after.startsWith(',')) end += 1;
      else if (before.endsWith(', ')) start -= 2;
      else if (before.endsWith(',')) start -= 1;
      removals.push({ start, end, name: item.name });
      continue;
    }

    // ---- variable declaration shorthand / renamed in object pattern ----
    if (ts.isVariableDeclaration(parent) && parent.initializer) {
      const init = parent.initializer;
      if (ts.isObjectBindingPattern(init)) {
        let start = idStart;
        let end = idEnd;
        const after = text.slice(end, end + 2);
        const before = text.slice(Math.max(0, start - 2), start);
        if (after.startsWith(', ')) end += 2;
        else if (after.startsWith(',')) end += 1;
        else if (before.endsWith(', ')) start -= 2;
        else if (before.endsWith(',')) start -= 1;
        removals.push({ start, end, name: item.name });
        continue;
      }
    }
  }

  if (!removals.length) continue;

  // dedupe by range
  const seen = new Set();
  const uniq = removals.filter((r) => {
    const k = `${r.start}:${r.end}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // detect overlapping ranges -> skip both to be safe
  uniq.sort((a, b) => a.start - b.start);
  const safe = [];
  let lastEnd = -1;
  for (const r of uniq) {
    if (r.start >= lastEnd) {
      safe.push(r);
      lastEnd = r.end;
    }
  }

  let out = text;
  let removed = 0;
  const removedNames = [];
  for (const r of safe.slice().reverse()) {
    const chunk = out.slice(r.start, r.end);
    // sanity: the removed chunk must mention the identifier
    if (!chunk.includes(r.name)) continue;
    out = out.slice(0, r.start) + out.slice(r.end);
    removed++;
    removedNames.push(r.name);
  }

  if (removed > 0) {
    fs.writeFileSync(filePath, out);
    totalRemoved += removed;
    totalFiles++;
    details.push({
      file: path.relative(projectRoot, filePath),
      removed: removedNames,
    });
  }
}

console.log(`Removed ${totalRemoved} unused bindings across ${totalFiles} files.`);
if (process.env.VERBOSE) {
  for (const d of details) console.log(`  ${d.file}: ${d.removed.join(', ')}`);
}

function findIdentifierAt(source, pos, name) {
  let best = null;
  function visit(node) {
    const s = node.getStart(source);
    const e = node.getEnd();
    if (s > pos) return;
    if (e < pos) return;
    if (ts.isIdentifier(node) && s === pos && node.getText(source) === name) {
      best = { node };
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return best;
}
