# TypeScript `any` Type Cleanup Report

**Generated:** 2026-04-03  
**Project Root:** `/root/.openclaw/workspace/`  
**Scope:** `src/` and `workflow-engine/` directories

---

## 📊 Summary Statistics

| Category | Count | Priority |
|----------|-------|----------|
| Total `: any` usage | **265** | - |
| Test files (`.test.ts`, `.spec.ts`, `__tests__/`) | 133 | Low (acceptable) |
| Plugin system (`src/lib/plugins/`) | 66 | Medium (plugin flexibility) |
| Non-test production code | 66 | **High** |
| Workflow Engine (`workflow-engine/`) | 47 | **High** |
| `any[]` usage | 25 | Medium |
| `as any` type assertions | 80 | Medium |
| `(...args: any[])` variadic functions | 19 | Low (acceptable) |

---

## 🎯 Priority Areas for Cleanup

### 1. High Priority - Core Business Logic

#### `src/lib/collab/` (12 instances)
Real-time collaboration module with untyped message data.

| File | Line | Current | Suggested Fix |
|------|------|---------|---------------|
| `server/server.ts` | 41, 48 | `data: any` | Define `CollabMessage` interface |
| `server/server.ts` | 428 | Returns `any` | Return `DocumentState` type |
| `client/client.ts` | 45, 51 | `data: any` | `message: CollabMessage` |
| `client/client.ts` | 293, 305, 366, 497 | Various `any` | Use typed interfaces |
| `index.ts` | 99 | `operation: any` | `operation: CollabOperation` |

#### `src/lib/ai/code/` (21 instances)
AI code analysis with untyped analysis results.

| File | Line | Issue |
|------|------|-------|
| `code-explainer.ts` | 151, 203, 409 | `analysis: any` → Define `CodeAnalysis` interface |
| `code-reviewer.ts` | 390 | `analysis: any` → Define `ReviewAnalysis` interface |
| `types.ts` | 556 | `result: any` → Generic type parameter |
| `task-parser-integration.ts` | Multiple | Untyped task, issues, fixes arrays |

#### `src/lib/message-queue/` (9 instances)
Message queue with untyped payload data.

| File | Line | Suggested Fix |
|------|------|---------------|
| `core/transaction.ts` | 33 | `data: any` → Generic `T` |
| `types.ts` | 425, 458, 514, 538, 552 | Define `MessagePayload` union type |
| `utils/monitor.ts` | 141 | `data: any` → `MonitorEventData` |
| `api/*.ts` | Various | Typed request/response interfaces |

#### `src/lib/audit-log/export-service.ts` (3 instances)
- Line 266, 365, 447: Event validation needs `AuditEvent` type

---

### 2. Medium Priority - Type Definitions

#### `workflow-engine/v111/src/types/workflow.types.ts` (7 instances)
Core workflow type definitions need strengthening.

| Line | Current | Suggested Fix |
|------|---------|---------------|
| 192 | `body?: any` | `body?: unknown` or JSON type |
| 215, 221 | `blocks?: any[]`, `params?: any[]` | Define specific block/param types |
| 248 | `value: any` | `value: unknown` with type guards |
| 334, 379, 413 | Various `any` | Use generics or union types |

#### `src/types/workflow.ts` (1 instance)
- Line 103: `formSchema: any` → Use JSON Schema type

---

### 3. Medium Priority - Workflow Engine Core

#### `workflow-engine/v111/src/engine/executors/index.ts` (12 instances)
Expression evaluator with heavy `any` usage.

| Pattern | Lines | Fix Strategy |
|---------|-------|--------------|
| Variable resolution | 185, 187, 343, 345 | `Record<string, unknown>` with type guards |
| Array operations | 196, 208, 219 | Generic `<T>` with constraints |
| Expression evaluation | 299, 228 | Return `unknown`, add runtime validation |
| Script execution | 163 | Type the execution context |

#### `workflow-engine/v111/src/queue/QueueManager.ts` (2 instances)
- Lines 79, 119: `data: any` → Generic `<T>`

---

### 4. Low Priority - Acceptable Uses

These patterns are acceptable and should remain:

#### Plugin System (`src/lib/plugins/`)
The 66 instances in plugins are **intentionally flexible**:
- Plugin hooks accept arbitrary payloads
- Plugin SDK provides generic utilities
- `(...args: any[])` for variadic console.log wrappers

#### Utility Functions
```typescript
// Acceptable - generic utility pattern
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T
export function throttle<T extends (...args: any[]) => any>(fn: T, delay: number): T
```
Locations: `src/lib/collab/utils/id.ts`, `src/lib/plugins/PluginSDK.ts`

#### Error Handling
```typescript
} catch (error: any) {
  // Acceptable for error.message access
}
```
Consider: Use `unknown` with type guard for stricter safety.

---

## 📝 Recommended Refactoring Strategy

### Phase 1: Core Interfaces (High Impact)
1. Define `CollabMessage` interface for collaboration module
2. Define `CodeAnalysis` interface for AI module
3. Define `MessagePayload` union type for message queue
4. Update `workflow.types.ts` with proper types

### Phase 2: Replace with `unknown`
For cases where type is truly dynamic:
```typescript
// Before
function process(data: any) { ... }

// After
function process(data: unknown) {
  if (isValidData(data)) {
    // narrowed type
  }
}
```

### Phase 3: Add Generics
For reusable components:
```typescript
// Before
interface QueueItem {
  data: any;
}

// After
interface QueueItem<T = unknown> {
  data: T;
}
```

---

## 🔍 Files Requiring Immediate Attention

| File | Any Count | Severity | Action |
|------|-----------|----------|--------|
| `src/lib/collab/client/client.ts` | 7 | High | Define message types |
| `src/lib/ai/code/task-parser-integration.ts` | 12 | High | Type analysis results |
| `workflow-engine/v111/src/engine/executors/index.ts` | 12 | Medium | Use generics + unknown |
| `src/lib/message-queue/types.ts` | 5 | Medium | Define payload types |
| `workflow-engine/v111/src/types/workflow.types.ts` | 7 | Medium | Core type definitions |

---

## 📈 Estimated Effort

| Effort Level | Files | Estimated LOC Change |
|--------------|-------|---------------------|
| Small (< 1hr) | 8 files | ~50 lines |
| Medium (1-3hr) | 12 files | ~150 lines |
| Large (3+ hr) | 6 files | ~100 lines |

**Total estimated effort:** 8-12 hours for high-priority items.

---

## ⚠️ Risks and Considerations

1. **Breaking Changes:** Some `any` removals may require updating call sites
2. **Plugin Compatibility:** Plugin system should retain flexibility
3. **Test Coverage:** Ensure tests pass after type changes
4. **Runtime Validation:** Moving from `any` to `unknown` requires type guards

---

## 🚀 Quick Wins

These can be fixed immediately with low risk:

1. `src/types/workflow.ts:103` - `formSchema: any` → `formSchema: Record<string, unknown>`
2. `src/lib/audit-log/export-service.ts` - Event types already exist, just reference them
3. `workflow-engine/v111/src/queue/QueueManager.ts` - Add generic `<T>`

---

## Conclusion

The project has **265 instances** of `any` type usage. After excluding test files (133) and intentionally flexible plugin code (66), **66 instances in production code** and **47 in workflow-engine** require attention.

**Recommended priority order:**
1. Collaboration module (`src/lib/collab/`)
2. AI code module (`src/lib/ai/code/`)
3. Workflow types (`workflow-engine/v111/src/types/`)
4. Message queue types (`src/lib/message-queue/`)

This will improve type safety, enable better IDE support, and catch more errors at compile time.
