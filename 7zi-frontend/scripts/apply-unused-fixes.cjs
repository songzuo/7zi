/**
 * Removes unused imports and unused object-destructuring bindings.
 *
 * Safety rules (a removal is skipped unless all hold):
 *  1. The binding must be reported unused by @typescript-eslint/no-unused-vars.
 *  2. Only import bindings and object-binding-pattern elements are eligible.
 *  3. A function-parameter destructuring pattern is never emptied (we skip
 *     removal of its last element) -> avoids `function f({}: T)` which is a
 *     syntax error for parameters in TS.
 *  4. A variable-declaration destructuring pattern that becomes empty causes the
 *     whole statement to be removed (instead of leaving `const {} = x`).
 *  5. A named-import clause that becomes empty causes the whole import
 *     statement to be removed (instead of leaving `import {} from 'x'`).
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { ESLint } = require('eslint');

const projectRoot = path.resolve(__dirname, '..');

function findIdentifier(source, pos, name) {
  let best = null;
  function visit(node) {
    const s = node.getStart(source);
    const e = node.getEnd();
    if (e < pos || s > pos) return;
    if (ts.isIdentifier(node) && node.getText(source) === name) {
      if (!best || s > best.getStart(source)) best = node;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return best;
}

/**
 * If the element sits alone on its line (only whitespace around it), the whole
 * line (including its newline) is removed so we never leave blank/whitespace-only
 * lines behind.
 */
function expandToWholeLine(start, end, text) {
  let lineStart = text.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = text.indexOf('\n', end);
  if (lineEnd === -1) lineEnd = text.length;
  const before = text.slice(lineStart, start);
  let after = text.slice(end, lineEnd);
  // trailing comma belongs to the element
  if (after.trimStart().startsWith(',')) {
    const commaIdx = text.indexOf(',', end);
    if (commaIdx !== -1 && commaIdx < lineEnd) {
      end = commaIdx + 1;
      after = text.slice(end, lineEnd);
    }
  }
  const afterTrim = after.trim();
  if (before.trim() === '' && afterTrim === '') {
    return { start: lineStart, end: lineEnd + 1 };
  }
  return { start, end };
}

/** range that removes `spec` from `import { a, spec, b }` without leaving dangling commas */
function importSpecRange(source, spec, text) {
  const specs = spec.parent.elements;
  const idx = specs.indexOf(spec);
  let start = spec.getStart(source);
  let end = spec.getEnd();
  if (idx < specs.length - 1) {
    end = specs[idx + 1].getStart(source);
  } else {
    const after = text.slice(end);
    if (after.startsWith(',')) {
      end += 1;
      if (after[1] === ' ') end += 1;
    }
    const before = text.slice(Math.max(0, start - 2), start);
    if (before.endsWith(', ')) start -= 2;
    else if (before.endsWith(',')) start -= 1;
  }
  return expandToWholeLine(start, end, text);
}

/** range that removes `el` from `{ a, el, b }` without leaving dangling commas */
function bindingElementRange(source, el, text) {
  let start = el.getStart(source);
  let end = el.getEnd();
  const after = text.slice(end, end + 2);
  const before = text.slice(Math.max(0, start - 2), start);
  if (after.startsWith(', ')) end += 2;
  else if (after.startsWith(',')) end += 1;
  else if (before.endsWith(', ')) start -= 2;
  else if (before.endsWith(',')) start -= 1;
  return expandToWholeLine(start, end, text);
}

(async () => {
  const eslint = new ESLint({ cwd: projectRoot, fix: false, errorOnUnmatchedPattern: false });
  const results = await eslint.lintFiles(['src/**/*.{ts,tsx}']);

  let totalRemoved = 0;
  let totalFiles = 0;
  const details = [];

  for (const result of results) {
    const filePath = result.filePath;
    if (!filePath) continue;

    const items = result.messages.filter(
      (m) => m.ruleId === '@typescript-eslint/no-unused-vars' && m.messageId === 'unusedVar'
    );
    if (!items.length) continue;

    const text = fs.readFileSync(filePath, 'utf8');
    const source = ts.createSourceFile(
      filePath,
      text,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    /** @type {{start:number,end:number,name:string,group?:any}[]} */
    const removals = [];

    for (const m of items) {
      const nameMatch = /'([^']+)'/.exec(m.message);
      if (!nameMatch) continue;
      const name = nameMatch[1];

      const pos = source.getPositionOfLineAndCharacter(m.line - 1, m.column);
      const ident = findIdentifier(source, pos, name);
      if (!ident) continue;
      const parent = ident.parent;

      // ---------- import { X } / import { X as Y } ----------
      if (ts.isImportSpecifier(parent)) {
        removals.push({
          ...importSpecRange(source, parent, text),
          name,
          group: { kind: 'import-clause', clause: parent.parent },
        });
        continue;
      }

      // ---------- import X from '...' (default import) ----------
      if (ts.isImportClause(parent) && parent.name === ident) {
        if (!parent.namedBindings) {
          const stmt = parent.parent;
          removals.push({ start: stmt.getStart(source), end: stmt.getEnd(), name });
        } else {
          let start = ident.getStart(source);
          let end = ident.getEnd();
          const after = text.slice(end, end + 2);
          if (after.startsWith(', ')) end += 2;
          else if (after.startsWith(',')) end += 1;
          removals.push({ start, end, name });
        }
        continue;
      }

      // ---------- import * as X from '...' ----------
      if (ts.isNamespaceImport(parent)) {
        removals.push({ start: parent.getStart(source), end: parent.getEnd(), name });
        continue;
      }

      // ---------- object binding pattern element ----------
      let pattern = null;
      let owner = null;
      if (ts.isBindingElement(parent) && ts.isObjectBindingPattern(parent.parent)) {
        pattern = parent.parent;
        owner = parent.parent.parent; // function params / variable decl
      }
      if (!pattern) continue;

      const isParameter = ts.isParameter(owner);
      const siblings = pattern.elements;
      const isLast = siblings.indexOf(parent) === siblings.length - 1;

      // Rule 3: never empty out a parameter destructuring pattern
      if (isParameter && siblings.length === 1) continue;

      removals.push({
        ...bindingElementRange(source, parent, text),
        name,
        group: { kind: 'binding-pattern', pattern, owner, isParameter },
      });
    }

    if (!removals.length) continue;

    // ---- group resolution ----
    const groupCounts = new Map();
    for (const r of removals) {
      if (!r.group) continue;
      const key = r.group.kind === 'import-clause' ? r.group.clause : r.group.pattern;
      groupCounts.set(key, (groupCounts.get(key) || 0) + 1);
    }

    const expanded = [];
    const handledGroups = new Set();
    for (const r of removals) {
      if (!r.group) {
        expanded.push(r);
        continue;
      }
      const key = r.group.kind === 'import-clause' ? r.group.clause : r.group.pattern;
      if (handledGroups.has(key)) continue;
      handledGroups.add(key);

      const total = r.group.kind === 'import-clause' ? r.group.clause.elements.length : r.group.pattern.elements.length;
      const removing = groupCounts.get(key);

      if (r.group.kind === 'import-clause') {
        if (removing >= total) {
          // whole import statement
          const stmt = r.group.clause.parent.parent;
          expanded.push({ start: stmt.getStart(source), end: stmt.getEnd(), name: '<import>' });
        } else {
          expanded.push(r);
        }
        continue;
      }

      // binding pattern
      if (removing >= total) {
        if (r.group.isParameter) {
          // rule 3: skip entirely
          continue;
        }
        // remove the whole variable declaration statement
        const decl = r.group.owner; // VariableDeclaration
        const stmt = decl.parent;
        const full = stmt.getStart(source);
        const fullEnd = stmt.getEnd();
        expanded.push({ start: full, end: fullEnd, name: '<destructure>' });
      } else {
        expanded.push(r);
      }
    }

    // dedupe + drop overlaps
    expanded.sort((a, b) => a.start - b.start);
    const safe = [];
    let lastEnd = -1;
    for (const r of expanded) {
      if (r.start >= lastEnd) {
        safe.push(r);
        lastEnd = r.end;
      }
    }

    let out = text;
    let removed = 0;
    const names = [];
    for (const r of safe.reverse()) {
      const chunk = out.slice(r.start, r.end);
      if (r.name !== '<import>' && r.name !== '<destructure>' && !chunk.includes(r.name)) continue;
      out = out.slice(0, r.start) + out.slice(r.end);
      removed++;
      names.push(r.name);
    }

    if (removed > 0) {
      fs.writeFileSync(filePath, out);
      totalRemoved += removed;
      totalFiles++;
      details.push({ file: path.relative(projectRoot, filePath), names });
    }
  }

  console.log(`Removed ${totalRemoved} unused import/destructuring bindings across ${totalFiles} files.`);
  if (process.env.VERBOSE) {
    for (const d of details) console.log(`  ${d.file}: ${d.names.join(', ')}`);
  }
})();
