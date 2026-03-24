#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get list of React component files
const { execSync } = require('child_process');

const files = execSync('find src -type f \\( -name "*.tsx" -o -name "*.jsx" \\)', {
  encoding: 'utf-8',
  cwd: __dirname
}).trim().split('\n').filter(f => f);

console.log(`Found ${files.length} React component files\n`);

const analysis = {
  total: files.length,
  analyzed: 0,
  skip: [],
  missingUseClient: [],
  hasUseClient: [],
  byType: {
    stub: [],
    pure: [],
    hooks: [],
    context: []
  },
  details: []
};

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const relativePath = file.replace(/^src\//, '');

  const hasUseClient = /^\s*"use client"/.test(content) || /^\s*'use client'/.test(content);

  const isStub = content.length < 200 && /export default.*\{[^}]*\}/.test(content) ||
    /export function.*\{[^}]*<div>.*<\/div>.*\}/.test(content.replace(/\s/g, ''));

  const hooks = [
    'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
    'useMemo', 'useRef', 'useLayoutEffect', 'useImperativeHandle',
    'useId', 'useSyncExternalStore', 'useTransition', 'useDeferredValue',
    'useInsertionEffect', 'use'
  ];
  const usesHooks = hooks.some(hook =>
    new RegExp(`\\b${hook}\\(`).test(content)
  );

  const usesContext = /\buseContext\b\(/.test(content) ||
    /Context\.Provider/.test(content) ||
    /createContext/.test(content);

  const usesBrowserAPIs = /window\.|document\.|navigator\.|localStorage\.|sessionStorage\./.test(content);

  const hasEventHandlers = /on[A-Z][a-zA-Z]+=/.test(content);

  const hasStateManagement = /\buseState\(|\buseReducer\(/.test(content);

  let type = 'stub';
  let needsClient = false;

  if (isStub) {
    type = 'stub';
    needsClient = false;
  } else if (usesContext) {
    type = 'context';
    needsClient = true;
  } else if (usesHooks || usesBrowserAPIs || hasEventHandlers || hasStateManagement) {
    type = 'hooks';
    needsClient = true;
  } else {
    type = 'pure';
    if (relativePath.startsWith('components/') && !relativePath.includes('SEO')) {
      needsClient = true;
    }
  }

  analysis.analyzed++;

  const detail = {
    file: relativePath,
    hasUseClient,
    type,
    needsClient,
    isStub,
    usesHooks,
    usesContext,
    usesBrowserAPIs,
    hasEventHandlers,
    hasStateManagement,
    size: content.length,
    lineCount: content.split('\n').length
  };

  analysis.details.push(detail);

  if (hasUseClient) {
    analysis.hasUseClient.push(relativePath);
  } else if (needsClient) {
    analysis.missingUseClient.push(relativePath);
  }

  analysis.byType[type].push(relativePath);

  if (isStub) {
    analysis.skip.push(relativePath);
  }
});

console.log('=== React 19 Compatibility Analysis (Detailed) ===\n');
console.log(`Total files: ${analysis.total}`);
console.log(`Analyzed: ${analysis.analyzed}`);
console.log(`Stubs (minimal implementation): ${analysis.skip.length}`);
console.log(`Missing "use client" directive (needs fix): ${analysis.missingUseClient.length}`);
console.log(`Has "use client": ${analysis.hasUseClient.length}\n`);

console.log('=== By Type ===\n');
console.log(`Stubs (can stay server components): ${analysis.byType.stub.length}`);
console.log(`Pure components (no hooks/context): ${analysis.byType.pure.length}`);
console.log(`Components using hooks: ${analysis.byType.hooks.length}`);
console.log(`Components using context: ${analysis.byType.context.length}\n`);

console.log('=== Files Requiring "use client" Directive ===\n');
if (analysis.missingUseClient.length === 0) {
  console.log('✅ All components requiring "use client" already have it!');
} else {
  analysis.missingUseClient.forEach((file, i) => {
    const detail = analysis.details.find(d => d.file === file);
    console.log(`${i + 1}. ${file}`);
    console.log(`   Type: ${detail.type.toUpperCase()}`);
    console.log(`   Lines: ${detail.lineCount}`);
    console.log(`   Hooks: ${detail.usesHooks ? 'Yes' : 'No'}`);
    console.log(`   Context: ${detail.usesContext ? 'Yes' : 'No'}`);
    console.log(`   Browser APIs: ${detail.usesBrowserAPIs ? 'Yes' : 'No'}`);
    console.log(`   Event Handlers: ${detail.hasEventHandlers ? 'Yes' : 'No'}`);
    console.log('');
  });
}

console.log('\n=== Stubs (Can stay as server components) ===\n');
analysis.skip.forEach((file, i) => {
  const detail = analysis.details.find(d => d.file === file);
  console.log(`${i + 1}. ${file} (${detail.lineCount} lines)`);
});

console.log('\n=== Already Compliant Files ===\n');
analysis.hasUseClient.forEach((file, i) => {
  const detail = analysis.details.find(d => d.file === file);
  console.log(`${i + 1}. ${file} (${detail.lineCount} lines)`);
});

fs.writeFileSync('react19-detailed-analysis.json', JSON.stringify(analysis, null, 2));
console.log('\nDetailed report saved to: react19-detailed-analysis.json');

const fixPlan = {
  requiresFix: analysis.missingUseClient.map(file => {
    const detail = analysis.details.find(d => d.file === file);
    return {
      file,
      ...detail
    };
  }),
  alreadyFixed: analysis.hasUseClient,
  safeToIgnore: analysis.skip
};

fs.writeFileSync('react19-fix-plan-detailed.json', JSON.stringify(fixPlan, null, 2));
console.log('Fix plan saved to: react19-fix-plan-detailed.json');

console.log('\n=== Summary ===');
if (analysis.missingUseClient.length === 0) {
  console.log('🎉 All components are React 19 compatible!');
} else {
  console.log(`⚠️  ${analysis.missingUseClient.length} components need "use client" directive`);
}

const summaryReport = `# React 19 Compatibility Analysis - Final Report

**Analysis Date:** ${new Date().toISOString().split('T')[0]}
**Project:** 7zi-project

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Component Files** | ${analysis.total} |
| **Files Analyzed** | ${analysis.analyzed} |
| **Stubs (minimal impl)** | ${analysis.skip.length} |
| **Missing "use client" (needs fix)** | ${analysis.missingUseClient.length} |
| **Already Compliant** | ${analysis.hasUseClient.length} |

### 🎯 Action Required: ${analysis.missingUseClient.length > 0 ? 'YES' : 'NO'}

${analysis.missingUseClient.length === 0
  ? '✅ **All components are already React 19 compatible!**'
  : '⚠️ **' + analysis.missingUseClient.length + ' components need "use client" directive added.**'}

---

## Detailed Breakdown

### Component Types

| Type | Count | Description |
|------|-------|-------------|
| Stubs | ${analysis.byType.stub.length} | Minimal implementations, can stay as server components |
| Pure Components | ${analysis.byType.pure.length} | No hooks or context usage |
| Hook Components | ${analysis.byType.hooks.length} | Use React hooks, need "use client" |
| Context Components | ${analysis.byType.context.length} | Use Context API, need "use client" |

---

${analysis.missingUseClient.length > 0 ? '## 🚨 Files Requiring "use client" Directive\n\n' +
analysis.missingUseClient.map((file, i) => {
  const detail = analysis.details.find(d => d.file === file);
  const reasons = [];
  if (detail.usesContext) reasons.push('Uses Context');
  if (detail.usesHooks) reasons.push('Uses Hooks');
  if (detail.usesBrowserAPIs) reasons.push('Uses Browser APIs');
  if (detail.hasEventHandlers) reasons.push('Has Event Handlers');
  if (detail.hasStateManagement) reasons.push('Has State Management');

  return '### ' + (i + 1) + '. `' + file + '`\n\n' +
    '- **Lines of Code:** ' + detail.lineCount + '\n' +
    '- **Size:** ' + detail.size + ' bytes\n' +
    '- **Component Type:** ' + detail.type.toUpperCase() + '\n' +
    '- **Why needs "use client":** ' + reasons.join(', ') + '\n\n' +
    'Fix command: sed -i \'1s/^/"use client"\\\\n/\' src/' + file + '\n\n';
}).join('') : ''}

---

## 📋 Fix Priority

### Priority 1: Critical (Context Components)
${analysis.missingUseClient
  .filter(f => analysis.details.find(d => d.file === f).type === 'context')
  .map(f => '- `' + f + '`')
  .join('\n') || 'None'}

### Priority 2: High (Hook Components with Browser APIs)
${analysis.missingUseClient
  .filter(f => analysis.details.find(d => d.file === f).usesBrowserAPIs)
  .map(f => '- `' + f + '`')
  .join('\n') || 'None'}

### Priority 3: Medium (Other Hook Components)
${analysis.missingUseClient
  .filter(f => {
    const d = analysis.details.find(det => det.file === f);
    return d.type === 'hooks' && !d.usesBrowserAPIs && !d.usesContext;
  })
  .map(f => '- `' + f + '`')
  .join('\n') || 'None'}

### Priority 4: Low (Pure Components in client code)
${analysis.missingUseClient
  .filter(f => {
    const d = analysis.details.find(det => det.file === f);
    return d.type === 'pure';
  })
  .map(f => '- `' + f + '`')
  .join('\n') || 'None'}

---

## 🔧 Automated Fix Script

To fix all files that need "use client" directive, run:

\`\`\`bash
cd /root/.openclaw/workspace/7zi-project/7zi-project
for file in ${analysis.missingUseClient.map(f => 'src/' + f).join(' ')}; do
  if [ -f "$file" ] && ! head -n 1 "$file" | grep -q '"use client"'; then
    echo "Fixing: $file"
    sed -i '1s/^/"use client"\\n/' "$file"
  fi
done
\`\`\`

---

## ✅ Testing Checklist

After applying fixes:

- [ ] Build successfully: \`npm run build\`
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Run test suite: \`npm test\`
- [ ] Manual smoke test of main pages
- [ ] Check browser console for errors
- [ ] Verify context providers work
- [ ] Test state management
- [ ] Test event handlers
- [ ] Test browser API integrations

---

## 📊 Risk Assessment

| Risk Level | Description | Files |
|------------|-------------|-------|
| **High** | Context providers, complex state | ${analysis.missingUseClient.filter(f => {
  const d = analysis.details.find(det => det.file === f);
  return d.type === 'context' || d.hasStateManagement;
}).length} |
| **Medium** | Hook components with browser APIs | ${analysis.missingUseClient.filter(f => {
  const d = analysis.details.find(det => det.file === f);
  return d.usesBrowserAPIs && !d.usesContext;
}).length} |
| **Low** | Pure UI components, event handlers | ${analysis.missingUseClient.filter(f => {
  const d = analysis.details.find(det => det.file === f);
  return d.type === 'pure' || (d.hasEventHandlers && !d.usesHooks);
}).length} |

---

## 🎯 Recommended Action Plan

### Phase 1: Critical Components (1-2 hours)
1. Add "use client" to Priority 1 files
2. Test context providers
3. Verify app state management

### Phase 2: High Priority (1 hour)
1. Add "use client" to Priority 2 files
2. Test browser API integrations
3. Verify error handling

### Phase 3: Medium Priority (30 mins)
1. Add "use client" to Priority 3 files
2. Run full test suite
3. Check for regressions

### Phase 4: Validation (1 hour)
1. Run \`npm run build\`
2. Manual testing of all pages
3. Check console for errors
4. Deploy to staging

**Total Estimated Time:** 3-4 hours

---

## 📝 Notes

- Stubs (${analysis.skip.length} files) are minimal implementations and can safely remain as server components
- Many stub files can be deleted or replaced with actual implementations later
- Test files (\`.test.tsx\`) don't need "use client" directive
- SEO components in \`components/SEO/\` are fine as server components
- OpenGraph and Twitter image files in \`app/\` are special Next.js routes

---

## 🔄 Next Steps

1. Review this analysis
2. **${analysis.missingUseClient.length > 0 ? 'Run the automated fix script above' : 'No action needed!'}**
3. Run comprehensive testing
4. Deploy to staging for validation
5. Monitor for issues in production

---

**Report Generated:** ${new Date().toISOString()}
**Tool Version:** React 19 Compatibility Analyzer v2.0
`;

fs.writeFileSync('REACT_19_COMPATIBILITY_FINAL_REPORT.md', summaryReport);
console.log('\n✅ Final markdown report saved to: REACT_19_COMPATIBILITY_FINAL_REPORT.md');
