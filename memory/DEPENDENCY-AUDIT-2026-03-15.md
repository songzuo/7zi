# 7zi 项目依赖健康报告

**生成时间**: 2026-03-15 18:20 UTC  
**项目**: 7zi-frontend v0.2.0

---

## 📊 依赖概览

| 类别 | 数量 |
|------|------|
| 生产依赖 | 17 |
| 开发依赖 | 20 |
| 总依赖 | 787 (含传递依赖) |

---

## ⚠️ 1. 安全漏洞 (高优先级)

### 发现 1 个 HIGH 级别漏洞

| 漏洞包 | 严重程度 | 漏洞数量 | 影响版本 | 修复版本 |
|--------|----------|----------|----------|----------|
| **undici** | HIGH | 4个 | 7.0.0 - 7.23.0 | ≥ 7.24.0 |

**漏洞详情**:
- `GHSA-f269-vfmq-vjvj` - WebSocket 64位长度溢出 (CVSS: 7.5)
- `GHSA-vrm6-8vpv-qv8q` - WebSocket 内存消耗无限制 (CVSS: 7.5)
- `GHSA-v9p9-hfj2-hcw8` - WebSocket 客户端未处理异常 (CVSS: 7.5)
- `GHSA-2mjp-6q6p-qxm` - HTTP 请求/响应 smuggling (CVSS: 6.5)

**来源**: undici 是 Node.js 内置 HTTP 客户端的替代品，被作为传递依赖引入

**建议**: 运行 `npm update` 修复

---

## 📦 2. 过期依赖 (需要更新)

### 需要更新的依赖 (13个)

| 包名 | 当前版本 | 建议版本 | 最新版本 | 优先级 |
|------|----------|----------|----------|--------|
| **react** | 18.3.1 | 保持 | 19.2.4 | 🔴 高 |
| **react-dom** | 18.3.1 | 保持 | 19.2.4 | 🔴 高 |
| **next** | 15.5.12 | 保持 | 16.1.6 | 🟡 中 |
| **eslint** | 9.39.4 | 保持 | 10.0.3 | 🟡 中 |
| **@types/node** | 22.13.1 | 25.3.5 | - | 🟡 中 |
| **jose** | 6.2.0 | 6.2.1 | 6.2.1 | 🟢 低 |
| **vitest** | 4.0.18 | 4.1.0 | 4.1.0 | 🟢 低 |
| **@vitest/coverage-v8** | 4.0.18 | 4.1.0 | 4.1.0 | 🟢 低 |
| **@vitejs/plugin-react** | 5.1.4 | 5.2.0 | 6.0.1 | 🟢 低 |
| **eslint-config-next** | 16.2.0-canary.85 | 16.2.0-canary.99 | 16.1.6 | 🟢 低 |
| **jsdom** | 28.1.0 | 保持 | 29.0.0 | 🟢 低 |

---

## ✅ 3. 依赖使用情况

**检查结果**: 所有声明的依赖都在使用中 ✅

| 状态 | 数量 |
|------|------|
| 正常使用的依赖 | 全部 |
| 未使用的依赖 | 0 |

**注意**: 检测到几个无效文件 (非关键):
- `ecosystem.config.js` - 语法错误
- `tsconfig.build.json` - JSON 格式错误
- `performance/monitor.js` - 语法错误

---

## 🎯 优化建议

### 紧急 (立即处理)

1. **修复 undici 安全漏洞**
   ```bash
   npm update
   # 或手动指定版本
   npm install undici@^7.24.0
   ```

### 重要 (近期处理)

2. **React 19 升级评估**
   - 当前使用 React 18.3.1，最新为 19.2.4
   - 建议: 等待 Next.js 16 稳定版发布后一起升级
   - 原因: Next.js 15.5 需要 React 18

3. **修复无效配置文件**
   - 修复 `tsconfig.build.json` 的 JSON 语法错误
   - 修复 `ecosystem.config.js` 的语法错误

### 常规 (定期维护)

4. **运行 npm update** 更新所有补丁版本:
   ```bash
   npm update
   ```

5. **保持 TypeScript 类型更新**:
   ```bash
   npm install @types/node@25.3.5
   ```

---

## 📋 推荐执行命令

```bash
# 1. 快速安全修复
npm update

# 2. 验证更新
npm outdated

# 3. 重新审计安全
npm audit

# 4. 测试通过后提交
git add package.json package-lock.json
git commit -m "chore: update dependencies and fix security vulnerabilities"
```

---

## 📈 健康评分

| 指标 | 评分 | 说明 |
|------|------|------|
| 安全漏洞 | ⚠️ 需修复 | 1 个 HIGH 漏洞 |
| 依赖过期 | ✅ 良好 | 主要依赖已是最新 |
| 依赖使用 | ✅ 优秀 | 无未使用依赖 |
| 配置正确 | ⚠️ 需修复 | 3 个文件有错误 |

**总体评分**: 🟡 75/100 (良好)

---

*报告由依赖管理工程师自动生成*
