# Auth 模块合并计划

## 当前状态

### 认证相关文件

1. `src/lib/auth.ts` - 通用认证工具函数（验证凭证、权限检查、会话管理等）
2. `src/lib/auth/` 目录：
   - `jwt.ts` - JWT 生成和验证（2597 字节）
   - `api-auth.ts` - API 认证相关（6046 字节）
   - `index.ts` - 导出文件

### 使用情况

```bash
# src/lib/auth.ts 使用情况
- 可能用于客户端认证相关工具

# src/lib/auth/ 使用情况
- 可能用于服务器端 JWT 和 API 认证
```

## 优化方案

### 方案 1: 合并到单一模块结构

```
src/lib/auth/
├── index.ts          # 导出所有工具函数和类型
├── utils.ts          # 通用认证工具（从 auth.ts 移动）
├── jwt.ts            # JWT 相关（保留）
├── api-auth.ts       # API 认证（保留）
└── types.ts          # 认证相关类型（从 auth.ts 提取）
```

### 方案 2: 保持文件独立，明确职责

```
src/lib/
├── auth.ts           # 通用认证工具（客户端 + 服务器）
├── auth/
│   ├── jwt.ts        # JWT 专用
│   ├── api-auth.ts   # API 认证专用
│   └── index.ts      # 导出 auth/ 模块
```

## 推荐方案：方案 2

**理由：**
1. `src/lib/auth.ts` 已存在且功能完整
2. `src/lib/auth/` 中的文件更专业（JWT 和 API 认证）
3. 避免大规模重构，降低风险
4. 保持职责清晰：`auth.ts` = 通用工具，`auth/` = 专业功能

## 执行步骤

1. 检查 `src/lib/auth.ts` 的使用情况
2. 确保 `src/lib/auth/` 中的功能与 `auth.ts` 不重复
3. 如果有重复，删除重复代码
4. 更新导出和文档

## 预期效果

- 提高代码组织性
- 消除潜在重复
- 保持向后兼容
