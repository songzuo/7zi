# 📋 今日工作计划 - 2026-03-09

**项目经理**: AI Project Manager  
**日期**: 2026-03-09 (周一)  
**工作时长**: 预计 8-10 小时

---

## 🎯 今日优先级总览

| 优先级 | 任务 | 预计工时 | 状态 |
|--------|------|----------|------|
| **P0** | CI/CD 替代方案 (Gitea Actions) | 4-6h | 🔴 待开始 |
| **P1** | 测试覆盖率提升至 80% | 3-4h | 🟡 进行中 |
| **P2** | TypeScript 错误修复 (14个) | 2-3h | 🟡 待开始 |

---

## 📊 当前项目状态

### TypeScript 错误清单 (14 个)

| # | 文件 | 错误类型 | 难度 |
|---|------|----------|------|
| 1 | `src/app/api/logs/route.ts:37` | LogCategory 类型不匹配 | 简单 |
| 2 | `src/lib/agents/evomap-gateway.ts:216` | 类型不匹配 | 中等 |
| 3-4 | `src/lib/agents/knowledge-evolution.ts:219-221` | 算术操作类型错误 | 简单 |
| 5 | `src/lib/cache/redis-cache.ts:102` | 缺少 ioredis 模块 | 中等 |
| 6 | `src/lib/errors/index.ts:460` | 类型转换错误 | 简单 |
| 7 | `src/test/components/SearchModal.test.tsx:244` | 属性不存在 | 简单 |
| 8-9 | `src/test/security/security-verification.test.ts:299-300` | 参数类型不匹配 | 简单 |
| 10-12 | `src/test/tasks/*.test.tsx` | 模块找不到 (3个文件) | 中等 |
| 13 | `vitest.config.ts:15` | 配置属性错误 | 简单 |

### 测试覆盖率现状
- **测试文件**: 213+ 个
- **当前覆盖率**: ~60-70%
- **目标覆盖率**: 80%

---

## 📅 时间安排

### 上午 (08:00 - 12:00) - P0 优先

#### 🔄 CI/CD 替代方案实施 (Gitea Actions)

**背景**: 需要为项目配置 CI/CD 流水线，使用 Gitea Actions 作为替代方案。

**任务拆解**:
1. **调研 Gitea Actions 配置** (30min)
   - 查阅 Gitea Actions 文档
   - 了解工作流语法和最佳实践

2. **创建工作流文件** (1h)
   - `.gitea/workflows/ci.yml` - 主 CI 流水线
   - `.gitea/workflows/deploy.yml` - 部署流水线
   - `.gitea/workflows/test.yml` - 测试流水线

3. **配置构建步骤** (1h)
   - Node.js 环境配置
   - 依赖安装缓存策略
   - 构建命令配置

4. **配置测试步骤** (1h)
   - 单元测试运行 (Vitest)
   - E2E 测试运行 (Playwright)
   - 覆盖率报告生成

5. **配置部署步骤** (1h)
   - 构建产物部署
   - 环境变量配置
   - 通知集成

**预期产出**:
- 完整的 CI/CD 流水线配置
- 自动化测试和部署流程
- 文档说明

---

### 下午 (14:00 - 18:00) - P1 & P2

#### 🧪 测试覆盖率提升 (P1)

**任务拆解**:
1. **运行覆盖率报告** (15min)
   ```bash
   npm run test:coverage
   ```

2. **识别低覆盖模块** (30min)
   - 分析覆盖率报告
   - 列出覆盖率 < 70% 的模块

3. **补充测试用例** (2-3h)
   - 优先覆盖关键业务逻辑
   - 补充边界条件测试
   - 增加错误处理测试

**目标模块**:
- `src/lib/agents/` - AI 代理相关
- `src/lib/utils/` - 工具函数
- `src/components/` - 核心组件

---

#### 🔧 TypeScript 错误修复 (P2)

**快速修复清单**:

```typescript
// 1. src/app/api/logs/route.ts:37
// 修复: 添加类型断言或类型守卫
const categories = (query.categories as LogCategory[]) || undefined;

// 2. src/lib/agents/evomap-gateway.ts:216
// 修复: 更新状态类型定义

// 3-4. src/lib/agents/knowledge-evolution.ts:219-221
// 修复: 初始化变量为数字类型
let evolutionCount: number = 0;

// 5. src/lib/cache/redis-cache.ts:102
// 修复: 安装 ioredis 或添加类型存根
npm install ioredis
# 或
npm install @types/ioredis --save-dev

// 6. src/lib/errors/index.ts:460
// 修复: 使用 unknown 中间转换
const httpError = error as unknown as { status: number; statusText: string };

// 7. src/test/components/SearchModal.test.tsx:244
// 修复: 更新测试对象类型定义

// 8-9. src/test/security/security-verification.test.ts:299-300
// 修复: 添加缺失的必需属性
const mockUser = { role: 'admin', sub: '123', email: 'test@example.com' };

// 10-12. src/test/tasks/*.test.tsx
// 修复: 检查模块路径或创建缺失的组件

// 13. vitest.config.ts:15
// 修复: 移除或更正 minWorkers 配置
```

---

## 📋 详细任务清单

### P0: CI/CD 实施

- [ ] 创建 `.gitea/workflows/` 目录结构
- [ ] 编写 `ci.yml` 工作流文件
  - [ ] 配置触发条件 (push, pull_request)
  - [ ] 配置 Node.js 环境
  - [ ] 配置依赖缓存
  - [ ] 配置 lint 检查
  - [ ] 配置类型检查
  - [ ] 配置单元测试
- [ ] 编写 `test.yml` 工作流文件
  - [ ] 配置 E2E 测试
  - [ ] 配置覆盖率报告
- [ ] 编写 `deploy.yml` 工作流文件
  - [ ] 配置构建步骤
  - [ ] 配置部署目标
  - [ ] 配置通知
- [ ] 测试 CI/CD 流水线
- [ ] 编写文档说明

### P1: 测试覆盖率

- [ ] 运行覆盖率报告
- [ ] 分析覆盖率数据
- [ ] 补充测试用例
  - [ ] 工具函数测试
  - [ ] 组件测试
  - [ ] API 路由测试
- [ ] 验证覆盖率达到 80%

### P2: TypeScript 错误

- [ ] 修复 `src/app/api/logs/route.ts` 类型错误
- [ ] 修复 `src/lib/agents/evomap-gateway.ts` 类型错误
- [ ] 修复 `src/lib/agents/knowledge-evolution.ts` 类型错误
- [ ] 解决 `src/lib/cache/redis-cache.ts` ioredis 问题
- [ ] 修复 `src/lib/errors/index.ts` 类型转换
- [ ] 修复测试文件类型错误 (4个文件)
- [ ] 修复 `vitest.config.ts` 配置错误
- [ ] 验证 `npm run type-check` 通过

---

## 🚀 执行策略

### 并行任务分配

建议使用子代理系统并行处理:

1. **子代理 A**: CI/CD 流水线配置 (上午)
2. **子代理 B**: 测试覆盖率补充 (下午)
3. **主代理**: TypeScript 错误修复 (穿插进行)

### 检查点

| 时间 | 检查项 |
|------|--------|
| 10:00 | CI/CD 工作流文件创建完成 |
| 12:00 | CI/CD 基础配置完成，提交初版 |
| 15:00 | 测试覆盖率提升至 75%+ |
| 17:00 | TypeScript 错误减少至 5 个以下 |
| 18:00 | 所有任务完成，提交最终版本 |

---

## ⚠️ 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Gitea Actions 文档不完善 | 延迟 CI/CD 配置 | 参考 GitHub Actions 文档，语法相似 |
| 测试覆盖率目标过高 | 时间不足 | 优先核心模块，逐步提升 |
| TypeScript 错误依赖复杂 | 修复困难 | 逐个分析，必要时重构 |
| ioredis 模块缺失 | 影响缓存功能 | 安装依赖或使用内存缓存替代 |

---

## 📈 成功指标

- [ ] CI/CD 流水线配置完成并成功运行
- [ ] 测试覆盖率 ≥ 80%
- [ ] TypeScript 错误 = 0
- [ ] `npm run type-check` 通过
- [ ] `npm run test:run` 通过
- [ ] `npm run build` 成功

---

## 📝 备注

- 优先完成 P0 任务，确保 CI/CD 基础设施就绪
- P1 和 P2 可以穿插进行，根据实际情况调整
- 记录遇到的问题和解决方案到 `memory/2026-03-09.md`

---

**计划制定时间**: 2026-03-09 04:54 GMT+1  
**计划执行人**: AI 项目经理 + 子代理团队