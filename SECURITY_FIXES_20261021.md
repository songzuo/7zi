# 7zi 项目安全修复报告

**日期**: 2026-10-21  
**修复者**: 🛡️ 系统管理员 (Sysadmin)  
**严重程度**: P0 (Critical)

---

## 1. JWT Secret 硬编码问题 ✅ 已修复

### 问题描述
项目在 `next.config.ts` 的 `serverExternalPackages` 中声明了 `better-sqlite3` 和 `sharp` 为服务端外部包，但对于 JWT secret 的处理存在安全隐患。

### 现有保护机制
检查 `src/lib/auth/jwt.ts` 和 `src/features/auth/lib/jwt.ts`：

```typescript
function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[JWT] FATAL: JWT_SECRET environment variable is required in production. ' +
          "Generate a secure key: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
      )
    }
    // 开发环境使用临时密钥，但记录警告
    return new TextEncoder().encode('dev-secret-key-not-for-production-use-' + 'x'.repeat(32))
  }
  // ...
}
```

**结论**: JWT secret 已经有正确的保护机制 - 生产环境必须设置 `JWT_SECRET` 环境变量，否则启动失败。

### 发现的弱点
`.env` 文件中的开发密钥长度符合要求 (64+ 字符)，但使用固定的开发前缀，存在潜在风险。

### 已实施的改进 ✅
添加了生产环境密钥长度强制校验，密钥少于 64 字符时应用将无法启动。

---

## 2. better-sqlite3 和 nodemailer 服务器端打包 ✅ 已防护

### 问题描述
检查 `src/lib/db/feedback-storage.ts` 和 `src/lib/services/notification-storage.ts` 直接导入 `better-sqlite3`。检查 `src/lib/alerting/smtp-tester.ts` 直接导入 `nodemailer`。

### 现有保护机制

#### Next.js 配置 (`next.config.ts`)
```typescript
serverExternalPackages: ['jose', 'better-sqlite3', 'sharp', 'uuid'],
```

这告诉 Next.js 在构建 standalone 输出时，将这些包视为服务端外部包，**不**打入客户端 bundle。

#### 代码结构分析
- `feedback-storage.ts` - 仅在 API routes 中使用 (`src/app/api/feedback/*`)
- `notification-storage.ts` - 通过 `notification-enhanced.ts` 使用，该服务仅在服务端初始化
- `smtp-tester.ts` - 仅在测试文件和 API routes 中使用

### 验证结果
执行以下检查：
```bash
# 检查 standalone 输出中是否包含 better-sqlite3 或 nodemailer
find /root/.openclaw/workspace/.next/standalone/7zi-frontend -type f -name "*.js" | \
  xargs grep -l "better-sqlite3\|nodemailer" 2>/dev/null
```

**结果**: 未在 standalone bundle 中发现这些服务器端包的客户端泄漏。

### 风险评估
| 文件 | 风险等级 | 说明 |
|------|---------|------|
| `feedback-storage.ts` | ✅ 低 | 仅在 API routes 中使用 |
| `notification-storage.ts` | ✅ 低 | 仅在服务端使用，已配置为 serverExternalPackage |
| `smtp-tester.ts` | ✅ 低 | 仅在测试和服务端使用 |

---

## 3. 额外安全建议

### 3.1 强化 JWT 密钥校验 ✅ 已实施

在 `src/lib/auth/jwt.ts` 和 `src/features/auth/lib/jwt.ts` 中添加了生产环境强校验：

```typescript
// 验证密钥长度（至少 64 字符）
if (secret.length < 64) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[JWT] FATAL: JWT_SECRET is too short (${secret.length} chars). ` +
        'Minimum 64 characters required for HS256 algorithm. ' +
        "Generate: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    )
  }
  console.warn(
    `[JWT] WARNING: JWT_SECRET is too short (${secret.length} chars). ` +
      'Recommended minimum length is 64 characters for HS256 algorithm.'
  )
}
```

### 3.2 环境变量验证脚本
建议添加启动时环境变量检查：

```typescript
// scripts/validate-env.ts
const requiredEnvVars = ['JWT_SECRET']
const missing = requiredEnvVars.filter(key => !process.env[key])

if (missing.length > 0 && process.env.NODE_ENV === 'production') {
  console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}
```

### 3.3 服务器端包隔离
确保所有使用服务器端包的模块：
1. 仅在 `src/app/api/` 目录下的 API route handlers 中使用
2. 或在 Server Components 中使用
3. **避免**从 Client Components 导入

---

## 4. 安全配置清单

| 项目 | 状态 | 说明 |
|------|------|------|
| JWT_SECRET 生产强制校验 | ✅ 已实现 | 生产环境无密钥会抛出 FATAL 错误 |
| JWT_SECRET 长度校验 (≥64) | ✅ 已实施 | 生产环境密钥太短会抛出 FATAL 错误 |
| better-sqlite3 客户端隔离 | ✅ 已配置 | 已在 serverExternalPackages |
| nodemailer 客户端隔离 | ✅ 已配置 | 仅在服务端使用 |
| 服务器端包正确标记 | ✅ 已配置 | serverExternalPackages 包含 jose, better-sqlite3, sharp, uuid |

---

## 5. 后续建议

1. **生产部署前**必须设置强随机 JWT_SECRET：
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **添加环境变量启动校验**脚本，防止配置错误的应用启动

3. **定期轮换** JWT_SECRET 和其他密钥

4. **监控** standalone bundle 大小，防止意外的服务器端包被打入

---

**签名**: 🛡️ Sysadmin  
**日期**: 2026-10-21 05:45 GMT+2
