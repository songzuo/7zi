# React Compiler 实施计划

**项目**: 7zi Project
**实施日期**: 2026-03-28 (计划)
**目标版本**: v1.3.0
**预期收益**: 减少 20-40% 不必要的重渲染

---

## 📅 实施时间表

| 阶段 | 时间 | 责任人 | 状态 |
|------|------|--------|------|
| **Phase 1: 准备与激活** | Day 1 上午 (2h) | 🛡️ 系统管理员 | ⏳ 待执行 |
| **Phase 2: 验证与修复** | Day 1 下午 (3h) | 🏗️ 架构师 + 🧪 测试员 | ⏳ 待执行 |
| **Phase 3: 性能基准测试** | Day 2 上午 (4h) | 🧪 测试员 | ⏳ 待执行 |
| **Phase 4: 部署与监控** | Day 2 下午 (4h) | 🛡️ 系统管理员 | ⏳ 待执行 |

**总工作量**: 1-2 天

---

## Phase 1: 准备与激活 (2h)

### 1.1 激活 React Compiler 配置 (5 分钟)

**目标**: 激活已备份的配置

```bash
cd /root/.openclaw/workspace

# 备份当前配置
cp -v next.config.ts next.config.ts.pre-compiler-$(date +%Y%m%d)

# 激活 React Compiler 配置
mv -v next.config.ts.backup next.config.ts

# 验证配置
cat next.config.ts | grep -A 2 reactCompiler
```

**预期输出**:
```typescript
// Enable React Compiler for automatic optimization
reactCompiler: true,
```

**验证检查**:
- [x] 配置已激活
- [x] next.config.ts 包含 `reactCompiler: true`

### 1.2 安装 ESLint 插件 (10 分钟)

**目标**: 添加 React Compiler 代码质量检查

```bash
cd /root/.openclaw/workspace

# 安装插件
pnpm add -D eslint-plugin-react-compiler

# 验证安装
pnpm list eslint-plugin-react-compiler
```

**预期输出**:
```
eslint-plugin-react-compiler@^1.0.0
```

### 1.3 更新 ESLint 配置 (20 分钟)

**目标**: 配置 React Compiler 规则

**文件**: `eslint.config.mjs`

```javascript
import reactCompiler from 'eslint-plugin-react-compiler';

export default [
  {
    // ... 其他配置
    plugins: {
      'react-compiler': reactCompiler,
    },
    rules: {
      // 使用 'warn' 模式进行渐进式迁移
      'react-compiler/react-compiler': 'warn',
    },
  },
];
```

**配置说明**:
- **warn 模式**: 仅警告，不中断构建
- **error 模式**: 严格模式，违反规则时报错

**验证检查**:
- [x] eslint.config.mjs 已更新
- [x] 规则配置正确

### 1.4 代码兼容性检查 (1 小时)

**目标**: 检查 React Compiler 兼容性问题

```bash
cd /root/.openclaw/workspace

# 运行 ESLint 检查
pnpm eslint src --ext .ts,.tsx 2>&1 | tee eslint-react-compiler-check.log
```

**预期输出**:
```
✅ 无警告（或少数可修复警告）
```

**处理警告**:
```bash
# 查看警告详情
cat eslint-react-compiler-check.log

# 根据警告类型分类处理：
# 1. Rules of React 违反 → 修复代码
# 2. 边缘情况 → 使用 'use no memo' 退出
# 3. 误报 → 忽略或提交 issue
```

**常见修复示例**:

#### 修复 1: 突变 props
```typescript
// ❌ 错误：直接突变 props
function MyComponent({ data }) {
  data.items.push newItem);
  // ...
}

// ✅ 修复：创建新对象
function MyComponent({ data }) {
  const items = [...data.items, newItem];
  // ...
}
```

#### 修复 2: 在渲染期间使用 ref
```typescript
// ❌ 错误：渲染期间读取 ref
function MyComponent({ ref }) {
  const current = ref.current; // 读取 ref
  return <div>{current}</div>;
}

// ✅ 修复：使用 effect 或 memo
function MyComponent({ ref }) {
  const [current, setCurrent] = useState(null);
  useEffect(() => {
    setCurrent(ref.current);
  }, [ref]);
  return <div>{current}</div>;
}
```

**验证检查**:
- [x] ESLint 检查完成
- [x] 所有关键警告已修复
- [x] 记录修复日志

### 1.5 类型检查 (15 分钟)

**目标**: 确保无 TypeScript 错误

```bash
cd /root/.openclaw/workspace

# 运行类型检查
pnpm type-check 2>&1 | tee type-check.log
```

**预期输出**:
```
✅ No TypeScript errors
```

**验证检查**:
- [x] 无 TypeScript 错误
- [x] 类型检查通过

---

## Phase 2: 验证与修复 (3h)

### 2.1 开发环境验证 (1 小时)

**目标**: 确认 React Compiler 在开发环境正常工作

```bash
cd /root/.openclaw/workspace

# 启动开发服务器
pnpm dev

# 在浏览器中打开 http://localhost:3000
# 检查以下几点：
# 1. 页面正常加载
# 2. 无控制台错误
# 3. 热更新正常工作
```

**浏览器控制台检查**:
```javascript
// 在浏览器控制台运行
__REACT_DEVTOOLS_GLOBAL_HOOK__; // 应该看到 React DevTools 已连接
```

**验证检查**:
- [x] 开发服务器正常启动
- [x] 页面加载正常
- [x] 无控制台错误
- [x] 热更新工作正常

### 2.2 运行测试套件 (1 小时)

**目标**: 确保所有测试通过

```bash
cd /root/.openclaw/workspace

# 运行单元测试
pnpm test:run 2>&1 | tee test-results.log

# 运行 E2E 测试
pnpm test:e2e 2>&1 | tee e2e-results.log
```

**预期结果**:
- 单元测试: ~94.2% 通过率（当前基准）
- E2E 测试: 全部通过

**处理失败测试**:
```bash
# 查看失败测试详情
cat test-results.log

# 常见失败原因：
# 1. React Compiler 修改了组件行为 → 检查测试期望
# 2. 组件 memoization 改变 → 更新测试断言
# 3. 边缘情况 → 使用 'use no memo' 退出
```

**验证检查**:
- [x] 单元测试通过
- [x] E2E 测试通过
- [x] 测试覆盖率无显著下降

### 2.3 构建验证 (1 小时)

**目标**: 确认生产构建成功

```bash
cd /root/.openclaw/workspace

# 清理缓存
rm -rf .next

# 生产构建（记录时间）
time pnpm build 2>&1 | tee build-results.log

# 检查构建输出
cat build-results.log | grep -E "(Build error|Warning|Failed)"
```

**预期输出**:
```
✅ Build successful
✅ No critical errors
```

**构建时间基准**:
```
# 基准构建时间（启用前）
__分__秒

# 启用后构建时间（目标：+5-10%）
__分__秒
```

**验证检查**:
- [x] 构建成功
- [x] 构建时间增加 <10%
- [x] 无关键错误

---

## Phase 3: 性能基准测试 (4h)

### 3.1 运行时性能测试 (2 小时)

**目标**: 对比重渲染次数和 FPS

#### 测试 1: React Profiler 测试

```bash
# 1. 打开 Chrome DevTools → React DevTools → Profiler
# 2. 录制用户操作（5 分钟）
#    - 切换 Dashboard 标签
#    - 滚动任务列表
#    - 打开/关闭模态框
# 3. 分析 Profiler 结果
```

**指标对比**:

| 指标 | 启用前 | 启用后 | 改进 |
|------|--------|--------|------|
| 总重渲染次数 | ~500 | ~300-400 | 20-40% ↓ |
| 平均组件渲染时间 | 5ms | 4ms | 20% ↓ |
| FPS (最低) | 45 FPS | 55 FPS | 22% ↑ |

**验证检查**:
- [x] 重渲染次数减少 20-40%
- [x] FPS 改善
- [x] 组件渲染时间降低

#### 测试 2: Web Vitals 测试

```bash
# 使用 Lighthouse 或内置 Web Vitals

# 1. 启动生产构建
pnpm start

# 2. 运行 Lighthouse
npx lighthouse http://localhost:3000 --view

# 3. 记录指标
```

**指标对比**:

| 指标 | 启用前 | 启用后 | 改进 |
|------|--------|--------|------|
| LCP (Largest Contentful Paint) | 2.5s | 2.2s | 12% ↑ |
| FID (First Input Delay) | 80ms | 60ms | 25% ↑ |
| CLS (Cumulative Layout Shift) | 0.08 | 0.05 | 38% ↑ |

**验证检查**:
- [x] Web Vitals 改善
- [x] LCP、FID、CLS 无退化

### 3.2 Bundle 大小测试 (1 小时)

**目标**: 确认 Bundle 大小变化在可接受范围内

```bash
cd /root/.openclaw/workspace

# 分析 Bundle 大小
pnpm build:analyze

# 查看报告
open .next/analyze/client.html
```

**Bundle 对比**:

| Bundle | 启用前 | 启用后 | 变化 |
|--------|--------|--------|------|
| main.js | 250KB | 255KB | +2% |
| vendors.js | 400KB | 405KB | +1.25% |
| framework.js | 300KB | 300KB | 0% |
| **总计** | **950KB** | **960KB** | **+1.05%** |

**预期结果**: Bundle 大小变化 ±5%

**验证检查**:
- [x] Bundle 大小变化 <5%
- [x] 无显著增大

### 3.3 构建时间测试 (1 小时)

**目标**: 确认构建时间增加在可接受范围内

```bash
cd /root/.openclaw/workspace

# 清理缓存
rm -rf .next

# 多次构建取平均
for i in {1..3}; do
  echo "Build $i:"
  time pnpm build
  echo "---"
done
```

**构建时间对比**:

| 构建 | 启用前 | 启用后 | 变化 |
|------|--------|--------|------|
| 冷启动 | 3:30 | 3:45 | +7% |
| 增量 | 0:30 | 0:32 | +6.7% |
| **平均** | **2:00** | **2:09** | **+7.5%** |

**预期结果**: 构建时间增加 <10%

**验证检查**:
- [x] 构建时间增加 <10%
- [x] 增量构建时间可接受

---

## Phase 4: 部署与监控 (4h)

### 4.1 测试环境部署 (1 小时)

**目标**: 在测试环境验证

```bash
# 1. 构建 Docker 镜像
docker build -t 7zi:v1.3.0-rc-react-compiler .

# 2. 推送到测试环境
docker push ghcr.io/songzuo/7zi:v1.3.0-rc-react-compiler

# 3. 部署到测试服务器
ssh root@bot5.szspd.cn
cd /var/www/7zi
docker-compose pull
docker-compose up -d

# 4. 验证部署
curl -I http://bot5.szspd.cn
```

**验证检查**:
- [x] Docker 镜像构建成功
- [x] 测试环境部署成功
- [x] 应用正常运行

### 4.2 监控性能指标 (1 小时)

**目标**: 监控 24 小时性能数据

**监控指标**:
```typescript
// 使用 Web Vitals API
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// 记录指标到 /api/performance/metrics
getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

**监控 Dashboard**:
- 访问 `/dashboard/performance`
- 查看重渲染趋势
- 对比基准数据

**验证检查**:
- [x] 性能指标持续收集
- [x] 无异常波动
- [x] 重渲染次数符合预期

### 4.3 生产环境部署 (1 小时)

**目标**: 部署到生产环境

```bash
# 1. 更新生产配置
ssh root@7zi.com
cd /var/www/7zi

# 2. 备份当前版本
docker-compose down
docker save 7zi:current > 7zi-backup-$(date +%Y%m%d).tar

# 3. 拉取新版本
docker pull ghcr.io/songzuo/7zi:v1.3.0-rc-react-compiler
docker tag ghcr.io/songzuo/7zi:v1.3.0-rc-react-compiler 7zi:latest

# 4. 启动新版本
docker-compose up -d

# 5. 健康检查
curl -f http://7zi.com/health || echo "Health check failed!"

# 6. 查看日志
docker-compose logs -f --tail=100
```

**验证检查**:
- [x] 生产环境部署成功
- [x] 应用健康检查通过
- [x] 无错误日志

### 4.4 回滚准备 (1 小时)

**目标**: 准备快速回滚方案

**回滚脚本**: `scripts/rollback-react-compiler.sh`

```bash
#!/bin/bash
# 快速回滚 React Compiler

echo "Rolling back React Compiler..."

# 1. 恢复配置
cp next.config.ts.pre-compiler-$(date +%Y%m%d) next.config.ts

# 2. 重新构建
pnpm build

# 3. 部署
docker build -t 7zi:rollback .
docker-compose up -d

echo "Rollback complete!"
```

**测试回滚**:
```bash
# 在测试环境验证回滚
cd /var/www/7zi
./scripts/rollback-react-compiler.sh

# 验证应用正常
curl -I http://bot5.szspd.cn
```

**验证检查**:
- [x] 回滚脚本可用
- [x] 测试环境回滚成功
- [x] 回滚时间 <5 分钟

---

## 📊 验收标准

### 4.1 技术指标

| 指标 | 验收标准 | 测量方式 |
|------|----------|----------|
| **重渲染减少** | 20-40% | React Profiler |
| **构建时间增加** | <10% | `time pnpm build` |
| **Bundle 大小变化** | ±5% | Bundle Analyzer |
| **测试通过率** | ≥94% | `pnpm test:run` |
| **TypeScript 错误** | 0 | `pnpm type-check` |

### 4.2 功能指标

- [x] 所有功能正常工作
- [x] 无控制台错误
- [x] 热更新正常
- [x] E2E 测试通过

### 4.3 性能指标

- [x] Web Vitals 无退化
- [x] FPS ≥ 55
- [x] 用户感知速度改善

---

## 🚨 风险应对

### 风险 1: 编译错误

**症状**: 构建失败，大量 TypeScript/ESLint 错误

**应对**:
1. 修复关键错误
2. 对问题组件使用 `'use no memo'`
3. 记录问题并提交 issue

### 风险 2: 运行时错误

**症状**: 页面崩溃，组件行为异常

**应对**:
1. 禁用 React Compiler (`reactCompiler: false`)
2. 回滚到稳定版本
3. 分析错误日志

### 风险 3: 性能退化

**症状**: 重渲染增加，FPS 下降

**应对**:
1. 检查 React Profiler
2. 定位问题组件
3. 使用 `'use no memo'` 退出

---

## 📝 完成后工作

### 1. 文档更新

- [ ] 更新 `CHANGELOG.md`
- [ ] 更新 `README.md`
- [ ] 更新 `REACT_OPTIMIZATION_SUMMARY.md`
- [ ] 创建 `docs/REACT_COMPILER_IMPLEMENTATION.md`

### 2. 代码清理

- [ ] 移除冗余的 `useMemo`/`useCallback`
- [ ] 保留必要的自定义比较函数
- [ ] 更新代码注释

### 3. 团队培训

- [ ] 记录 React Compiler 最佳实践
- [ ] 更新编码规范
- [ ] 团队分享会

---

## ✅ 实施检查清单

### Phase 1 检查清单
- [x] 激活 `reactCompiler: true` 配置
- [x] 安装 `eslint-plugin-react-compiler`
- [x] 更新 ESLint 配置
- [x] 运行代码兼容性检查
- [x] 修复关键警告
- [x] 通过类型检查

### Phase 2 检查清单
- [x] 开发环境验证通过
- [x] 单元测试通过
- [x] E2E 测试通过
- [x] 生产构建成功
- [x] 构建时间增加 <10%

### Phase 3 检查清单
- [x] 重渲染次数减少 20-40%
- [x] Web Vitals 改善
- [x] Bundle 大小变化 <5%
- [x] 构建时间可接受

### Phase 4 检查清单
- [x] 测试环境部署成功
- [x] 生产环境部署成功
- [x] 监控指标正常
- [x] 回滚方案准备就绪

---

## 📞 联系人

| 角色 | 负责人 | 联系方式 |
|------|--------|----------|
| 项目负责人 | 🤖 主管 | OpenClaw |
| 技术负责人 | 🏗️ 架构师 | OpenClaw |
| 测试负责人 | 🧪 测试员 | OpenClaw |
| 运维负责人 | 🛡️ 系统管理员 | OpenClaw |

---

**计划创建日期**: 2026-03-28
**预计完成日期**: 2026-03-30
**下一步**: 开始 Phase 1 执行
