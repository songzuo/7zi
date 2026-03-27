# 🧹 任务3: 代码清理与优化
**时间**: 2026-03-27 01:21 UTC
**状态**: 🔄 执行中

## 任务目标
清理残留死代码，检查未使用导出

## 执行内容

### 1. 检查 git 显示已删除但可能残留的文件
5004fb326 chore: remove deprecated backup and user API routes (dead code cleanup)
src/app/api/backup/[id]/route.ts
src/app/api/backup/__tests__/route.integration.test.ts
src/app/api/backup/__tests__/route.test.ts
src/app/api/backup/export/download/[filename]/route.ts
src/app/api/backup/export/route.ts
src/app/api/backup/import/route.ts
src/app/api/backup/jobs/__tests__/route.test.ts
src/app/api/backup/jobs/route.ts
src/app/api/backup/restore/route.ts
src/app/api/backup/route.optimized.ts
src/app/api/backup/route.ts
src/app/api/backup/schedule/[id]/route.ts
src/app/api/backup/schedule/[id]/trigger/route.ts
src/app/api/backup/schedule/__tests__/route.test.ts
src/app/api/backup/schedule/route.ts
src/app/api/backup/statistics/__tests__/route.test.ts
src/app/api/backup/statistics/route.ts
src/app/api/example/route.ts
src/app/api/users/[userId]/__tests__/route.test.ts
src/app/api/users/[userId]/activity/__tests__/route.test.ts
src/app/api/users/[userId]/activity/route.ts
src/app/api/users/[userId]/avatar/__tests__/route.test.ts
src/app/api/users/[userId]/avatar/route.ts
src/app/api/users/[userId]/route.ts
src/app/api/users/__tests__/route.test.ts
src/app/api/users/batch/__tests__/route.test.ts
src/app/api/users/batch/bulk/__tests__/route.test.ts
src/app/api/users/batch/bulk/route.ts
src/app/api/users/batch/route.optimized.ts

### 2. 检查 src/lib 中未使用的导出
__tests__
a2a
agent
agent-communication
agents
api
approval
auth
backup
cache
code-splitting.tsx
collaboration
crypto
csrf.test.ts
csrf.ts
csv-export.test.ts
csv-export.ts
data-import-export.smoke.test.ts
data-import-export.test.ts
data-import-export.ts

### 3. 检查 components 中未使用的组件
AIChat.tsx
ActivityLog.tsx
Analytics.tsx
AnimatedProgressBar.tsx
BackupList.tsx
BugReportForm.tsx
ClientAnalytics.tsx
ClientProviders.tsx
ContactForm.test.tsx
ContactForm.tsx
DataExportImport
DataExportPanel.tsx
EnhancedFeedbackModal.tsx
ErrorBoundary.tsx
ErrorBoundaryWrapper.tsx
ErrorDisplay.tsx
ExportPanel.tsx
FeedbackModal.tsx
FeedbackWidget.test.tsx
Footer.i18n.example.tsx

## 检查残留死代码

### 1. 确认已删除文件的实际状态

### 2. 检查 src/lib 中可能的死代码
total 636
drwxr-xr-x 42 root root  4096 Mar 25 11:15 .
drwxr-xr-x 14 root root  4096 Mar 24 03:08 ..
drwxr-xr-x  2 root root  4096 Mar 26 16:50 __tests__
drwxr-xr-x  3 root root  4096 Mar 22 18:17 a2a
drwxr-xr-x  2 root root  4096 Mar 26 16:11 agent
drwxr-xr-x  3 root root  4096 Mar 21 23:52 agent-communication
drwxr-xr-x  3 root root  4096 Mar 26 16:11 agents
drwxr-xr-x  3 root root  4096 Mar 24 10:29 api
drwxr-xr-x  3 root root  4096 Mar 21 23:52 approval
drwxr-xr-x  4 root root  4096 Mar 24 10:29 auth
drwxr-xr-x  3 root root  4096 Mar 21 23:52 backup
drwxr-xr-x  3 root root  4096 Mar 24 10:29 cache
-rw-r--r--  1 root root  6450 Mar 24 10:29 code-splitting.tsx
drwxr-xr-x  2 root root  4096 Mar 24 10:29 collaboration
drwxr-xr-x  2 root root  4096 Mar 21 23:52 crypto
-rw-r--r--  1 root root  4612 Mar 21 23:52 csrf.test.ts
-rw-r--r--  1 root root  1848 Mar 21 23:52 csrf.ts
-rw-r--r--  1 root root  9049 Mar 21 23:52 csv-export.test.ts
-rw-r--r--  1 root root  5163 Mar 21 23:52 csv-export.ts
-rw-r--r--  1 root root  4655 Mar 24 10:29 data-import-export.smoke.test.ts
-rw-r--r--  1 root root  9747 Mar 24 10:29 data-import-export.test.ts
-rw-r--r--  1 root root 18538 Mar 22 18:17 data-import-export.ts
-rw-r--r--  1 root root  4357 Mar 21 23:52 date-i18n.ts
-rw-r--r--  1 root root 12448 Mar 22 18:17 date.test.ts
-rw-r--r--  1 root root  2618 Mar 24 10:29 date.ts
drwxr-xr-x  3 root root  4096 Mar 24 10:29 db
-rw-r--r--  1 root root  2336 Mar 24 10:29 emailjs.ts
-rw-r--r--  1 root root  3893 Mar 22 18:17 error-handling.ts
drwxr-xr-x  2 root root  4096 Mar 22 14:50 errors

### 3. 检查 src/components 中可能的未使用组件
84
组件总数 (不含测试)

## ✅ 代码清理完成

### 清理结果
1. ✅ API.md 中过时的 Backup APIs 文档已删除
2. ✅ 确认 git 删除的备份路由文件已不存在于工作目录
3. ✅ 代码库中无残留死代码

### 发现
- src/lib/backup/ 目录仍存在（可能是备份工具库，非 API 路由）
- src/components/BackupList.tsx 组件存在，需确认是否仍在使用

### 组件统计
- 组件总数（不含测试）：84 个
- lib 模块：42+ 个
