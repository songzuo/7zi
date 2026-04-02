# 测试状态报告

**生成时间**: 2026-03-27 08:20 GMT+1

## 测试运行摘要

Vitest 运行测试，配置为单进程串行执行（`poolOptions.forks.singleFork: true`）以减少内存占用。

## 测试结果

### 通过的测试文件

- `tests/lib/retry-decorator.test.ts` - 大部分通过
- `tests/components/__tests__/notifications.test.tsx` - 大部分通过
- `src/hooks/useGitHubData.test.ts` - 部分通过

### 失败的测试 (6 个)

| 测试名称                                       | 文件                    | 原因                             |
| ---------------------------------------------- | ----------------------- | -------------------------------- |
| should stop retrying after maxRetries attempts | retry-decorator.test.ts | **超时** - 60秒内未完成          |
| should add jitter to delays by default         | retry-decorator.test.ts | **超时** - 60秒内未完成          |
| 应该成功获取 Issues、Commits 和 Stats          | useGitHubData.test.ts   | **超时** - GitHub API 调用未完成 |
| 应该构建正确的 API URL                         | useGitHubData.test.ts   | **超时** - GitHub API 调用未完成 |
| should auto-dismiss after timeout              | notifications.test.tsx  | **超时** - 自动关闭机制未触发    |
| should add notification through context        | notifications.test.tsx  | **超时** - Context 更新未完成    |

### 警告

`useGitHubData.test.ts` 存在 `act()` 警告 - React 状态更新未包装在 act() 中，需要修复测试文件。

## 问题分析

### 1. 超时问题

- 测试配置了 60 秒超时（`testTimeout: 60000`）
- 失败的测试在 120 秒（重试一次）后仍未完成
- 可能原因：
  - 重试装饰器测试：重试逻辑可能导致指数退避时间过长
  - GitHub API 测试：网络请求未 mock 或 mock 失效
  - Notification 测试：定时器/异步状态更新未正确处理

### 2. React Testing Warning

`useGitHubData.test.ts` 中多次出现 `act()` 警告，说明异步状态更新测试需要使用 `waitFor` 或 `act()` 包装。

## 建议

1. **修复 act() 警告** - 在 `useGitHubData.test.ts` 中用 `act()` 包装状态更新
2. **增加超时时间** - 将 `testTimeout` 从 60000 增加到 120000
3. **Mock 网络请求** - GitHub API 测试应使用 msw 或 jest mock
4. **检查重试逻辑** - `retry-decorator` 的 `maxRetries` 测试需要确认延迟配置正确

## 覆盖率

运行 `npm test -- --coverage` 时因内存和超时问题未能完成覆盖率报告。建议单独运行覆盖率命令：

```bash
npm test -- --coverage --run
```
