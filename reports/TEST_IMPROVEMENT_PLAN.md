# 7zi-Project 测试分析与改进计划

**日期**: 2026-03-18
**分析师**: AI 测试工程师
**项目**: 7zi AI Team Management Platform

---

## 执行摘要

本报告对 7zi-project 进行了全面的测试覆盖率分析，识别了测试薄弱区域，并提出了具体的改进计划。

### 关键发现

- **整体测试状态**: 项目已建立基础的测试框架（Vitest + Playwright），但覆盖率不均衡
- **单元测试**: 覆盖率中等，重点集中在工具库和 hooks
- **E2E 测试**: 基础覆盖完善，但缺少关键业务流程
- **API 测试**: 严重不足，仅 11% 覆盖率
- **组件测试**: 覆盖率较低（~13%），多个核心组件未测试

---

## 1. 现有测试覆盖率分析

### 1.1 测试统计

| 类别             | 源文件数 | 测试文件数 | 覆盖率 | 状态        |
| ---------------- | -------- | ---------- | ------ | ----------- |
| **整体**         | 213      | 99         | 46%    | ⚠️ 中等     |
| **Libs**         | ~20      | ~25        | 125%   | ✅ 优秀     |
| **Hooks/Stores** | 10       | 8          | 80%    | ✅ 良好     |
| **Components**   | 78       | 10         | 13%    | ❌ 严重不足 |
| **API Routes**   | 9        | 1          | 11%    | ❌ 严重不足 |
| **E2E Tests**    | N/A      | 11         | N/A    | ✅ 基础完善 |

### 1.2 按模块详细分析

#### ✅ 覆盖良好的模块

**src/lib/** - 工具库测试

- `utils.test.ts` - 完整覆盖所有工具函数（500+ 行）
- `validation` - 表单验证测试完整
- `approval` - 审批流程测试
- `realtime` - WebSocket 和通知服务测试
- `export` - 导出功能测试
- `types` - 类型定义测试

**src/hooks/** - React Hooks

- `useDashboardData` - 仪表板数据钩子
- `usePerformance` - 性能监控钩子
- `useBatchSelection` - 批量选择钩子
- `useIntersectionObserver` - 交叉观察器
- `useLocalStorage` - 本地存储钩子
- `useFetch` - 数据获取钩子
- `useGitHubData` - GitHub 数据钩子

**src/stores/** - 状态管理

- `walletStore.test.ts` - 钱包状态管理测试

#### ⚠️ 覆盖不足的模块

**src/components/** - 组件（13% 覆盖率）

- ✅ 已测试：Navigation, Footer, NotificationCenter (3个), ContactForm, TeamActivityTracker, RealtimeDashboard, AnimatedProgressBar
- ❌ **未测试（68个组件）**：
  - `chat/` - 9 个聊天相关组件（完全未测试）
  - `UserSettings/` - 7 个用户设置组件（完全未测试）
  - `form/` - 3 个表单组件（完全未测试）
  - `errors/` - 错误处理组件
  - `optimized/` - 性能优化组件
  - `shared/` - 共享 UI 组件

**src/app/api/** - API 路由（11% 覆盖率）

- ✅ 已测试：`status.route.test.ts`
- ❌ **未测试（8个路由）**：
  - `csrf-token` - CSRF Token 生成
  - `a2a/jsonrpc` - A2A 协议端点
  - `health/live` - 健康检查
  - `health/ready` - 就绪检查
  - `health/detailed` - 详细健康信息
  - `github/commits` - GitHub 提交数据
  - `github/issues` - GitHub Issues

**src/app/** - 页面组件

- ❌ **完全未测试** - 所有页面组件（team, portfolio, about, tasks, contact, blog 等）

#### ✅ E2E 测试覆盖良好

E2E 测试基础框架完善，包含：

- `team.spec.ts` - 团队页面（10个测试套件，覆盖响应式、无障碍、国际化）
- `user-flow.spec.ts` - 用户流程
- `form.spec.ts` - 表单交互
- `dashboard.spec.ts` - 仪表板
- `pages.spec.ts` - 页面导航
- `visual-regression.spec.ts` - 视觉回归
- `navigation.spec.ts` - 导航测试
- `i18n.spec.ts` - 国际化
- `responsive.spec.ts` - 响应式
- `theme.spec.ts` - 主题切换
- `home.spec.ts` - 首页

---

## 2. 测试薄弱区域识别

### 2.1 高优先级薄弱区域 🔴

#### API Routes 测试缺失

**影响**: 严重的安全和功能风险
**缺失测试**:

- CSRF Token 生成和验证
- A2A JSON-RPC 协议端点
- 健康检查端点
- GitHub 集成端点

**风险**:

- CSRF 保护可能失效
- API 返回格式不一致
- 健康检查无法正确报告状态
- GitHub 数据获取失败

#### 核心业务组件未测试

**影响**: 用户体验和功能回归风险
**缺失测试**:

- 聊天系统（ChatMessage, ChatInput, ChatHeader, MemberSelector）
- 用户设置（UserSettingsPage, AvatarUpload, ToggleSwitch）
- 表单组件（FormField, useFieldValidation）

**风险**:

- 聊天功能可能崩溃
- 用户设置无法保存
- 表单验证失败

### 2.2 中优先级薄弱区域 🟡

#### 页面组件集成测试缺失

**影响**: 页面渲染和路由问题
**缺失测试**:

- 所有 App Pages（team, portfolio, about, tasks, contact, blog）
- 页面级布局和主题切换
- SEO 元数据渲染

#### 性能和优化组件未测试

**影响**: 性能回归
**缺失测试**:

- LazyImage 优化
- AIChat 性能优化
- MobileMenu 响应式行为

### 2.3 低优先级薄弱区域 🟢

#### 共享 UI 组件测试缺失

**影响**: UI 一致性问题
**缺失测试**:

- ui.tsx 中的基础 UI 组件
- 错误处理组件

#### 类型定义测试不完整

**影响**: 类型安全
**缺失测试**:

- 部分 TypeScript 类型验证

---

## 3. 缺失的重要测试场景

### 3.1 安全性测试

#### ❌ 未覆盖的安全测试场景

1. **CSRF 保护测试**
   - Token 生成和验证
   - Token 过期处理
   - 跨域请求保护

2. **输入验证测试**
   - XSS 攻击防护
   - SQL 注入防护（如果有数据库）
   - 文件上传验证

3. **认证和授权测试**
   - 未授权访问保护
   - 会话管理
   - 权限边界检查

### 3.2 集成测试场景

#### ❌ 未覆盖的集成测试

1. **前后端集成**
   - API 调用与组件交互
   - 错误处理流程
   - 数据一致性

2. **第三方服务集成**
   - EmailJS 邮件发送
   - Resend 邮件服务
   - GitHub API 集成
   - Svix Webhook 处理

3. **WebSocket 实时通信**
   - 连接建立和断开
   - 消息发送和接收
   - 重连机制

### 3.3 性能测试场景

#### ❌ 未覆盖的性能测试

1. **页面加载性能**
   - LCP（最大内容绘制）阈值
   - FID（首次输入延迟）测试
   - CLS（累积布局偏移）监控

2. **组件性能**
   - 大列表渲染性能
   - 图片懒加载效果
   - 虚拟滚动测试

3. **API 性能**
   - 响应时间 SLA
   - 并发请求处理
   - 缓存有效性

### 3.4 边界条件和错误处理

#### ❌ 未覆盖的边界测试

1. **数据边界**
   - 空数组/对象处理
   - 超大数据集
   - 极端数值边界

2. **网络异常**
   - 网络断开处理
   - 超时处理
   - 服务器错误（5xx）

3. **浏览器兼容性**
   - Safari 特定问题
   - Firefox 特定问题
   - 移动浏览器问题

### 3.5 国际化和本地化

#### ❌ 未完全覆盖的 i18n 测试

1. **语言切换**
   - 动态语言切换
   - 翻译缺失处理
   - 日期/货币格式化

2. **RTL 支持**
   - 阿拉伯语/希伯来语布局
   - 文本方向切换

---

## 4. 测试用例改进建议

### 4.1 API 测试改进

#### 建议 1: 为所有 API 路由创建测试套件

**优先级**: 🔴 高
**工作量**: 3-5 天

**目标**: 将 API 覆盖率从 11% 提升到 90%

**具体行动**:

1. **创建 API 测试模板**

   ```typescript
   // src/app/api/__tests__/template.route.test.ts
   import { describe, it, expect, beforeEach, afterEach } from 'vitest'
   import { GET, POST, PUT, DELETE } from '../route'

   describe('API Route Template', () => {
     beforeEach(() => {
       // Mock external dependencies
     })

     describe('GET', () => {
       it('should return 200 and correct structure', async () => {
         const response = await GET()
         const data = await response.json()
         expect(response.status).toBe(200)
         // 验证响应结构
       })

       it('should handle errors gracefully', async () => {
         // 测试错误场景
       })
     })

     describe('POST', () => {
       it('should validate input', async () => {
         // 测试输入验证
       })

       it('should handle valid request', async () => {
         // 测试正常请求
       })
     })
   })
   ```

2. **为每个 API 路由创建测试**
   - `csrf-token/route.test.ts`
   - `a2a/jsonrpc/route.test.ts`
   - `health/live/route.test.ts`
   - `health/ready/route.test.ts`
   - `health/detailed/route.test.ts`
   - `github/commits/route.test.ts`
   - `github/issues/route.test.ts`

3. **添加 API 集成测试套件**
   ```typescript
   // src/app/api/__tests__/integration/api-flow.test.ts
   describe('API Integration Flows', () => {
     it('should handle complete user session flow', async () => {
       // 1. Get CSRF token
       // 2. Authenticate
       // 3. Access protected resource
       // 4. Logout
     })
   })
   ```

**预期成果**:

- API 覆盖率: 11% → 90%
- 新增 7-10 个测试文件
- 所有 API 端点有基础测试覆盖

---

#### 建议 2: 添加 API 安全测试

**优先级**: 🔴 高
**工作量**: 2-3 天

**具体测试场景**:

1. **CSRF 保护测试**

   ```typescript
   describe('CSRF Protection', () => {
     it('should reject requests without CSRF token', async () => {
       const response = await fetch('/api/protected', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({}),
       })
       expect(response.status).toBe(403)
     })

     it('should accept requests with valid CSRF token', async () => {
       // Get token first
       // Then make request with token
     })

     it('should reject expired tokens', async () => {
       // Test token expiration
     })
   })
   ```

2. **输入验证测试**

   ```typescript
   describe('Input Validation', () => {
     it('should sanitize HTML input', async () => {
       const malicious = '<script>alert("xss")</script>'
       const response = await POST({ data: malicious })
       const data = await response.json()
       expect(data).not.toContain('<script>')
     })

     it('should validate required fields', async () => {
       const response = await POST({})
       expect(response.status).toBe(400)
     })
   })
   ```

3. **速率限制测试**（如果实现）
   ```typescript
   describe('Rate Limiting', () => {
     it('should limit requests per IP', async () => {
       // Make multiple rapid requests
       // Verify rate limit response
     })
   })
   ```

**预期成果**:

- 所有 API 有安全测试覆盖
- CSRF 验证 100% 覆盖
- 输入验证 100% 覆盖

---

### 4.2 组件测试改进

#### 建议 3: 为核心业务组件创建测试套件

**优先级**: 🔴 高
**工作量**: 5-7 天

**目标**: 将组件覆盖率从 13% 提升到 70%

**具体行动**:

##### Phase 1: 聊天系统组件（最高优先级）

```typescript
// src/components/chat/ChatMessage.test.tsx
import { render, screen } from '@testing-library/react';
import { ChatMessage } from './ChatMessage';
import { ChatMessage as ChatMessageType } from './types';

describe('ChatMessage', () => {
  const mockMessage: ChatMessageType = {
    id: '1',
    content: 'Hello, world!',
    sender: 'user',
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };

  it('should render message content', () => {
    render(<ChatMessage message={mockMessage} />);
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('should render user messages correctly', () => {
    render(<ChatMessage message={mockMessage} />);
    expect(screen.getByRole('listitem')).toHaveClass('user');
  });

  it('should render AI messages correctly', () => {
    const aiMessage = { ...mockMessage, sender: 'ai' as const };
    render(<ChatMessage message={aiMessage} />);
    expect(screen.getByRole('listitem')).toHaveClass('ai');
  });

  it('should format timestamps', () => {
    render(<ChatMessage message={mockMessage} />);
    expect(screen.getByText(/00:00/)).toBeInTheDocument();
  });

  it('should handle markdown in messages', () => {
    const markdownMessage = {
      ...mockMessage,
      content: '**Bold** and *italic*',
    };
    render(<ChatMessage message={markdownMessage} />);
    expect(screen.getByText('Bold')).toBeInTheDocument();
    expect(screen.getByText('italic')).toBeInTheDocument();
  });
});
```

```typescript
// src/components/chat/ChatInput.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  it('should render input field', () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should call onSend with message', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send|发送/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('should clear input after sending', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    const sendButton = screen.getByRole('button', { name: /send|发送/i });

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(sendButton);

    expect(input.value).toBe('');
  });

  it('should send on Enter key', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onSend).toHaveBeenCalledWith('Test');
  });

  it('should not send on Enter+Shift', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });
});
```

```typescript
// src/components/chat/MemberSelector.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemberSelector } from './MemberSelector';

describe('MemberSelector', () => {
  const mockMembers = [
    { id: '1', name: 'Alice', role: 'expert' },
    { id: '2', name: 'Bob', role: 'consultant' },
  ];

  it('should render member options', () => {
    render(<MemberSelector members={mockMembers} onSelect={vi.fn()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should call onSelect when member clicked', () => {
    const onSelect = vi.fn();
    render(<MemberSelector members={mockMembers} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Alice'));
    expect(onSelect).toHaveBeenCalledWith(mockMembers[0]);
  });

  it('should filter members by search', () => {
    render(<MemberSelector members={mockMembers} onSelect={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText(/search|搜索/i);
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });
});
```

##### Phase 2: 用户设置组件

```typescript
// src/components/UserSettings/UserSettingsPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserSettingsPage } from './UserSettingsPage';
import { vi } from 'vitest';

describe('UserSettingsPage', () => {
  const mockUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    avatar: null,
    preferences: {
      theme: 'light' as const,
      language: 'en' as const,
      notifications: true,
    },
  };

  it('should render user information', () => {
    render(<UserSettingsPage user={mockUser} onSave={vi.fn()} />);
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('should save settings', async () => {
    const onSave = vi.fn();
    render(<UserSettingsPage user={mockUser} onSave={onSave} />);

    const saveButton = screen.getByRole('button', { name: /save|保存/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('should toggle theme', () => {
    render(<UserSettingsPage user={mockUser} onSave={vi.fn()} />);

    const themeToggle = screen.getByRole('switch', { name: /theme|主题/i });
    fireEvent.click(themeToggle);

    expect(themeToggle).toHaveAttribute('aria-checked', 'false');
  });

  it('should change language', () => {
    render(<UserSettingsPage user={mockUser} onSave={vi.fn()} />);

    const languageSelect = screen.getByRole('combobox', { name: /language|语言/i });
    fireEvent.change(languageSelect, { target: { value: 'zh' } });

    expect(languageSelect).toHaveValue('zh');
  });
});
```

```typescript
// src/components/UserSettings/AvatarUpload.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AvatarUpload } from './AvatarUpload';

describe('AvatarUpload', () => {
  it('should render upload button', () => {
    render(<AvatarUpload onUpload={vi.fn()} />);
    expect(screen.getByRole('button', { name: /upload|上传/i })).toBeInTheDocument();
  });

  it('should handle file upload', async () => {
    const onUpload = vi.fn();
    render(<AvatarUpload onUpload={onUpload} />);

    const fileInput = screen.getByLabelText(/avatar|头像/i) as HTMLInputElement;
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file);
    });
  });

  it('should validate file type', () => {
    render(<AvatarUpload onUpload={vi.fn()} />);

    const fileInput = screen.getByLabelText(/avatar|头像/i) as HTMLInputElement;
    const invalidFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(screen.getByText(/invalid.*type|无效.*类型/i)).toBeInTheDocument();
  });

  it('should validate file size', () => {
    render(<AvatarUpload onUpload={vi.fn()} />);

    const fileInput = screen.getByLabelText(/avatar|头像/i) as HTMLInputElement;
    const largeFile = new File(['x'.repeat(5 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(screen.getByText(/too large|太大/i)).toBeInTheDocument();
  });
});
```

##### Phase 3: 表单组件

```typescript
// src/components/form/FormField.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FormField } from './FormField';

describe('FormField', () => {
  it('should render label and input', () => {
    render(
      <FormField
        label="Username"
        name="username"
        type="text"
        value=""
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(
      <FormField
        label="Email"
        name="email"
        type="email"
        value="invalid"
        onChange={vi.fn()}
        error="Invalid email format"
      />
    );

    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  it('should call onChange when value changes', () => {
    const onChange = vi.fn();
    render(
      <FormField
        label="Name"
        name="name"
        type="text"
        value=""
        onChange={onChange}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'John' } });

    expect(onChange).toHaveBeenCalledWith('John');
  });

  it('should show help text', () => {
    render(
      <FormField
        label="Password"
        name="password"
        type="password"
        value=""
        onChange={vi.fn()}
        help="At least 8 characters"
      />
    );

    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
  });
});
```

**预期成果**:

- 新增 15-20 个组件测试文件
- 组件覆盖率: 13% → 70%
- 核心业务组件 100% 覆盖

---

#### 建议 4: 为页面组件创建集成测试

**优先级**: 🟡 中
**工作量**: 4-5 天

**目标**: 为主要页面创建集成测试

**具体行动**:

```typescript
// src/app/[locale]/team/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react';
import TeamPage from '../page';

// Mock data
vi.mock('@/data/team', () => ({
  teamMembers: [
    { id: '1', name: 'Alice', role: 'expert', avatar: null },
    { id: '2', name: 'Bob', role: 'consultant', avatar: null },
  ],
}));

describe('TeamPage', () => {
  it('should render team page', () => {
    render(<TeamPage params={{ locale: 'en' }} />);
    expect(screen.getByText(/team/i)).toBeInTheDocument();
  });

  it('should display all team members', () => {
    render(<TeamPage params={{ locale: 'en' }} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should support i18n', () => {
    const { rerender } = render(<TeamPage params={{ locale: 'en' }} />);
    expect(screen.getByText(/team/i)).toBeInTheDocument();

    rerender(<TeamPage params={{ locale: 'zh' }} />);
    expect(screen.getByText(/团队/i)).toBeInTheDocument();
  });
});
```

```typescript
// src/app/[locale]/portfolio/__tests__/page.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import PortfolioPage from '../page';

vi.mock('@/data/portfolio', () => ({
  projects: [
    {
      id: '1',
      title: 'Project A',
      category: 'web',
      description: 'Test project',
      image: null,
    },
  ],
}));

describe('PortfolioPage', () => {
  it('should render portfolio grid', () => {
    render(<PortfolioPage params={{ locale: 'en' }} />);
    expect(screen.getByText('Project A')).toBeInTheDocument();
  });

  it('should filter by category', () => {
    render(<PortfolioPage params={{ locale: 'en' }} />);

    const filterButton = screen.getByRole('button', { name: /web/i });
    fireEvent.click(filterButton);

    // Verify only web projects shown
    expect(screen.getByText('Project A')).toBeInTheDocument();
  });
});
```

**预期成果**:

- 新增 6-8 个页面测试文件
- 主要页面 100% 集成测试覆盖

---

### 4.3 E2E 测试改进

#### 建议 5: 增强关键业务流程测试

**优先级**: 🔴 高
**工作量**: 3-4 天

**具体行动**:

##### 1. 用户注册和登录流程

```typescript
// e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should allow user registration', async ({ page }) => {
    await page.goto('/')

    // Click register
    await page.click('text=Register|注册')
    await expect(page).toHaveURL(/.*register|signup/i)

    // Fill form
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'SecurePass123!')

    // Submit
    await page.click('button[type="submit"]')

    // Verify success
    await expect(page).toHaveURL(/.*dashboard|team/i)
    await expect(page.locator('text=Test User')).toBeVisible()
  })

  test('should allow user login', async ({ page }) => {
    await page.goto('/')

    // Click login
    await page.click('text=Login|登录')
    await expect(page).toHaveURL(/.*login|signin/i)

    // Fill form
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'SecurePass123!')

    // Submit
    await page.click('button[type="submit"]')

    // Verify success
    await expect(page).toHaveURL(/.*dashboard|team/i)
  })

  test('should handle login errors', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'WrongPass123!')
    await page.click('button[type="submit"]')

    // Verify error message
    await expect(page.locator('text=invalid|incorrect')).toBeVisible()
  })
})
```

##### 2. 聊天功能流程

```typescript
// e2e/chat-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/i)
  })

  test('should send and receive messages', async ({ page }) => {
    // Open chat
    await page.click('button:has-text("Chat|聊天")')

    // Type message
    const input = page.locator(
      'input[placeholder*="message|消息"], textarea[placeholder*="message|消息"]'
    )
    await input.fill('Hello, AI!')

    // Send
    await page.click('button:has-text("Send|发送")')

    // Verify message appears
    await expect(page.locator('text=Hello, AI!')).toBeVisible()

    // Wait for AI response
    await page.waitForTimeout(2000)

    // Verify AI responded
    const messages = page.locator('[class*="message"]')
    await expect(messages).toHaveCount(2)
  })

  test('should select team member', async ({ page }) => {
    await page.click('button:has-text("Chat|聊天")')

    // Open member selector
    await page.click('button:has-text("Select Member|选择成员")')

    // Select member
    await page.click('text=Alice|Bob')

    // Verify selection
    await expect(page.locator('text=Alice|Bob')).toBeVisible()
  })
})
```

##### 3. 用户设置流程

```typescript
// e2e/settings-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Settings Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
  })

  test('should update user profile', async ({ page }) => {
    // Navigate to settings
    await page.click('a:has-text("Settings|设置")')
    await expect(page).toHaveURL(/.*settings/i)

    // Update name
    await page.fill('input[name="name"]', 'Updated Name')

    // Save
    await page.click('button:has-text("Save|保存")')

    // Verify success message
    await expect(page.locator('text=saved|保存成功')).toBeVisible()
  })

  test('should change theme', async ({ page }) => {
    await page.goto('/settings')

    // Toggle theme
    const themeToggle = page.locator('button:has-text("Theme|主题"), [aria-label*="theme|主题"]')
    await themeToggle.click()

    // Verify theme changed
    const body = page.locator('body')
    await expect(body).toHaveClass(/dark/i)
  })

  test('should upload avatar', async ({ page }) => {
    await page.goto('/settings')

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/test-avatar.png')

    // Wait for upload
    await page.waitForTimeout(2000)

    // Verify avatar updated
    const avatar = page.locator('img[alt*="avatar"]')
    await expect(avatar).toBeVisible()
  })
})
```

##### 4. 表单提交流程

```typescript
// e2e/contact-form.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Contact Form', () => {
  test('should submit contact form', async ({ page }) => {
    await page.goto('/contact')

    // Fill form
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('textarea[name="message"]', 'This is a test message')

    // Submit
    await page.click('button[type="submit"]')

    // Verify success
    await expect(page.locator('text=sent|发送成功')).toBeVisible()
  })

  test('should validate form fields', async ({ page }) => {
    await page.goto('/contact')

    // Submit empty form
    await page.click('button[type="submit"]')

    // Verify errors
    await expect(page.locator('text=required|必填')).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/contact')

    await page.fill('input[name="email"]', 'invalid-email')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=invalid email|无效邮箱')).toBeVisible()
  })
})
```

**预期成果**:

- 新增 4-5 个 E2E 测试套件
- 关键业务流程 100% 覆盖
- 回归测试时间: < 10 分钟

---

#### 建议 6: 增强视觉回归测试

**优先级**: 🟡 中
**工作量**: 2-3 天

**具体行动**:

```typescript
// e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
  test('homepage should match baseline', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('team page should match baseline', async ({ page }) => {
    await page.goto('/team')
    await expect(page).toHaveScreenshot('team-page.png', {
      fullPage: true,
      maxDiffPixels: 150,
    })
  })

  test('chat component should match baseline', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('button:has-text("Chat")')

    const chatContainer = page.locator('[class*="chat-container"]')
    await expect(chatContainer).toHaveScreenshot('chat-component.png', {
      maxDiffPixels: 50,
    })
  })

  test('responsive layouts should match baseline', async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await expect(page).toHaveScreenshot('homepage-mobile.png', { fullPage: true })

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await expect(page).toHaveScreenshot('homepage-tablet.png', { fullPage: true })

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')
    await expect(page).toHaveScreenshot('homepage-desktop.png', { fullPage: true })
  })
})
```

**预期成果**:

- 20+ 视觉回归测试
- 跨设备/浏览器视觉一致性保证
- 自动化视觉缺陷检测

---

### 4.4 性能测试改进

#### 建议 7: 添加性能测试

**优先级**: 🟡 中
**工作量**: 2-3 天

**具体行动**:

##### 1. 页面性能测试

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Page Performance', () => {
  test('homepage should load within performance budget', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime

    // Page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000)

    // Check Web Vitals
    const metrics = await page.evaluate(() => {
      return {
        // Largest Contentful Paint
        lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
        // First Input Delay
        fid: performance.getEntriesByType('first-input')[0]?.processingStart,
        // Cumulative Layout Shift
        cls: performance
          .getEntriesByType('layout-shift')
          .reduce((acc, entry) => acc + entry.value, 0),
      }
    })

    // LCP should be under 2.5s
    expect(metrics.lcp).toBeLessThan(2500)

    // CLS should be under 0.1
    expect(metrics.cls).toBeLessThan(0.1)
  })

  test('dashboard should load quickly', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const metrics = await page.evaluate(() => {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
        loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
      }
    })

    expect(metrics.domContentLoaded).toBeLessThan(1500)
  })
})

test.describe('Component Performance', () => {
  test('chat should render quickly', async ({ page }) => {
    await page.goto('/dashboard')

    const startTime = Date.now()
    await page.click('button:has-text("Chat|聊天")')
    const chatElement = page.locator('[class*="chat-container"]')
    await chatElement.waitFor()
    const renderTime = Date.now() - startTime

    // Chat should render in under 500ms
    expect(renderTime).toBeLessThan(500)
  })

  test('large list should render efficiently', async ({ page }) => {
    await page.goto('/portfolio')

    // Wait for all items to load
    const items = page.locator('[class*="project-card"]')
    await items.count()

    const renderTime = await page.evaluate(() => {
      return performance.now()
    })

    // Should render quickly
    expect(renderTime).toBeLessThan(2000)
  })
})
```

##### 2. API 性能测试

```typescript
// e2e/api-performance.spec.ts
import { test, expect } from '@playwright/test'

test.describe('API Performance', () => {
  test('status API should respond quickly', async ({ request }) => {
    const startTime = Date.now()
    const response = await request.get('/api/status')
    const responseTime = Date.now() - startTime

    expect(response.status()).toBe(200)
    expect(responseTime).toBeLessThan(500)
  })

  test('API should handle concurrent requests', async ({ request }) => {
    const startTime = Date.now()
    const requests = Array(10)
      .fill(null)
      .map(() => request.get('/api/status'))
    const responses = await Promise.all(requests)
    const totalTime = Date.now() - startTime

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200)
    })

    // Should handle 10 concurrent requests in under 2 seconds
    expect(totalTime).toBeLessThan(2000)
  })
})
```

**预期成果**:

- 10+ 性能测试用例
- Web Vitals 持续监控
- 性能回归自动检测

---

### 4.5 安全性测试改进

#### 建议 8: 添加安全性测试

**优先级**: 🔴 高
**工作量**: 2-3 天

**具体行动**:

##### 1. XSS 防护测试

```typescript
// src/lib/security/__tests__/xss.test.ts
import { describe, it, expect } from 'vitest'
import { sanitizeInput } from '../xss'

describe('XSS Protection', () => {
  it('should sanitize script tags', () => {
    const input = '<script>alert("xss")</script>'
    const output = sanitizeInput(input)
    expect(output).not.toContain('<script>')
    expect(output).not.toContain('alert')
  })

  it('should sanitize onclick handlers', () => {
    const input = '<div onclick="alert("xss")">Click</div>'
    const output = sanitizeInput(input)
    expect(output).not.toContain('onclick')
  })

  it('should allow safe HTML', () => {
    const input = '<p>Hello <strong>World</strong></p>'
    const output = sanitizeInput(input)
    expect(output).toContain('<p>')
    expect(output).toContain('<strong>')
  })
})
```

##### 2. CSRF 集成测试

```typescript
// e2e/csrf-protection.spec.ts
import { test, expect } from '@playwright/test'

test.describe('CSRF Protection', () => {
  test('should require CSRF token for POST requests', async ({ request }) => {
    const response = await request.post('/api/protected', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: { test: 'data' },
    })

    expect(response.status()).toBe(403)
  })

  test('should accept requests with valid CSRF token', async ({ page, request }) => {
    await page.goto('/')

    // Get CSRF token from page
    const csrfToken = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="csrf-token"]')
      return meta?.getAttribute('content')
    })

    // Make request with token
    const response = await request.post('/api/protected', {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',
      },
      data: { test: 'data' },
    })

    expect(response.status()).toBe(200)
  })
})
```

**预期成果**:

- 完整的安全测试套件
- XSS/CSRF 防护验证
- 定期安全审计支持

---

### 4.6 集成测试改进

#### 建议 9: 添加第三方服务集成测试

**优先级**: 🟡 中
**工作量**: 3-4 天

**具体行动**:

##### 1. EmailJS 集成测试

```typescript
// src/lib/emailjs/__tests__/integration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendEmail } from '../emailjs'

vi.mock('@emailjs/browser', () => ({
  init: vi.fn(),
  send: vi.fn(),
}))

describe('EmailJS Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send email successfully', async () => {
    vi.mocked(emailjs.send).mockResolvedValueOnce({ status: 200, text: 'OK' })

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      body: 'Test message',
    })

    expect(result.success).toBe(true)
  })

  it('should handle email sending failure', async () => {
    vi.mocked(emailjs.send).mockRejectedValueOnce(new Error('Failed'))

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      body: 'Test message',
    })

    expect(result.success).toBe(false)
  })
})
```

##### 2. GitHub API 集成测试

```typescript
// src/app/api/github/__tests__/integration.test.ts
import { describe, it, expect, vi } from 'vitest'
import { GET } from './commits/route'

describe('GitHub API Integration', () => {
  it('should fetch commits from GitHub', async () => {
    const response = await GET()
    const data = await response.json()

    expect(Array.isArray(data)).toBe(true)
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('sha')
      expect(data[0]).toHaveProperty('commit')
    }
  })

  it('should handle GitHub API errors', async () => {
    // Test with mock error response
    // Verify graceful error handling
  })
})
```

**预期成果**:

- 10+ 集成测试用例
- 第三方服务稳定性验证
- 错误处理流程覆盖

---

### 4.7 测试工具和配置改进

#### 建议 10: 改进测试配置和工具

**优先级**: 🟡 中
**工作量**: 1-2 天

**具体行动**:

##### 1. 改进 Vitest 配置

```typescript
// vitest.config.ts (增强版)
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.tsx'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}', 'app/**/*.{test,spec}.{js,ts,jsx,tsx}'],

    // 并发配置
    threads: true,
    maxThreads: 4,

    // 测试超时配置
    testTimeout: 10000,
    hookTimeout: 10000,

    // 失败时重试
    retry: 2,

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'text-summary'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        '**/stories/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

##### 2. 添加测试工具库

```typescript
// src/test/utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// 自定义渲染函数，包含 Providers
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  // Add providers here (IntlProvider, ThemeProvider, etc.)
  return render(ui, options)
}

// Mock localStorage
export class LocalStorageMock {
  store: Record<string, string> = {}

  clear() {
    this.store = {}
  }

  getItem(key: string) {
    return this.store[key] || null
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value)
  }

  removeItem(key: string) {
    delete this.store[key]
  }

  get length() {
    return Object.keys(this.store).length
  }

  key(index: number) {
    return Object.keys(this.store)[index] || null
  }
}

export const createMockStorage = () => {
  const localStorage = new LocalStorageMock()
  Object.defineProperty(window, 'localStorage', {
    value: localStorage,
  })
  return localStorage
}
```

##### 3. 添加测试断言工具

```typescript
// src/test/assertions.ts
import { expect } from 'vitest'

// 自定义断言
expect.extend({
  toHaveAccessibleErrorMessage(received: HTMLElement) {
    const hasError = received.getAttribute('aria-invalid') === 'true'
    const hasErrorMessage = received.querySelector('[aria-live], [role="alert"]')

    return {
      pass: hasError && hasErrorMessage !== null,
      message: () =>
        hasError
          ? `Element has accessible error message`
          : `Element does not have accessible error message`,
    }
  },

  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling
    return {
      pass,
      message: () =>
        pass
          ? `received ${received} is within range ${floor}-${ceiling}`
          : `received ${received} is not within range ${floor}-${ceiling}`,
    }
  },
})
```

**预期成果**:

- 改进的测试配置
- 可复用的测试工具库
- 提高测试编写效率

---

## 5. 实施路线图

### 5.1 分阶段实施计划

#### Phase 1: 关键优先级（Week 1-2）🔴

**目标**: 修复最严重的测试缺口

**任务**:

1. API 路由测试（建议 1）
2. API 安全测试（建议 2）
3. 聊天系统组件测试（建议 3 - Phase 1）
4. 关键业务流程 E2E 测试（建议 5）

**交付成果**:

- API 覆盖率: 11% → 90%
- 聊天组件覆盖率: 0% → 100%
- 新增 20-25 个测试文件
- CI/CD 集成完成

**成功指标**:

- 所有 API 端点有测试覆盖
- 聊天功能有完整的单元和 E2E 测试
- 测试执行时间 < 5 分钟

---

#### Phase 2: 核心功能完善（Week 3-4）🟡

**目标**: 完善核心业务功能测试

**任务**:

1. 用户设置组件测试（建议 3 - Phase 2）
2. 表单组件测试（建议 3 - Phase 3）
3. 页面组件集成测试（建议 4）
4. 性能测试（建议 7）
5. 安全性测试（建议 8）

**交付成果**:

- 组件覆盖率: 13% → 70%
- 页面覆盖率: 0% → 100%
- 新增 15-20 个测试文件
- 性能基线建立

**成功指标**:

- 核心组件 100% 覆盖
- 主要页面集成测试完成
- 性能回归检测启用

---

#### Phase 3: 质量提升和优化（Week 5-6）🟢

**目标**: 提升测试质量和效率

**任务**:

1. 视觉回归测试增强（建议 6）
2. 第三方服务集成测试（建议 9）
3. 测试工具和配置改进（建议 10）
4. 测试文档完善
5. 测试覆盖率提升到 80%+

**交付成果**:

- 视觉回归测试套件
- 集成测试完整覆盖
- 测试工具库
- 测试最佳实践文档

**成功指标**:

- 整体覆盖率: 46% → 80%
- 视觉回归测试: 20+ 场景
- 测试编写效率提升 30%

---

### 5.2 资源分配

| Phase    | 工作量       | 人员            | 时间     |
| -------- | ------------ | --------------- | -------- |
| Phase 1  | 8-10 天      | 1-2 开发 + 1 QA | 2 周     |
| Phase 2  | 8-10 天      | 1-2 开发 + 1 QA | 2 周     |
| Phase 3  | 6-8 天       | 1 开发 + 1 QA   | 2 周     |
| **总计** | **22-28 天** | -               | **6 周** |

---

### 5.3 风险和缓解措施

#### 风险 1: 测试编写工作量超预期

**影响**: 中
**概率**: 高
**缓解措施**:

- 优先级排序，先完成关键测试
- 使用测试生成工具辅助
- 从简单的测试开始，逐步增加复杂度

#### 风险 2: 测试执行时间过长

**影响**: 高
**概率**: 中
**缓解措施**:

- 使用并行测试执行
- 优化 mock 数据
- 分层测试策略（单元测试 > 集成测试 > E2E）

#### 风险 3: 遗留代码难以测试

**影响**: 中
**概率**: 中
**缓解措施**:

- 重构代码以增加可测试性
- 使用适配器模式隔离依赖
- 逐步替换而非一次性重写

#### 风险 4: CI/CD 环境不稳定

**影响**: 高
**概率**: 低
**缓解措施**:

- 使用稳定的 CI 环境
- 添加重试机制
- 监控和告警

---

## 6. 测试基础设施改进

### 6.1 CI/CD 集成

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:run -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright Report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run visual regression tests
        run: npx playwright test --project=visual-regression

      - name: Upload screenshots
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: screenshots
          path: test-results/
```

---

### 6.2 测试覆盖率目标

```typescript
// vitest.config.ts - 分阶段覆盖率目标
coverage: {
  thresholds: {
    // Phase 1 目标
    lines: 50,
    functions: 50,
    branches: 40,
    statements: 50,

    // Phase 2 目标
    // lines: 70,
    // functions: 70,
    // branches: 60,
    // statements: 70,

    // Phase 3 目标（最终目标）
    // lines: 80,
    // functions: 80,
    // branches: 70,
    // statements: 80,
  },
}
```

---

### 6.3 测试报告和监控

#### 自动化测试报告

1. **覆盖率报告**
   - HTML 报告（本地查看）
   - Codecov 集成（PR 审查）
   - 覆盖率趋势追踪

2. **测试结果报告**
   - JUnit XML（CI 集成）
   - HTML 报告（Playwright）
   - 失败测试截图和视频

3. **性能监控**
   - Lighthouse CI 集成
   - Web Vitals 追踪
   - 性能回归告警

---

## 7. 测试最佳实践

### 7.1 编写可维护的测试

#### 1. 遵循 AAA 模式

```typescript
test('should update user profile', async () => {
  // Arrange (准备)
  const user = createMockUser()
  const updates = { name: 'New Name' }

  // Act (执行)
  const result = await updateUser(user.id, updates)

  // Assert (断言)
  expect(result.name).toBe('New Name')
})
```

#### 2. 使用描述性的测试名称

```typescript
// ❌ 不好
test('it works', () => {})

// ✅ 好
test('should update user name when valid data provided', () => {})
```

#### 3. 测试一件事

```typescript
// ❌ 不好 - 测试多件事
test('user operations', () => {
  const user = createUser()
  expect(user).toBeDefined()
  user.name = 'New'
  expect(user.name).toBe('New')
})

// ✅ 好 - 每个测试一件事
test('should create user', () => {
  const user = createUser()
  expect(user).toBeDefined()
})

test('should update user name', () => {
  const user = createUser()
  user.name = 'New'
  expect(user.name).toBe('New')
})
```

---

### 7.2 Mock 和 Stub 的使用

#### 何时使用 Mock

- 外部 API 调用
- 数据库操作
- 文件系统操作
- 时间相关逻辑

```typescript
import { vi } from 'vitest'

// Mock 外部 API
vi.mock('@/lib/api', () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: '1', name: 'Test' }),
}))

// Mock 时间
vi.useFakeTimers()
vi.setSystemTime(new Date('2024-01-01'))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
```

---

### 7.3 测试隔离

#### 保持测试独立

```typescript
describe('User Service', () => {
  // 每个测试前清理
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  // 每个测试后清理
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('test 1', () => {
    // 独立的测试逻辑
  })

  test('test 2', () => {
    // 独立的测试逻辑，不依赖 test 1
  })
})
```

---

### 7.4 测试数据管理

#### 使用工厂模式创建测试数据

```typescript
// src/test/factories.ts
export const createUser = (overrides = {}) => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides,
})

export const createMessage = (overrides = {}) => ({
  id: '1',
  content: 'Test message',
  sender: 'user',
  timestamp: new Date(),
  ...overrides,
})

// 使用
test('should send message', () => {
  const message = createMessage({ content: 'Custom content' })
  // ...
})
```

---

## 8. 总结和建议

### 8.1 关键成果回顾

| 指标           | 当前状态 | Phase 1  | Phase 2  | Phase 3  |
| -------------- | -------- | -------- | -------- | -------- |
| **整体覆盖率** | 46%      | 55%      | 70%      | 80%+     |
| **API 覆盖率** | 11%      | 90%      | 90%      | 90%      |
| **组件覆盖率** | 13%      | 40%      | 70%      | 80%      |
| **页面覆盖率** | 0%       | 20%      | 60%      | 80%      |
| **E2E 覆盖率** | 基础     | 关键流程 | 核心流程 | 完整流程 |
| **测试文件数** | 99       | 120      | 140      | 160+     |

---

### 8.2 立即行动项（本周）

**优先级排序**:

1. ✅ **立即执行**:
   - 创建 API 测试模板（1 天）
   - 为 CSRF Token 端点编写测试（1 天）
   - 为 ChatMessage 组件编写测试（0.5 天）

2. 📅 **本周完成**:
   - 完成所有 API 路由测试（3 天）
   - 完成聊天组件测试（2 天）
   - 设置 CI/CD 集成（1 天）

3. 🎯 **下周计划**:
   - 开始 Phase 2 任务
   - 性能测试基线建立
   - 安全测试套件

---

### 8.3 长期建议

#### 1. 建立测试文化

- 要求新功能必须包含测试
- 代码审查时检查测试覆盖率
- 定期进行测试审查会议

#### 2. 持续改进

- 每月回顾测试覆盖率
- 优化慢速测试
- 更新测试最佳实践文档

#### 3. 投资测试工具

- 考虑使用测试生成工具
- 探索 AI 辅助测试
- 投资性能和视觉回归工具

---

### 8.4 成功度量

#### 定量指标

- 测试覆盖率 > 80%
- 测试执行时间 < 10 分钟
- 测试稳定性 > 95%
- 缺陷逃逸率 < 5%

#### 定性指标

- 开发者对测试的信心提升
- 新功能开发速度加快
- 代码重构更加安全
- 用户体验改善

---

## 附录

### A. 推荐测试工具和库

| 工具            | 用途           | 链接                                          |
| --------------- | -------------- | --------------------------------------------- |
| Vitest          | 单元测试框架   | https://vitest.dev                            |
| Playwright      | E2E 测试框架   | https://playwright.dev                        |
| Testing Library | React 组件测试 | https://testing-library.com                   |
| MSW             | API Mocking    | https://mswjs.io                              |
| Faker.js        | 测试数据生成   | https://fakerjs.dev                           |
| Codecov         | 覆盖率追踪     | https://codecov.io                            |
| Lighthouse CI   | 性能测试       | https://github.com/GoogleChrome/lighthouse-ci |

### B. 有用的测试资源

- [Vitest 官方文档](https://vitest.dev/)
- [Playwright 最佳实践](https://playwright.dev/docs/best-practices)
- [Testing Library 指南](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Google 软件测试原则](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html)

### C. 联系和支持

如有问题或需要进一步讨论，请联系：

- 测试负责人：[待指定]
- DevOps 团队：[待指定]
- 项目经理：[待指定]

---

**文档版本**: 1.0
**最后更新**: 2026-03-18
**下次审查**: 2026-04-01
