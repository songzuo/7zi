# SECURITY_FIX_REPORT.md

## P0-1: JWT_SECRET 弱密钥回退漏洞

**严重级别**: P0 (Critical)  
**漏洞位置**: `websocket-service/src/index.js` 第 35-36 行  
**修复日期**: 2026-10-21

---

## 漏洞描述

原始代码：
```js
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key'
```

当未设置 `JWT_SECRET` 环境变量时，系统回退到可预测的弱密钥 `'demo-secret-key'`，攻击者可利用此密钥伪造任意 JWT token，绕过 WebSocket 认证。

---

## 修复内容

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/lib/jwt-secret.js` | JWT 密钥校验逻辑抽离，支持生产和开发环境策略 |
| `test/jwt-secret.test.js` | jwt-secret 模块单元测试（7 个测试用例） |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `src/index.js` | 引入 `getJWTSecret()`，替换硬编码回退逻辑 |
| `test/run.js` | 移除无效的 `NODE_OPTIONS: '--experimental-test-only'`；新增 jwt-secret 测试执行 |

---

## 校验策略（`src/lib/jwt-secret.js`）

```
生产环境 (NODE_ENV=production):
  ├── JWT_SECRET 未设置 → [FATAL] console.error + process.exit(1)
  └── 密钥长度 < 64 字符 → [ERROR] console.error + process.exit(1)

开发环境 (NODE_ENV !== production):
  ├── JWT_SECRET 未设置 → [WARN] + 返回 'dev-only-insecure-key-do-not-use-in-production-xxxxx'
  └── 密钥长度 < 64 字符 → [WARN] + 继续使用该密钥
```

密钥最小长度：64 字符（HS256 推荐值）。

---

## 测试结果

```
jwt-secret.test.js     : 7 tests, 7 pass ✅
  - 长密钥（≥64）通过
  - 短密钥开发环境警告但通过
  - 短密钥生产环境退出(1)
  - 缺失密钥开发环境警告+回退
  - 缺失密钥生产环境退出(1)
  - 签名 token 能被 verify 通过
  - 错误密钥 verify 失败

unit.test.js (RoomManager): 12 tests, 12 pass ✅
integration.test.js     : 14 tests, 14 pass ✅

总计: 33 tests, 33 pass ✅
```

> ⚠️ `npm test`（通过 `run.js`）在集成测试后存在后台服务器清理延迟，导致进程不完全退出。已确认各测试文件独立运行时全部通过。集成测试的 cleanup 问题与本次修复无关（原有代码问题）。

---

## 遗留风险

1. **开发环境 fallback 密钥仍可预测**：开发环境未设置 `JWT_SECRET` 时使用固定回退值 `'dev-only-insecure-key-do-not-use-in-production-xxxxx'`。虽比原 `'demo-secret-key'` 更长，但仍非随机生成，仅用于本地开发。生产部署必须配置真实密钥。

2. **未设置 `NODE_ENV` 的默认行为**：当 `NODE_ENV` 未设置时，Node.js 默认视为开发环境，因此走 WARN 路径而非 FATAL。建议部署时明确设置 `NODE_ENV=production`。

3. **测试框架兼容性**：`NODE_OPTIONS: '--experimental-test-only'` 在 Node v22 中不再支持，已从 `run.js` 移除，但该改动不影响测试结果正确性。

---

## 验证方式

```bash
# 生产环境（无 JWT_SECRET）应 FATAL 退出
NODE_ENV=production JWT_SECRET= node src/index.js
# 输出: [FATAL] JWT_SECRET environment variable is required in production.

# 生产环境（密钥太短）应退出
NODE_ENV=production JWT_SECRET=short node src/index.js
# 输出: [ERROR] JWT_SECRET is too short (5 chars)...

# 开发环境警告但不退出
JWT_SECRET=short node src/index.js
# 输出: [WARN] JWT_SECRET is too short (5 chars)...

# 正常启动
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))") node src/index.js
# ✅ 正常启动
```
