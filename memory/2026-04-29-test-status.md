# 7zi-frontend 测试状态报告

**日期**: 2026-04-29
**测试员**: 测试员子代理

## 测试运行状态

### 单元测试 (vitest)

| 测试文件 | 总数 | 通过 | 失败 | 耗时 |
|---------|------|------|------|------|
| `src/app/dashboard/AgentStatusPanel.test.tsx` | 24 | 21 | **3** | 7683ms |
| `tests/features/audio-whisper.test.ts` | 19 | 18 | **1** | 5270ms |

**失败测试详情**:

1. **AgentStatusPanel.test.tsx** - 3个失败:
   - `应该渲染所有 agent 卡片` (retry x1)
   - `应该显示 agent 名称` (retry x1)
   - `应该支持搜索功能` (retry x1, 耗时6090ms)

2. **audio-whisper.test.ts** - 1个失败:
   - `应该在达到最大重试次数后放弃` (retry x1, 耗时2016ms)

**stderr 警告**:
- `HTMLMediaElement.prototype.play` 在 jsdom 中未实现（影响 STTRouter 测试）
- Whisper 请求重试相关的警告日志

## 构建状态

**pnpm build**: ✅ **成功** (exit code 0)

构建输出包含所有主要页面（dashboard, agents, rooms, pricing 等），共有 53+ 路由预渲染/动态渲染成功。

## 总结

- **测试**: 43 个测试运行，4 个失败 (约 90.7% 通过率)
- **构建**: ✅ 成功
- **建议**: 检查 AgentStatusPanel 的搜索/渲染逻辑，以及重试机制测试的超时设置