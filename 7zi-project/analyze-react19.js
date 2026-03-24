const fs = require('fs');
const path = require('path');

// Find all TSX/JSX files
const { execSync } = require('child_process');

// Get list of React component files
const files = execSync('find src -type f \\( -name "*.tsx" -o -name "*.jsx" \\)', {
  encoding: 'utf-8',
  cwd: __dirname
}).trim().split('\n').filter(f => f);

console.log(`Found ${files.length} React component files\n`);

const analysis = {
  total: files.length,
  missingUseClient: [],
  hasUseClient: [],
  byType: {
    pure: [], // No hooks, no context
    hooks: [], // Uses hooks
    context: [] // Uses context
  },
  details: []
};

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const relativePath = file.replace(/^src\//, '');

  // Check for "use client" directive
  const hasUseClient = /^\s*"use client"/.test(content) || /^\s*'use client'/.test(content);

  // Check for React hooks
  const hooks = [
    'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
    'useMemo', 'useRef', 'useLayoutEffect', 'useImperativeHandle',
    'useId', 'useSyncExternalStore', 'useTransition', 'useDeferredValue',
    'useInsertionEffect'
  ];
  const usesHooks = hooks.some(hook =>
    new RegExp(`\\b${hook}\\(`).test(content)
  );

  // Check for Context usage
  const usesContext = /\buseContext\b\(/.test(content) ||
    /<SettingsContext\.Provider/.test(content) ||
    /<ThemeProvider/.test(content) ||
    /createContext/.test(content) ||
    /Context\.Provider/.test(content);

  // Categorize
  let type = 'pure';
  if (usesContext) {
    type = 'context';
  } else if (usesHooks) {
    type = 'hooks';
  }

  const detail = {
    file: relativePath,
    hasUseClient,
    type,
    usesHooks,
    usesContext,
    size: content.length
  };

  analysis.details.push(detail);

  if (hasUseClient) {
    analysis.hasUseClient.push(relativePath);
  } else {
    analysis.missingUseClient.push(relativePath);
  }

  analysis.byType[type].push(relativePath);
});

// Output results
console.log('=== React 19 Compatibility Analysis ===\n');
console.log(`Total files: ${analysis.total}`);
console.log(`Missing "use client": ${analysis.missingUseClient.length}`);
console.log(`Has "use client": ${analysis.hasUseClient.length}\n`);

console.log('=== By Type ===\n');
console.log(`Pure components (no hooks/context): ${analysis.byType.pure.length}`);
console.log(`Components using hooks: ${analysis.byType.hooks.length}`);
console.log(`Components using context: ${analysis.byType.context.length}\n`);

console.log('=== Files Missing "use client" Directive ===\n');
analysis.missingUseClient.forEach((file, i) => {
  const detail = analysis.details.find(d => d.file === file);
  console.log(`${i + 1}. ${file}`);
  console.log(`   Type: ${detail.type.toUpperCase()}`);
  console.log(`   Hooks: ${detail.usesHooks ? 'Yes' : 'No'}`);
  console.log(`   Context: ${detail.usesContext ? 'Yes' : 'No'}`);
  console.log(`   Size: ${detail.size} bytes\n`);
});

// Save detailed analysis
fs.writeFileSync('react19-analysis-report.json', JSON.stringify(analysis, null, 2));
console.log('\nDetailed report saved to: react19-analysis-report.json');

// Create fix plan
const fixPlan = {
  priority1: [], // Critical - context components
  priority2: [], // High - hook components
  priority3: [], // Medium - pure components that might need it
  safeToIgnore: [] // Can remain server components
};

analysis.details.forEach(detail => {
  if (!detail.hasUseClient) {
    if (detail.type === 'context') {
      fixPlan.priority1.push(detail);
    } else if (detail.type === 'hooks') {
      fixPlan.priority2.push(detail);
    } else if (detail.type === 'pure') {
      // Pure components might be fine as server components
      // Check if they import from client-only modules
      const fullPath = path.join(__dirname, 'src', detail.file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const hasClientOnlyImports = /from ['"]react['"]/.test(content) ||
        /from ['"]next\/navigation['"]/.test(content);

      if (hasClientOnlyImports || detail.file.includes('SEO/')) {
        // SEO components often need to be client components
        fixPlan.priority3.push(detail);
      } else {
        fixPlan.safeToIgnore.push(detail);
      }
    }
  }
});

console.log('\n=== Fix Plan ===\n');
console.log(`Priority 1 (Critical - Context): ${fixPlan.priority1.length} files`);
console.log(`Priority 2 (High - Hooks): ${fixPlan.priority2.length} files`);
console.log(`Priority 3 (Medium - Pure with imports): ${fixPlan.priority3.length} files`);
console.log(`Safe to ignore (Server components): ${fixPlan.safeToIgnore.length} files\n`);

fs.writeFileSync('react19-fix-plan.json', JSON.stringify(fixPlan, null, 2));
console.log('Fix plan saved to: react19-fix-plan.json');

// Create risk assessment
const riskAssessment = {
  highRisk: [], // Breaking changes
  mediumRisk: [], // Need testing
  lowRisk: [] // Simple fixes
};

// Generate markdown report
const markdownReport = `# React 19 Compatibility Analysis Report

## Summary

- **Total Component Files:** ${analysis.total}
- **Missing "use client" directive:** ${analysis.missingUseClient.length}
- **Already compatible:** ${analysis.hasUseClient.length}

## Categorization

| Type | Count | Description |
|------|-------|-------------|
| Pure Components | ${analysis.byType.pure.length} | No hooks or context |
| Hook Components | ${analysis.byType.hooks.length} | Use React hooks |
| Context Components | ${analysis.byType.context.length} | Use Context API |

## Fix Priority

### Priority 1: Critical (Context Components) - ${fixPlan.priority1.length} files
${fixPlan.priority1.map((f, i) => `${i + 1}. \`${f.file}\``).join('\n') || 'None'}

### Priority 2: High (Hook Components) - ${fixPlan.priority2.length} files
${fixPlan.priority2.map((f, i) => `${i + 1}. \`${f.file}\``).join('\n') || 'None'}

### Priority 3: Medium (Pure with Client Imports) - ${fixPlan.priority3.length} files
${fixPlan.priority3.map((f, i) => `${i + 1}. \`${f.file}\``).join('\n') || 'None'}

### Safe to Ignore (Server Components) - ${fixPlan.safeToIgnore.length} files
${fixPlan.safeToIgnore.map((f, i) => `${i + 1}. \`${f.file}\``).join('\n') || 'None'}

## Risk Assessment

### High Risk
Breaking changes that could affect app behavior if not tested:
- Context components that might be used in server components
- Components with complex hook dependencies

### Medium Risk
Need regression testing:
- Hook components that use browser APIs
- Event handlers and form components

### Low Risk
Simple directive additions:
- Pure UI components
- Presentational components

## Recommended Approach

1. Start with Priority 1 (Context components)
2. Test each change individually
3. Move to Priority 2 (Hook components)
4. Test page routes that use these components
5. Review Priority 3 and Safe to Ignore
6. Run full test suite

## Automated Fix Command

For Priority 1 and 2 files, add "use client" directive at the top:

\`\`\`bash
# Add "use client" to priority files
for file in ${fixPlan.priority1.concat(fixPlan.priority2).map(f => `src/${f.file}`).join(' ')}; do
  if ! head -n 1 "$file" | grep -q '"use client"'; then
    sed -i '1s/^/"use client"\\n/' "$file"
    echo "Fixed: $file"
  fi
done
\`\`\`

## Testing Checklist

- [ ] Test all context providers work correctly
- [ ] Verify state management still functions
- [ ] Check event handlers fire properly
- [ ] Run test suite: \`npm test\`
- [ ] Build successfully: \`npm run build\`
- [ ] Manual smoke test of key pages
- [ ] Check for console errors
- [ ] Verify SEO components still work

## Next Steps

1. Review this analysis
2. Approve the fix plan
3. Execute automated fixes
4. Run comprehensive testing
5. Deploy to staging for validation
`;

fs.writeFileSync('REACT_19_COMPATIBILITY_ANALYSIS.md', markdownReport);
console.log('Markdown report saved to: REACT_19_COMPATIBILITY_ANALYSIS.md');
