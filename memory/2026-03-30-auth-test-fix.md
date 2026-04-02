# Auth API 测试修复报告

**日期**: 2026-03-30  
**操作**: 测试员修复 Auth API 测试  
**状态**: ✅ 完成

## 问题分析

回归测试报告显示 2 个测试失败：

| 失败测试           | 预期状态码 | 实际状态码 | 原因                              |
| ------------------ | ---------- | ---------- | --------------------------------- |
| 应该成功注册新用户 | 201        | 400        | 请求体缺少 `confirmPassword` 字段 |
| 应该成功重置密码   | 200        | 400        | 请求体缺少 `confirmPassword` 字段 |

## 根本原因

查看 `src/lib/validation-schemas.ts` 中的验证 schema：

**registerSchema** 要求：

- `username` - 用户名（3-20字符）
- `email` - 邮箱（有效格式）
- `password` - 密码（最少8字符，含字母和数字）
- `confirmPassword` - 确认密码（必须与 password 匹配）

**passwordResetSchema** 要求：

- `token` - 重置令牌
- `password` - 新密码
- `confirmPassword` - 确认密码（必须与 password 匹配）

测试用例遗漏了 `confirmPassword` 字段，导致验证失败返回 400。

## 修复内容

### 1. 注册测试修复

```typescript
body: JSON.stringify({
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'Password123!',
  confirmPassword: 'Password123!', // 新增
})
```

### 2. 重置密码测试修复

```typescript
body: JSON.stringify({
  token: 'valid-token',
  password: 'NewPassword123!',
  confirmPassword: 'NewPassword123!', // 新增
})
```

## 验证结果

```bash
npm run test -- src/app/api/auth/__tests__/route.test.ts

✓ src/app/api/auth/__tests__/route.test.ts  (12 tests)

Test Files  1 passed (1)
     Tests  12 passed (12)
```

**通过率**: 100% (12/12) ✅

## 总结

- 修复了 2 个测试用例
- 根本原因是测试用例与实际 API schema 不同步
- 建议：维护测试时同步更新 validation-schemas 的文档注释
