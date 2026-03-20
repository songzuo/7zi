# 7zi-Project Cleanup Report
**Generated:** 2026-03-20
**Scope:** Orphaned/stale files and code cleanup

---

## Executive Summary

Found **67** untracked files in root, **150+** untracked files total. Identified multiple categories of cleanups:
- Temporary test files (10+ files)
- Build logs (10+ files, 30MB)
- Duplicate optimized agent files (6 files)
- Generated reports (50+ files)
- Demo/experimental code (3 directories)
- Docker duplicates (3 files)

---

## 🔴 HIGH PRIORITY - Safe to Remove

### 1. Temporary Test Files (Root Directory)
**Size:** ~6.6MB
**Files:**
- `test-output.txt` (3.3MB)
- `test-output-full.txt` (3.3MB)
- `test-api-performance.sh`
- `test-websocket.sh`
- `test-sse.sh`
- `test-optimization.js` (12K)
- `test-optimization.db` (2.6MB)
- `test-darkmode.mjs` (7KB)
- `test-debug.js` (1.1KB)
- `test-deepclone-performance.ts` (9KB)

**Reason:** These are temporary test artifacts, test database, and one-off scripts.

---

### 2. Build Log Files
**Size:** ~15KB
**Files:**
- `build-log.txt`
- `build-final.log`
- `build-output-fixed.log`
- `build-production-fixed.log`
- `build-output-current.log`
- `build-output.log`
- `build-production.log`
- `build-mobile-final.log`
- `build-mobile-viewport-test.log`
- `build-analyze.log`
- `build-performance-analysis.log`

**Reason:** Build logs should be gitignored. Already in `.gitignore` as `*.log`.

---

### 3. Generated HTML Build Artifacts
**Size:** ~1.1MB
**Directories:**
- `html/` (212KB)
- `7zi-frontend/html/` (1.1MB)
  - Contains: index.html, favicon files, bg.png, coverage/, assets/, html.meta.json.gz

**Reason:** Static build output artifacts. Should be in `.next/` or `.vercel/` directories.

---

### 4. Duplicate Agent Files (Optimized Versions)
**Size:** ~90KB (6 files)
**Files:**
- `src/lib/agents/repository-optimized.ts` (18K)
- `src/lib/agents/repository-optimized-v2.ts` (19K)
- `src/lib/agents/wallet-repository-optimized.ts` (18K)
- `src/lib/agents/wallet-repository-optimized-v2.ts` (19K)
- `src/lib/agents/auth-service-optimized.ts` (8.1K)
- `src/lib/agents/index-optimized.ts` (1.3K)

**Analysis:**
- Original files: `repository.ts`, `wallet-repository.ts`, `auth-service.ts`
- Optimized files add caching and N+1 query optimization
- **NOT currently used** - checked imports in middleware.ts and src/app/api/auth/
- Only used in test files: `src/lib/db/__tests__/optimization.test.ts`

**Recommendation:** Archive to `docs/archived/` or remove if not needed.

---

### 5. Demo/Experimental Code
**Size:** ~20KB
**Directories:**
- `src/app/collaboration-demo/` - page.tsx (13KB)
- `src/app/sse-demo/` - page.tsx (5.8KB)
- `src/app/collaboration/` - entire directory

**Reason:** Demo/prototype code not in production use.

---

### 6. Duplicate Dockerfiles
**Size:** ~6KB
**Files:**
- `Dockerfile.optimized` (2.7KB)
- `Dockerfile.production` (2.2KB)
- `Dockerfile.static` (1.3KB)

**Reason:** Experimental variants. Keep only `Dockerfile` and any production version if actively used.

---

## 🟡 MEDIUM PRIORITY - Review Before Archiving

### 7. Generated Reports in Root
**Size:** ~250KB
**Files:**
- `TEST_FAILURES.md` (21KB)
- `TEST_FIXES.md` (2.7KB)
- `DB_MOCK_FIX_STATUS.md` (4.2KB)
- Plus 50+ other markdown reports:
  - `API_ERROR_HANDLING_AUDIT.md`
  - `API_PERFORMANCE_QUICK_START.md`
  - `AUDIT_ANALYTICS_HEALTHDASHBOARD.md`
  - `CODE_OPTIMIZATION_ROUND2.md`
  - `OPTIMIZATION_GUIDE.md`
  - `PERFORMANCE_OPTIMIZATION_IMPLEMENTATION_GUIDE.md`
  - etc.

**Recommendation:** Move to `docs/reports/` or `docs/archive/` for reference.

---

### 8. Reports Directory
**Size:** 676KB, ~30 files
**Examples:**
- `reports/BUG_FIX_REPORT.md` (18KB)
- `reports/BUG_FIX_AUTH_SESSION_REPORT.md` (12KB)
- `reports/DATABASE_OPTIMIZATION_REPORT.md` (16KB)
- `reports/TEST_ANALYSIS.md`
- `reports/DEPLOYMENT-READY.md`
- Many completion/summary reports

**Recommendation:** Keep as historical record, but consider archiving older reports (pre-2026-03-15).

---

### 9. Test Coverage Artifacts
**Size:** ~200KB
**Files:**
- `coverage-a2a.json`
- `7zi-frontend/html/coverage/` directory

**Reason:** Test coverage data, should be in `.gitignore`.

---

## 🟢 LOW PRIORITY - Keep or Minor Cleanup

### 10. Environment Test Configuration
**File:** `.env.test` (913 bytes)
- Contains test database paths, mock GitHub token
- Should be kept as it's useful for testing

---

### 11. Deploy Scripts Cluster
**Directory:** `deploy-scripts/cluster/`
- Contains: docker-compose.cluster.yml, nginx/, redis/, scripts/, config/
- Appears to be production deployment configuration
- **Keep** if actively used for deployment

---

### 12. GitHub CI/CD Workflows
**Files:**
- `.github/workflows/ci-optimized.yml`
- `.github/workflows/security-scan.yml`
- `.github/dependabot.yml`

**Status:** Untracked but likely useful
- Should be added to git if part of CI/CD setup

---

## 📊 Cache Analysis - No Duplication Found

### Cache Implementation Comparison

**src/lib/db/cache.ts** (25KB)
- Advanced database query cache
- LRU + TTL + memory tracking
- Used by: optimized repositories, health API
- Purpose: Database query result caching

**src/lib/cache/lru-cache.ts** (4.7KB)
- Simple LRU cache implementation
- Used by: search-filter.ts, performance API
- Purpose: General-purpose caching

**src/lib/cache/CacheManager.ts** (4.3KB)
- Cache manager wrapper
- Used by: performance/clear route
- Purpose: Cache lifecycle management

**Conclusion:** These serve different purposes, not duplicates. Keep all.

---

## 🎯 Cleanup Recommendations Summary

### Immediate Actions (Safe)
1. ✅ Remove test-* files from root (~6.6MB)
2. ✅ Remove all *.log files (~15KB)
3. ✅ Remove html/ and 7zi-frontend/html/ directories (~1.1MB)
4. ✅ Move root-level *.md reports to docs/reports/ (~250KB)
5. ✅ Remove demo directories (~20KB)

### Review & Decide
1. 🔶 Archive or remove optimized agent files (~90KB)
   - Not currently imported in production code
   - Only used in tests
   - Decide if optimization is needed or keep originals

2. 🔶 Remove duplicate Dockerfiles (~6KB)
   - Keep only actively used versions

3. 🔶 Archive old reports in reports/ directory
   - Keep recent ones, archive pre-2026-03-15

### Add to .gitignore
1. ✅ `test-*.db`
2. ✅ `test-*.txt`
3. ✅ `test-*.sh`
4. ✅ `html/`
5. ✅ `coverage-a2a.json`

### Add to Git
1. 🔶 `.github/workflows/ci-optimized.yml`
2. 🔶 `.github/workflows/security-scan.yml`
3. 🔶 `.github/dependabot.yml`

---

## 📈 Potential Space Savings

**Immediate:** ~8MB
- Test files: 6.6MB
- Build artifacts: 1.1MB
- Reports moved: 0.3MB

**After review:** ~0.1MB additional
- Optimized agent files: 90KB
- Duplicate Dockerfiles: 6KB
- Demo code: 20KB

---

## 🛠️ Cleanup Script Available

See `cleanup-legacy-files.sh` for automated cleanup of safe-to-remove items.
Run with: `bash cleanup-legacy-files.sh`

**Warning:** Review script before running. Contains dry-run mode by default.
