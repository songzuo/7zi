# 代码规范 - 7zi Studio

**最后更新**: 2026-03-06  
**适用范围**: 所有 7zi Studio 项目代码

---

## 📋 目录

1. [命名规范](#命名规范)
2. [代码格式](#代码格式)
3. [注释规范](#注释规范)
4. [文件组织](#文件组织)
5. [Git 提交规范](#git 提交规范)
6. [最佳实践](#最佳实践)

---

## 命名规范

### 变量和函数

```typescript
// ✅ 正确
const userName = 'John';
function getUserData() { }
const MAX_RETRIES = 3;

// ❌ 错误
const username = 'John';  // 使用 camelCase
function get_user_data() { }  // 不使用下划线
const max_retries = 3;  // 常量用大写
```

### 组件和类

```typescript
// ✅ 正确 - 使用 PascalCase
class UserService { }
const UserProfile = () => { };
interface ApiResponse { }

// ❌ 错误
class userService { }
const userProfile = () => { };
```

### 文件和目录

```bash
# ✅ 正确
components/UserProfile.tsx
utils/format-date.ts
styles/global.css

# ❌ 错误
components/user-profile.tsx  # 组件用 PascalCase
utils/FormatDate.ts  # 工具函数用 kebab-case
```

---

## 代码格式

### TypeScript/JavaScript

```typescript
// 使用 2 空格缩进
function processData(data: DataProps): Result {
  if (!data) {
    throw new Error('Data is required');
  }
  
  const result = transform(data);
  return result;
}

// 箭头函数
const handleClick = () => {
  console.log('Clicked!');
};

// 导出语句
export { UserService };
export default UserProfile;
```

### React 组件

```tsx
// ✅ 正确的组件结构
import React, { useState, useEffect } from 'react';
import styles from './UserProfile.module.css';

interface UserProfileProps {
  userId: string;
  showAvatar?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  showAvatar = true
}) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUser(userId);
  }, [userId]);

  return (
    <div className={styles.container}>
      {showAvatar && <Avatar user={user} />}
      <h2>{user?.name}</h2>
    </div>
  );
};
```

### CSS/样式

```css
/* 使用 BEM 命名或 CSS Modules */
.container {
  display: flex;
  gap: 1rem;
}

.container__item {
  flex: 1;
}

.container__item--active {
  background-color: blue;
}
```

---

## 注释规范

### 文件头注释

```typescript
/**
 * @fileoverview 用户服务模块
 * @description 处理用户相关的业务逻辑，包括 CRUD 操作和认证
 * @author 7zi Studio AI Team
 * @version 1.0.0
 */
```

### 函数注释

```typescript
/**
 * 获取用户数据
 * @param userId - 用户唯一标识
 * @param options - 查询选项
 * @returns 用户数据对象
 * @throws {UserNotFoundError} 当用户不存在时
 *
 * @example
 * const user = await getUserData('123', { includeProfile: true });
 */
async function getUserData(
  userId: string,
  options: QueryOptions = {}
): Promise<User> {
  // ...
}
```

### 行内注释

```typescript
// ✅ 好的注释 - 解释为什么
const timeout = 5000; // 5 秒超时，给慢网络留有余量

// ❌ 不好的注释 - 重复代码
i++; // i 加 1
```

---

## 文件组织

### 项目结构

```
project/
├── src/
│   ├── components/      # React 组件
│   ├── pages/          # 页面组件
│   ├── utils/          # 工具函数
│   ├── services/       # API 服务
│   ├── hooks/          # 自定义 Hooks
│   ├── types/          # TypeScript 类型
│   └── styles/         # 样式文件
├── tests/              # 测试文件
├── docs/               # 文档
└── public/             # 静态资源
```

### 组件文件结构

```tsx
// 1. 导入
import React from 'react';
import { useState } from 'react';

// 2. 类型定义
interface Props { }

// 3. 常量
const MAX_ITEMS = 100;

// 4. 组件
export const Component = () => { };

// 5. 导出
export default Component;
```

---

## Git 提交规范

### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型 (type)

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具配置

### 示例

```bash
# ✅ 好的提交
feat(auth): 添加用户登录功能
- 实现登录表单
- 添加 JWT 认证
- 更新用户状态

fix(api): 修复用户数据获取错误
- 处理空响应情况
- 添加错误日志

docs(readme): 更新快速开始指南

# ❌ 不好的提交
更新代码
修复 bug
小修改
```

---

## 最佳实践

### 错误处理

```typescript
// ✅ 正确的错误处理
try {
  const data = await fetchData();
  return { success: true, data };
} catch (error) {
  logger.error('Failed to fetch data', error);
  return { 
    success: false, 
    error: '数据加载失败，请稍后重试' 
  };
}
```

### 异步代码

```typescript
// ✅ 使用 async/await
async function processUsers(userIds: string[]) {
  const results = await Promise.all(
    userIds.map(id => fetchUser(id))
  );
  return results;
}

// ❌ 避免回调地狱
userIds.forEach(id => {
  fetchUser(id, (user) => {
    processUser(user, (result) => {
      // ...
    });
  });
});
```

### 性能优化

```typescript
// ✅ 使用 useMemo 缓存计算结果
const filteredItems = useMemo(() => {
  return items.filter(item => item.active);
}, [items]);

// ✅ 使用 useCallback 缓存函数
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);

// ✅ 虚拟列表处理大数据
import { VirtualList } from './VirtualList';
<VirtualList items={largeData} renderItem={renderItem} />
```

### 安全性

```typescript
// ✅ 输入验证
function createUser(input: Input) {
  if (!input.email || !isValidEmail(input.email)) {
    throw new ValidationError('无效的邮箱地址');
  }
  // ...
}

// ✅ 转义用户输入
const safeHtml = escapeHtml(userInput);

// ❌ 避免 SQL 注入
const user = db.query(`SELECT * FROM users WHERE id = ${userId}`); // 危险！
```

---

## 代码审查清单

在提交代码前，请检查：

- [ ] 代码符合命名规范
- [ ] 添加了必要的注释
- [ ] 通过了 TypeScript 类型检查
- [ ] 通过了 ESLint 检查
- [ ] 添加了单元测试
- [ ] 更新了相关文档
- [ ] 提交消息清晰描述变更

---

## 工具配置

### ESLint 配置

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended"
  ],
  "rules": {
    "indent": ["error", 2],
    "quotes": ["error", "single"],
    "semi": ["error", "always"]
  }
}
```

### Prettier 配置

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

## 参考资源

- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [React 最佳实践](https://react.dev/learn)
- [Clean Code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [Google 代码规范](https://google.github.io/styleguide/)

---

*本规范由 7zi Studio AI 团队制定并维护*
