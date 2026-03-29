# React Compiler Integration

Comprehensive React Compiler integration for Next.js projects with diagnostics, configuration, and performance tracking.

## Features

- **🔍 Compatibility Diagnostics**: Automatically detect incompatible components
- **⚙️  Fine-grained Configuration**: Control which files are compiled
- **📊 Performance Tracking**: Measure optimization improvements
- **📈 Detailed Reports**: Export compatibility reports in JSON, Markdown, or HTML
- **🎛️  Dashboard UI**: Real-time monitoring and control interface
- **🔧 Migration Guide**: Automated fix suggestions and migration planning

## Installation

This module is part of the project's `src/lib/` structure. No additional installation required.

## Quick Start

### 1. Enable React Compiler

```typescript
import { enableCompiler } from '@/lib/react-compiler';

enableCompiler();
```

Or via environment variable:

```bash
export ENABLE_REACT_COMPILER=true
```

### 2. Scan for Compatibility

```typescript
import { scanDiagnostics } from '@/lib/react-compiler';

const result = await scanDiagnostics('/path/to/project');

console.log(`Compatibility: ${result.compatibilityRate}%`);
console.log(`Components: ${result.totalComponents}`);
console.log(`Issues: ${result.errors} errors, ${result.warnings} warnings`);
```

### 3. Check File Compilation

```typescript
import { checkFile } from '@/lib/react-compiler';

if (checkFile('/src/components/MyComponent.tsx')) {
  console.log('This component will be compiled with React Compiler');
}
```

### 4. Track Performance

```typescript
import { getPerformanceTracker } from '@/lib/react-compiler';

const tracker = getPerformanceTracker();

// Start tracking
tracker.startTracking();

// Your app runs...

// Stop tracking
tracker.stopTracking();

// Get stats
const stats = tracker.getAllStats();
console.log(`Total renders: ${stats.totalRenders}`);
console.log(`Avg render time: ${stats.avgRenderTime}ms`);
```

## Configuration

### Default Configuration

```typescript
const defaultConfig = {
  enabled: process.env.ENABLE_REACT_COMPILER === 'true',
  enableInDevelopment: process.env.REACT_COMPILER_DEV === 'true',
  verbose: process.env.REACT_COMPILER_VERBOSE === 'true',
  ignore: [
    'node_modules/**',
    'src/components/third-party/**',
    'src/components/legacy/**',
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}'
  ],
  only: [] // Empty means compile all non-ignored files
};
```

### Custom Configuration

```typescript
import { getConfigManager } from '@/lib/react-compiler';

const configManager = getConfigManager();

// Enable React Compiler
configManager.enable();

// Add files to ignore list
configManager.addToIgnore('src/components/experimental/**');

// Add files to "only" list (compile only these)
configManager.addToOnly('src/components/core/**');

// Check configuration
const config = configManager.getConfig();
console.log(config);
```

### Ignore List Presets

```typescript
import { getIgnoreListByPreset } from '@/lib/react-compiler';

// Conservative: ignore only definitely incompatible files
const conservative = getIgnoreListByPreset('conservative');

// Moderate: ignore potentially incompatible patterns
const moderate = getIgnoreListByPreset('moderate');

// Aggressive: compile only specific, well-tested components
const aggressive = getIgnoreListByPreset('aggressive');
```

## Diagnostics

### Scanner

The scanner detects incompatible patterns in your components:

- **ref.current access**: Not supported by React Compiler
- **dangerouslySetInnerHTML**: Not supported
- **Direct object mutation**: Not supported
- **Class components**: Not supported (only function components)
- **useEffect with external dependencies**: May limit optimization
- **Functional state updates**: Compatible

```typescript
import { createDiagnostics } from '@/lib/react-compiler';

const diagnostics = createDiagnostics('/path/to/project');
const result = await diagnostics.scan();

// View all issues
for (const report of result.components) {
  if (!report.isCompatible) {
    console.log(`${report.component} is incompatible:`);
    for (const issue of report.issues) {
      console.log(`  [${issue.severity}] ${issue.message}`);
      console.log(`    Line ${issue.line}: ${issue.suggestion}`);
    }
  }
}
```

### Reporter

Generate detailed compatibility reports:

```typescript
import { createReporter } from '@/lib/react-compiler';

const reporter = createReporter();
const detailedReport = reporter.generateDetailedReport(reports, scanTime);

// Export to different formats
const json = reporter.exportReport(detailedReport, 'json');
const markdown = reporter.exportReport(detailedReport, 'markdown');
const html = reporter.exportReport(detailedReport, 'html');

// Print summary to console
reporter.printSummary(detailedReport);
```

### Export Formats

#### JSON
```json
{
  "totalComponents": 100,
  "compatibleComponents": 85,
  "incompatibleComponents": 15,
  "compatibilityRate": 85.0,
  "errors": 5,
  "warnings": 10,
  "info": 3,
  "components": [...]
}
```

#### Markdown
```markdown
# React Compiler Compatibility Report

## Summary
| Metric | Value |
|--------|-------|
| Total Components | 100 |
| Compatible | 85 |
| Incompatible | 15 |
| Compatibility Rate | 85.0% |
```

#### HTML
Full HTML report with styling for web viewing.

## Performance Tracking

### Component-level Tracking

```typescript
import { usePerformanceTracking } from '@/lib/react-compiler';

function MyComponent() {
  usePerformanceTracking('MyComponent');

  return <div>My Component</div>;
}
```

### Render Count

```typescript
import { useRenderCount } from '@/lib/react-compiler';

function MyComponent() {
  const renderCount = useRenderCount('MyComponent');

  return <div>Renders: {renderCount}</div>;
}
```

### Performance Stats

```typescript
import { usePerformanceStats } from '@/lib/react-compiler';

function MyComponent() {
  const stats = usePerformanceStats('MyComponent');

  return (
    <div>
      <p>Renders: {stats?.renderCount}</p>
      <p>Avg Time: {stats?.avgRenderTime}ms</p>
      <p>Memory: {stats?.memoryUsage} bytes</p>
    </div>
  );
}
```

### Event Listening

```typescript
import { getPerformanceTracker } from '@/lib/react-compiler';

const tracker = getPerformanceTracker();

// Listen for render events
const unsubscribe = tracker.addListener((event) => {
  console.log(`[${event.type}] ${event.component}:`, event.data);
});

// Stop listening
unsubscribe();
```

## Dashboard

Use the built-in dashboard for real-time monitoring:

```typescript
import { CompilerDiagnostics } from '@/lib/react-compiler';

export default function DashboardPage() {
  return <CompilerDiagnostics />;
}
```

Dashboard features:
- 📊 Overall statistics (total, compatible, incompatible, issues)
- 📈 Compatibility rate with progress bar
- 📋 Component list with status indicators
- 🔍 Detailed issue view with fix suggestions
- ⚡ Performance comparison (before/after compiler)
- 🎛️  Toggle switch to enable/disable compiler
- 📄 Export reports

## Migration Guide

### Step 1: Scan Your Project

```bash
# Using environment variable
ENABLE_REACT_COMPILER=true npm run scan:compatibility
```

### Step 2: Review Compatibility Report

Check the generated report for incompatible components:
- 🔴 **Errors**: Must be fixed before enabling compiler
- 🟡 **Warnings**: Should be fixed for better optimization
- 🔵 **Info**: Notes about potential optimization limits

### Step 3: Fix High-priority Issues

Start with error-level issues:
- Convert class components to function components
- Replace ref.current with useState
- Use immutable patterns instead of mutations
- Remove dangerouslySetInnerHTML

### Step 4: Enable Gradually

```typescript
import { getConfigManager } from '@/lib/react-compiler';

// Start with "only" list - compile only well-tested components
const configManager = getConfigManager();
configManager.addToOnly('src/components/core/**');
configManager.enable();

// Monitor and expand gradually
configManager.addToOnly('src/components/features/**');
```

### Step 5: Measure Performance

```typescript
import { getPerformanceTracker } from '@/lib/react-compiler';

const tracker = getPerformanceTracker();
tracker.startTracking();

// Run your app with compiler enabled...

tracker.stopTracking();
const stats = tracker.getAllStats();
console.log('Performance improvements:', stats);
```

### Step 6: Roll Back if Needed

```bash
# Disable compiler via environment variable
ENABLE_REACT_COMPILER=false

# Or in code
import { disableCompiler } from '@/lib/react-compiler';
disableCompiler();
```

## Common Issues

### Issue: "ref.current is not supported"

**Problem**: You're accessing `ref.current` in your component.

**Solution**: Use `useState` for values that should trigger re-renders:
```typescript
// ❌ Before
const ref = useRef(0);
ref.current = 1;
console.log(ref.current);

// ✅ After
const [value, setValue] = useState(0);
setValue(1);
console.log(value);
```

### Issue: "Direct object mutation detected"

**Problem**: You're mutating objects directly.

**Solution**: Use immutable patterns:
```typescript
// ❌ Before
const obj = { a: 1, b: 2 };
obj.a = 3; // mutation!

// ✅ After
const obj = { a: 1, b: 2 };
const newObj = { ...obj, a: 3 }; // immutable!
```

### Issue: "Class component is not supported"

**Problem**: You're using a class component.

**Solution**: Convert to a function component:
```typescript
// ❌ Before
class MyComponent extends React.Component {
  render() {
    return <div>Hello</div>;
  }
}

// ✅ After
function MyComponent() {
  return <div>Hello</div>;
}
```

## API Reference

### Config

- `getConfigManager()` - Get configuration manager instance
- `getConfig()` - Get current configuration
- `enableCompiler()` - Enable React Compiler
- `disableCompiler()` - Disable React Compiler
- `toggleCompiler()` - Toggle React Compiler
- `checkFile(filePath)` - Check if a file should be compiled

### Diagnostics

- `createDiagnostics(projectRoot)` - Create diagnostics instance
- `scanDiagnostics(projectRoot, options)` - Scan project
- `getCompatibilitySummary(projectRoot, options)` - Get quick summary

### Performance

- `getPerformanceTracker()` - Get performance tracker instance
- `usePerformanceTracking(componentName)` - Hook for tracking
- `useRenderCount(componentName)` - Hook for render count
- `usePerformanceStats(componentName)` - Hook for stats

### Dashboard

- `CompilerDiagnostics` - Dashboard component

## Environment Variables

- `ENABLE_REACT_COMPILER` - Enable/disable compiler (default: false)
- `REACT_COMPILER_DEV` - Enable in development (default: false)
- `REACT_COMPILER_VERBOSE` - Verbose logging (default: false)
- `REACT_COMPILER_PERF` - Show performance metrics (default: false)

## Testing

```bash
# Run all tests
npm test src/lib/react-compiler

# Run specific test
npm test src/lib/react-compiler/__tests__/scanner.test.ts
```

## Expected Improvements

Based on v1.3.0 feasibility validation:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Unnecessary re-renders | ~150-200/min | ~90-120/min | 20-40% ↓ |
| UI response time | baseline | 15-25% faster | 15-25% ↑ |
| Memory usage | baseline | 10-15% less | 10-15% ↓ |

## Files Structure

```
src/lib/react-compiler/
├── diagnostics/
│   ├── scanner.ts           # Component scanner
│   ├── reporter.ts          # Report generator
│   └── index.ts             # Diagnostics export
├── config/
│   └── compiler.config.ts   # Configuration manager
├── performance/
│   └── tracker.ts          # Performance tracker
├── dashboard/
│   └── CompilerDiagnostics.tsx  # Dashboard UI
├── __tests__/
│   ├── scanner.test.ts      # Scanner tests
│   └── reporter.test.ts     # Reporter tests
└── index.ts                 # Main export
```

## Related Documentation

- [V140_PLANNING_20260329.md](../../V140_PLANNING_20260329.md) - v1.4.0 Planning
- [ADR-0009](../../docs/adr/ADR-0009-react-compiler-adoption.md) - Architecture Decision Record

## License

Internal project module.
