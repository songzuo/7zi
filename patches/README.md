# Code Quality Patches

This directory contains patches to fix code quality issues identified in the code quality report.

## Applying Patches

To apply these patches, run from the project root:

```bash
# Apply all patches
for patch in patches/*.patch; do git apply "$patch"; done

# Apply specific patch
git apply patches/001-fix-import-error.patch
```

Or use `patch` command if `git apply` is not available:

```bash
for patch in patches/*.patch; do patch -p1 < "$patch"; done
```

## Patches Overview

| # | Patch Name | Priority | Area | Description |
|---|------------|----------|------|-------------|
| 001 | Fix Import Error | P0 | Test | Remove non-existent imports from test file |
| 002 | Fix React Import | P0 | Component | Add missing `memo` import to FeedbackWidget |
| 003 | Add Admin Auth | P0 | API | Implement admin authentication for performance API |
| 004 | Implement Error Toast | P1 | Meeting | Add error toast notification for meeting errors |
| 005 | Implement Task Handlers | P1 | Tasks | Implement backend API calls for task management |

## Pre-Apply Checklist

- [ ] Ensure you have a clean working directory or create a branch
- [ ] Review each patch before applying
- [ ] Test after applying each patch or all together
- [ ] Run TypeScript compiler to verify fixes: `npx tsc --noEmit`
- [ ] Run tests to ensure nothing broke: `npm test`

## Post-Apply Steps

After applying all patches:

1. **Set up ADMIN_SECRET environment variable**
   ```bash
   # In .env.local
   ADMIN_SECRET=your-random-secret-here
   ```

2. **Test the admin authentication**
   ```bash
   curl -X DELETE http://localhost:3000/api/performance/clear \
     -H "Authorization: Bearer your-random-secret-here"
   ```

3. **Verify task management features**
   - Navigate to /tasks page
   - Try completing, assigning, archiving, and deleting tasks
   - Ensure all operations work and provide feedback

4. **Test meeting error handling**
   - Trigger a meeting error (e.g., invalid meeting ID)
   - Verify error toast appears

5. **Run TypeScript checks**
   ```bash
   npx tsc --noEmit --skipLibCheck
   ```

## Rollback

If you need to revert a patch:

```bash
# Using git (if patches were applied with git apply)
git checkout -- .

# Or reverse specific patch
git apply -R patches/001-fix-import-error.patch
```

## Notes

- **Patch 001**: Only fixes import statements. The test file may still have other issues that need manual review.
- **Patch 003**: Requires setting `ADMIN_SECRET` environment variable. Without it, the API will block all requests in production.
- **Patch 005**: Implements basic functionality. You may want to improve error handling and UX (e.g., replace alerts with proper modals).
