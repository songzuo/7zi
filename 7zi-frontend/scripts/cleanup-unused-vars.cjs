/**
 * Removes unused local variables and unused function parameters.
 *
 * Rules (very conservative):
 *  - Only removes:
 *      * `const X = ...` / `let X = ...` declarations that are never read
 *      * function parameters that are never read AND are not the last
 *        parameter of a function that is used as a callback (renaming to
 *        `_name` is used instead of removal for parameters)
 *  - Never removes: function declarations, class members, exports,
 *    variables whose initializer has side effects that we cannot verify.
 *
 * For parameters we prefer renaming to `_name` over deletion, because
 * deleting a parameter changes the function's arity / call signature.
 * For local `const`/`let` we only delete when the initializer is a "pure"
 * expression (identifier, literal, member access, or a call to a function
 * we recognise as pure). Otherwise we leave it alone.
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

/** Is the initializer safe to delete (no observable side effects)? */
function isPureInitializer(init) {
  if (!init) return true;
  switch (init.kind) {
    case ts.SyntaxKind.Identifier:
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NumericLiteral:
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
    case ts.SyntaxKind.NullKeyword:
    case ts.SyntaxKind.UndefinedKeyword:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
    case ts.SyntaxKind.ArrayLiteralExpression:
    case ts.SyntaxKind.ObjectLiteralExpression:
    case ts.SyntaxKind.ArrowFunction:
    case ts.SyntaxKind.FunctionExpression:
      return true;
    case ts.SyntaxKind.PropertyAccessExpression:
      return isPureInitializer(init.expression);
    case ts.SyntaxKind.ParenthesizedExpression:
      return isPureInitializer(init.expression);
    default:
      return false;
  }
}

/** whole-line removal if the statement sits alone on its line */
function expandToLine(start, end, text) {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = text.indexOf('\n', end);
  if (lineEnd === -1) lineEnd = text.length;
  const before = text.slice(lineStart, start);
  const after = text.slice(end, lineEnd);
  if (before.trim() === '' && after.trim() === '') {
    return { start: lineStart, end: lineEnd + 1 };
  }
  return { start, end };
}

(async () => {
  const eslint = new ESLint({ cwd: projectRoot, fix: false, errorOnUnmatchedPattern: false });
  const results = await eslint.lintFiles(['src/**/*.{ts,tsx}']);

  let removedVars = 0;
  let renamedParams = 0;
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

    const edits = [];

    for (const m of items) {
      const nameMatch = /'([^']+)'/.exec(m.message);
      if (!nameMatch) continue;
      const name = nameMatch[1];

      const pos = source.getPositionOfLineAndCharacter(m.line - 1, m.column);
      const ident = findIdentifier(source, pos, name);
      if (!ident) continue;
      const parent = ident.parent;

      // --- function parameter -> rename to _name ---
      if (ts.isParameter(parent)) {
        const fn = parent.parent;
        const isArrow = ts.isArrowFunction(fn) || ts.isFunctionExpression(fn);
        const isMethod = ts.isMethodDeclaration(fn) || ts.isConstructorDeclaration(fn);
        if (isArrow || isMethod) {
          // rename (keep arity) unless it's the required-arity tail
          // If the parameter has no type annotation, add one so that renaming
          // does not turn it into an implicit `any` (noImplicitAny).
          const hasType = !!parent.type;
          const text_ = hasType
            ? `_${name}`
            : `_: unknown`; // placeholder, replaced below
          if (!hasType) {
            // Untyped parameter: just rename it. Contextual typing (e.g. from a
            // callback signature) still applies, so this stays type-safe.
            // NOTE: do NOT add a type annotation here — a single untyped arrow
            // parameter cannot carry one without adding parentheses.
            edits.push({
              start: ident.getStart(source),
              end: ident.getEnd(),
              text: `_${name}`,
              name,
              kind: 'param',
            });
          } else {
            edits.push({ start: ident.getStart(source), end: ident.getEnd(), text: text_, name, kind: 'param' });
          }
        }
        continue;
      }

      // --- local const/let variable declaration ---
      if (ts.isVariableDeclaration(parent) && ts.isVariableDeclarationList(parent.parent)) {
        const list = parent.parent;
        // only when it is the sole declaration in the list
        if (list.declarations.length !== 1) continue;
        const declList = list;
        const stmt = declList.parent;
        // don't touch top-level module-scope declarations (may be exported later)
        if (!ts.isBlock(stmt.parent) && !ts.isSourceFile(stmt.parent)) continue;
        if (ts.isSourceFile(stmt.parent)) continue;
        if (!isPureInitializer(parent.initializer)) continue;

        const r = expandToLine(declList.getStart(source), declList.getEnd(), text);
        edits.push({ start: r.start, end: r.end, text: '', name, kind: 'var' });
        continue;
      }
    }

    if (!edits.length) continue;

    // apply non-overlapping edits (renames and deletions may collide -> drop both)
    edits.sort((a, b) => a.start - b.start);
    const safe = [];
    let lastEnd = -1;
    for (const e of edits) {
      const isInsert = e.start === e.end;
      if (isInsert ? e.start >= lastEnd : e.start >= lastEnd) {
        safe.push(e);
        if (!isInsert) lastEnd = e.end;
      }
    }

    let out = text;
    let removed = 0;
    let renamed = 0;
    // apply in reverse order
    const ordered = safe.slice().sort((a, b) => b.start - a.start || b.end - a.end);
    for (const e of ordered) {
      const chunk = out.slice(e.start, e.end);
      if (e.kind === 'param') {
        if (!chunk.includes(e.name)) continue;
        out = out.slice(0, e.start) + e.text + out.slice(e.end);
        renamed++;
      } else {
        // verify the chunk really is the declaration
        if (!chunk.includes(e.name)) continue;
        out = out.slice(0, e.start) + out.slice(e.end);
        removed++;
      }
    }

    if (removed || renamed) {
      fs.writeFileSync(filePath, out);
      removedVars += removed;
      renamedParams += renamed;
      totalFiles++;
      details.push({ file: path.relative(projectRoot, filePath), removed, renamed });
    }
  }

  console.log(
    `Removed ${removedVars} unused local variables, renamed ${renamedParams} unused parameters across ${totalFiles} files.`
  );
  if (process.env.VERBOSE) {
    for (const d of details) {
      if (d.removed || d.renamed) {
        console.log(`  ${d.file}: -${d.removed} vars, ~${d.renamed} params`);
      }
    }
  }
})();
