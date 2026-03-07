# 安全模块文档

## 概述

本模块提供环境变量验证和 JWT 认证的安全管理功能。

## 文件说明

### `lib/env.ts` - 环境变量验证模块

- 验证必需的环境变量
- 在生产环境强制检查关键变量
- 提供类型安全的环境变量访问
- 导出实用函数：`validateEnv()`, `getEnvConfig()`, `isDevelopment()`, `isProduction()`

### `lib/auth.ts` - 认证模块

- 安全的 JWT 密钥管理
- 密钥长度验证（至少 32 字符）
- 开发/生产环境不同的密钥策略
- 时序安全的密码验证（防止时序攻击）
- 密码哈希和验证功能
- 导出主要函数：`getJwtSecret()`, `getJwtConfig()`, `validateAdminPassword()`

## 使用方法

### 1. 设置环境变量

在 `.env.local` 文件中设置以下变量（生产环境必需）：

```bash
# JWT 认证配置
JWT_SECRET=$(openssl rand -base64 32)  # 生成安全的随机密钥
JWT_EXPIRES_IN=7d                       # 可选，默认 7 天
JWT_ISSUER=ai-team-dashboard            # 可选
JWT_AUDIENCE=ai-team-dashboard-users    # 可选

# 管理员配置
ADMIN_PASSWORD=your-secure-password-here

# 环境设置
NODE_ENV=production                     # 或 development
```

### 2. 生成安全的 JWT 密钥

```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. 在代码中使用

```typescript
import { getJwtConfig, validateAdminPassword, generateSecureToken } from '@/lib/auth';
import { getEnvConfig } from '@/lib/env';

// 获取 JWT 配置
const jwtConfig = getJwtConfig();

// 验证管理员密码
const isValid = validateAdminPassword(userPassword);

// 生成安全令牌
const token = generateSecureToken(32);
```

## 安全特性

### JWT 密钥管理

- **生产环境**：必须设置 `JWT_SECRET`，否则启动失败
- **开发环境**：未设置时自动生成临时随机密钥（每次重启变化）
- **长度验证**：强制至少 32 字符
- **警告提示**：开发环境使用默认密钥时会显示警告

### 密码安全

- **时序安全**：使用 `crypto.timingSafeEqual` 防止时序攻击
- **强哈希**：使用 PBKDF2 + SHA512 进行密码哈希
- **盐值**：每个密码使用唯一随机盐值
- **默认密码**：开发环境默认密码仅用于开发

### 环境变量验证

- **生产检查**：生产环境强制检查所有必需变量
- **类型安全**：提供 TypeScript 类型定义
- **错误提示**：清晰的错误信息指导用户修复

## 注意事项

1. **永远不要**将 `.env.local` 文件提交到版本控制
2. **生产环境**必须设置 `JWT_SECRET` 和 `ADMIN_PASSWORD`
3. 使用强密码和足够长的 JWT 密钥（建议 64 字符以上）
4. 定期轮换 JWT 密钥
5. 不要在代码中硬编码密钥或密码

## 错误处理

模块会抛出以下错误：

- `EnvValidationError`：环境变量验证失败
- `Error`：JWT 密钥长度不足或未设置（生产环境）

示例：

```typescript
import { getJwtSecret } from '@/lib/auth';

try {
  const secret = getJwtSecret();
  // 使用密钥...
} catch (error) {
  console.error('JWT 配置错误:', error.message);
  // 处理错误...
}
```

## 测试

在测试环境中，可以使用：

```typescript
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
// 测试代码...
```

## 相关资源

- [JWT 安全最佳实践](https://tools.ietf.org/html/rfc8725)
- [OWASP 密码存储备忘单](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Node.js crypto 文档](https://nodejs.org/api/crypto.html)