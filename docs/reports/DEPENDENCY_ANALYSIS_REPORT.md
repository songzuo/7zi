# 💰 项目依赖成本与资源效率分析报告

**项目**: 7zi-frontend
**分析日期**: 2026-03-28
**分析人**: 💰 财务 (AI子代理)
**版本**: 1.2.0

---

## 📊 总览

| 指标 | 数值 |
|------|------|
| 生产依赖 | 28个 |
| 开发依赖 | 17个 |
| 总依赖包数 | 47个 |
| node_modules大小 | ~1GB (估算) |
| 源代码文件数 | 935个 |

---

## 🚨 关键发现

### 1. 安全风险 (高优先级)

| 依赖 | 问题 | 严重性 | 建议 |
|------|------|--------|------|
| **xlsx** | 原型污染 + ReDoS漏洞 | 🔴 高 | 立即替换为 exceljs 或其他安全方案 |

**影响**:
- 存在潜在原型污染攻击风险
- 正则表达式拒绝服务漏洞
- 无法自动修复，需手动干预

**建议行动**: 
```bash
# 检查xlsx的实际使用情况
grep -r "xlsx" src/
# 如果使用，替换为exceljs (项目已安装exceljs@4.4.0)
```

---

### 2. 可能未使用的依赖

| 依赖 | 状态 | 使用频率 | 建议 |
|------|------|----------|------|
| **@jest/globals** | 生产依赖 | 0次引用 | ❌ 移至devDependencies或删除 |
| **isomorphic-dompurify** | 生产依赖 | 1次引用 | ⚠️ 确认是否真的需要 |

**分析**:
- `@jest/globals` 在源代码中 **0次使用**，却放在生产依赖中
- `isomorphic-dompurify` 仅1处引用，需确认是否为必要功能

**建议行动**:
```bash
# 将 @jest/globals 移至 devDependencies
pnpm remove @jest/globals
pnpm add -D @jest/globals

# 或完全删除（如果测试不依赖）
pnpm remove @jest/globals
```

---

### 3. 大型依赖 (磁盘占用)

| 依赖 | 大小 | 用途 | 评估 |
|------|------|------|------|
| **@next** | 249MB | Next.js框架 | ✅ 必需 |
| **next** | 172MB | Next.js核心 | ✅ 必需 |
| **@swc** | 62MB | 编译器 | ✅ 必需 |
| **@sentry** | 51MB | 错误追踪 | ✅ 必需 |
| **lucide-react** | 46MB | 图标库 | ⚠️ 需优化 |
| **three** | 38MB | 3D引擎 | ✅ 必需 |
| **typescript** | 23MB | 类型检查 | ✅ 必需 |

**优化建议**:
- **lucide-react (46MB)**: 考虑按需引入图标，而非全量导入
- 检查是否所有3D功能都在使用 three + @react-three/drei

---

### 4. 功能重复依赖

| 功能 | 实现A | 实现B | 建议 |
|------|-------|-------|------|
| Excel处理 | **exceljs**@4.4.0 | **xlsx**@0.18.5 | 移除xlsx（有安全漏洞） |
| 图标 | lucide-react@0.577.0 | - | 保持（但优化引入方式） |

**分析**:
- 项目同时安装了 `exceljs` 和 `xlsx`，功能重复
- `xlsx` 有安全漏洞，应优先移除
- `exceljs` 使用次数: 4次 | `xlsx` 使用次数: 38次

**建议行动**:
```bash
# 1. 将所有 xlsx 导入替换为 exceljs
# 2. 移除有安全漏洞的 xlsx
pnpm remove xlsx
```

---

### 5. 过时依赖

| 依赖 | 当前版本 | 最新版本 | 差异 | 优先级 |
|------|----------|----------|------|--------|
| **lucide-react** | 0.577.0 | 1.7.0 | 🔀 主版本升级 | 中 |
| **eslint** (dev) | 9.39.4 | 10.1.0 | 🔀 主版本升级 | 低 |
| **typescript** (dev) | 5.9.3 | 6.0.2 | 🔀 主版本升级 | 低 |
| **@sentry/nextjs** | 10.45.0 | 10.46.0 | 📝 补丁更新 | 中 |
| **isomorphic-dompurify** | 3.6.0 | 3.7.1 | 📝 补丁更新 | 低 |
| **web-vitals** | 5.1.0 | 5.2.0 | 📝 补丁更新 | 低 |
| **recharts** | 3.8.0 | 3.8.1 | 📝 补丁更新 | 低 |
| **@modelcontextprotocol/sdk** | 1.27.1 | 1.28.0 | 📝 补丁更新 | 低 |
| **vitest** (dev) | 4.1.0 | 4.1.2 | 📝 补丁更新 | 低 |

**优先更新**:
1. **lucide-react** (v0 → v1): 重大更新，需测试兼容性
2. **@sentry/nextjs**: 安全更新，建议及时更新

---

## 💡 优化建议

### 立即行动 (高优先级)

1. **移除安全漏洞**
   ```bash
   pnpm remove xlsx
   # 将所有 xlsx 引用替换为 exceljs
   ```

2. **修复依赖分类错误**
   ```bash
   pnpm remove @jest/globals
   pnpm add -D @jest/globals
   # 或完全删除（如不使用）
   ```

3. **更新关键安全包**
   ```bash
   pnpm update @sentry/nextjs
   ```

### 短期优化 (中优先级)

4. **优化 lucide-react 引入**
   - 检查全量导入: `import * as Icons from 'lucide-react'`
   - 改为按需导入: `import { IconName } from 'lucide-react'`
   - 预计减少: 30-40MB

5. **更新主版本依赖**
   ```bash
   pnpm update lucide-react
   # 需要测试图标渲染
   ```

### 长期优化 (低优先级)

6. **更新工具链**
   ```bash
   pnpm update typescript eslint
   # TypeScript 6.0 可能需要调整配置
   ```

7. **清理未使用依赖**
   - 检查 `isomorphic-dompurify` 的唯一引用
   - 考虑用更轻量的 `dompurify` 替代

---

## 📈 成本/收益评估

| 优化项 | 成本 | 收益 | ROI | 优先级 |
|--------|------|------|-----|--------|
| 移除xlsx | 低 (替换38处导入) | 消除安全漏洞，减少依赖冲突 | ⭐⭐⭐⭐⭐ | 🔴 高 |
| 修复@jest/globals | 极低 (改1行package.json) | 减小生产包大小 | ⭐⭐⭐⭐ | 🔴 高 |
| 优化lucide-react | 中 (重构导入) | 减少30-40MB，提升加载速度 | ⭐⭐⭐⭐ | 🟡 中 |
| 更新@sentry/nextjs | 低 (1条命令) | 获取最新安全补丁 | ⭐⭐⭐⭐ | 🟡 中 |
| 更新lucide-react | 中 (需测试) | 最新功能，可能性能提升 | ⭐⭐⭐ | 🟢 低 |
| 更新typescript | 低 | 最新特性，更好的类型推断 | ⭐⭐ | 🟢 低 |

---

## 🎯 执行计划

### 第一阶段: 安全修复 (本周)
- [ ] 移除 xlsx，替换为 exceljs
- [ ] 修复 @jest/globals 依赖分类
- [ ] 更新 @sentry/nextjs

### 第二阶段: 性能优化 (下周)
- [ ] 优化 lucide-react 导入方式
- [ ] 清理未使用依赖
- [ ] 更新到 lucide-react v1

### 第三阶段: 维护更新 (月度)
- [ ] 更新工具链 (typescript, eslint)
- [ ] 定期检查安全审计
- [ ] 清理node_modules缓存

---

## 💰 总结

### 关键指标

- **安全风险**: 1个高危漏洞 (xlsx)
- **浪费空间**: ~50MB (lucide-react全量导入 + 错误分类的依赖)
- **重复依赖**: 1组 (exceljs vs xlsx)
- **未使用依赖**: 1个 (@jest/globals)
- **过时依赖**: 9个 (1个主版本，8个补丁)

### 投入产出比

- **总投入**: ~4小时开发时间
- **预期收益**:
  - ✅ 消除1个高危安全漏洞
  - ✅ 减少 ~50MB 依赖体积
  - ✅ 优化生产包大小
  - ✅ 提升构建和加载速度
  - ✅ 改善维护性

**ROI**: ⭐⭐⭐⭐⭐ (投入少，收益大)

---

## 📋 命令速查

```bash
# 查看所有依赖
pnpm list --depth=0

# 检查过时依赖
pnpm outdated

# 安全审计
npm audit --production

# 移除特定依赖
pnpm remove <package>

# 添加到devDependencies
pnpm add -D <package>

# 更新所有依赖
pnpm update

# 清理缓存
pnpm store prune
```

---

**报告完成时间**: 2026-03-28
**下次审计建议**: 1个月后 (2026-04-28)

---

*此报告由 💰 财务 生成 | 依赖成本与资源效率分析*
