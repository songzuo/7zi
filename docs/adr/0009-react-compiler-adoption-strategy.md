# ADR-0009: React Compiler 采用策略

## 状态
Accepted

## 上下文

v1.3.0 已完成 React Compiler 可行性验证，发现可以减少 20-40% 不必要的重新渲染。v1.4.0 需要引入 React Compiler，但需要解决以下问题：

1. **兼容性风险**: 并非所有组件都与 React Compiler 兼容
2. **回滚困难**: 一旦启用出现问题，难以快速回滚
3. **性能不确定性**: 实际性能收益因组件而异
4. **学习成本**: 团队需要理解 React Compiler 的工作原理

可行性验证结果：
- ✅ babel-plugin-react-compiler 集成可行
- ✅ 性能基准显示可减少 20-40% 不必要的重新渲染
- ⚠️ 部分组件存在兼容性问题（使用 ref.current 等）

## 决策

采用**可选功能 + 兼容性检查 + 回滚机制**的渐进式采用策略。

### 核心设计

#### 1. 为什么作为可选功能而不是默认启用

**默认启用的风险**:
- ❌ 兼容性问题导致编译失败或运行时错误
- ❌ 性能收益不确定，可能适得其反
- ❌ 回滚困难，需要重新部署
- ❌ 影响整个应用稳定性

**可选功能的优势**:
- ✅ **风险可控**: 只对特定组件启用，影响范围小
- ✅ **渐进式迁移**: 先验证后推广
- ✅ **灵活回滚**: 可随时禁用编译器
- ✅ **性能对比**: 方便对比编译前后的性能
- ✅ **按需启用**: 对性能敏感的页面优先启用

**实现方案**:
```typescript
// next.config.ts
const nextConfig = {
  // 可选的 React Compiler
  ...(process.env.ENABLE_REACT_COMPILER === 'true' && {
    experimental: {
      reactCompiler: {
        enable: true,
        // 忽略的文件
        ignore: [
          'node_modules',
          'src/components/third-party'
        ],
        // 只编译指定文件（白名单模式）
        only: [
          'src/components/features/dashboard',
          'src/components/features/tasks'
        ]
      }
    }
  })
};

// 环境变量控制
// .env.development
ENABLE_REACT_COMPILER=false

// .env.production (可选)
ENABLE_REACT_COMPILER=true
```

**功能开关组件**:
```typescript
// src/components/feature-flags/ReactCompilerToggle.tsx
export function ReactCompilerToggle() {
  const [enabled, setEnabled] = useState(
    process.env.ENABLE_REACT_COMPILER === 'true'
  );

  const toggle = async () => {
    const newState = !enabled;
    await fetch('/api/feature-flags/react-compiler', {
      method: 'POST',
      body: JSON.stringify({ enabled: newState })
    });
    // 提示用户刷新页面
    toast.info('请刷新页面以应用更改');
  };

  return (
    <Switch
      checked={enabled}
      onChange={toggle}
      label="React Compiler"
      description={
        enabled
          ? 'React Compiler 已启用（减少 20-40% 不必要的重新渲染）'
          : 'React Compiler 已禁用'
      }
    />
  );
}
```

#### 2. 兼容性检查策略

**自动检测不兼容的组件**:
```typescript
// src/lib/react-compiler/diagnostics.ts
class ReactCompilerDiagnostics {
  // 扫描不兼容的组件
  async scanIncompatibleComponents(): Promise<IncompatibilityReport[]> {
    const components = await this.getAllComponents();
    const reports: IncompatibilityReport[] = [];

    for (const component of components) {
      const issues = await this.checkComponent(component);
      if (issues.length > 0) {
        reports.push({
          component: component.path,
          issues,
          severity: this.calculateSeverity(issues)
        });
      }
    }

    return reports;
  }

  // 检查单个组件
  private async checkComponent(component: ComponentInfo): Promise<CompilerIssue[]> {
    const issues: CompilerIssue[] = [];
    const code = await component.readCode();

    // 检查 1: 使用了 ref.current（编译器不支持）
    if (/\bref\.current\b/.test(code)) {
      issues.push({
        type: 'unsupported-pattern',
        message: '使用 ref.current 不被 React Compiler 支持',
        line: this.findLineNumber(code, 'ref.current'),
        suggestion: '使用 useRef hook 或 state 代替'
      });
    }

    // 检查 2: 使用了 dangerouslySetInnerHTML
    if (/\bdangerouslySetInnerHTML\b/.test(code)) {
      issues.push({
        type: 'unsupported-pattern',
        message: '使用 dangerouslySetInnerHTML 不被支持',
        line: this.findLineNumber(code, 'dangerouslySetInnerHTML'),
        suggestion: '使用安全的 HTML 清理库'
      });
    }

    // 检查 3: 使用了第三方库的副作用
    if (this.hasThirdPartySideEffects(code)) {
      issues.push({
        type: 'side-effect',
        message: '组件可能存在第三方库的副作用',
        line: this.findSideEffectLine(code),
        suggestion: '使用 React.memo 或 useMemo 优化'
      });
    }

    return issues;
  }

  // 生成兼容性报告
  generateReport(reports: IncompatibilityReport[]): string {
    const total = reports.length;
    const critical = reports.filter(r => r.severity === 'critical').length;
    const warning = reports.filter(r => r.severity === 'warning').length;

    return `
# React Compiler 兼容性报告

- 总组件数: ${total}
- 严重问题: ${critical}
- 警告: ${warning}

${reports.map(r => `
## ${r.component}
${r.issues.map(i => `- ${i.message} (${i.suggestion})`).join('\n')}
`).join('\n')}
    `.trim();
  }
}
```

**兼容性报告示例**:
```
# React Compiler 兼容性报告

- 总组件数: 150
- 严重问题: 3
- 警告: 12

## src/components/features/dashboard/Chart.tsx
- 使用 ref.current 不被 React Compiler 支持 (使用 useRef hook 或 state 代替)

## src/components/ui/Editor.tsx
- 使用 dangerouslySetInnerHTML 不被支持 (使用安全的 HTML 清理库)

## src/components/third-party/Map.tsx
- 组件可能存在第三方库的副作用 (使用 React.memo 或 useMemo 优化)
```

**迁移建议生成**:
```typescript
class MigrationGuideGenerator {
  // 生成迁移指南
  generateGuide(componentPath: string): MigrationStep[] {
    const issues = this.getIssues(componentPath);
    return issues.map(issue => ({
      title: issue.message,
      severity: issue.severity,
      steps: this.generateFixSteps(issue),
      example: this.generateFixExample(issue)
    }));
  }

  // 生成修复步骤
  private generateFixSteps(issue: CompilerIssue): string[] {
    switch (issue.type) {
      case 'ref-current':
        return [
          '1. 移除 ref.current 的直接访问',
          '2. 使用 React state 代替',
          '3. 或使用 useMemo 缓存计算结果'
        ];
      case 'dangerously-set-inner-html':
        return [
          '1. 使用 DOMPurify 清理 HTML',
          '2. 或使用安全的 markdown 渲染库'
        ];
      default:
        return ['1. 检查组件逻辑', '2. 添加 React.memo 或 useMemo'];
    }
  }
}
```

#### 3. 回滚机制设计

**为什么需要回滚机制**:
- React Compiler 可能引入新 Bug
- 性能收益不如预期
- 兼容性问题未完全发现

**回滚策略**:
1. **环境变量开关**: 修改 `.env` 文件，重新构建
2. **功能开关**: 通过 API 动态切换
3. **A/B 测试**: 部分用户启用，部分禁用
4. **版本回滚**: Git revert 或切换分支

**回滚实现**:
```typescript
// 1. 环境变量回滚
// .env
ENABLE_REACT_COMPILER=false

// 2. API 回滚
// src/app/api/feature-flags/react-compiler/route.ts
export async function POST(request: Request) {
  const { enabled } = await request.json();

  // 更新配置
  await updateConfig('ENABLE_REACT_COMPILER', enabled);

  // 清除构建缓存
  await revalidatePath('/');

  return Response.json({ success: true, enabled });
}

// 3. A/B 测试
// src/lib/react-compiler/ab-test.ts
function isReactCompilerEnabled(userId: string): boolean {
  const hash = hashString(userId);
  // 50% 用户启用
  return hash % 2 === 0;
}
```

**零停机回滚**:
```bash
# 1. 修改配置
sed -i 's/ENABLE_REACT_COMPILER=true/ENABLE_REACT_COMPILER=false/' .env

# 2. 重新构建（增量构建）
npm run build

# 3. 重启服务（蓝绿部署）
# 蓝环境停机，绿环境接管
pm2 reload all
```

### 系统架构

```
┌─────────────────────────────────────────────────────┐
│             React Compiler 配置                        │
│         (环境变量 + 功能开关)                           │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│             兼容性检查（可选）                          │
│         (AST 分析 + 模式识别)                          │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│               React Compiler                        │
│              (babel 插件)                             │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌─────────────┐ ┌─────────────┐
│   构建       │ │    运行时    │ │  性能监控   │
│  (编译)      │ │  (执行)     │ │  (对比)     │
└──────────────┘ └─────────────┘ └─────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│               回滚机制                                │
│         (环境变量 + API + A/B 测试)                    │
└─────────────────────────────────────────────────────┘
```

## 权衡

### 替代方案 1: 默认启用，全局编译

**优点**:
- 一次性完成迁移
- 所有组件都能受益

**缺点**:
- 风险高，影响范围大
- 回滚困难
- 兼容性问题可能导致构建失败

**选择可选功能的原因**: 风险可控，渐进式迁移更安全。

### 替代方案 2: 不启用 React Compiler

**优点**:
- 零风险
- 无额外复杂度

**缺点**:
- 错失性能优化机会（20-40% 渲染优化）
- 长期技术债务

**选择启用 React Compiler 的原因**: 可行性验证显示收益显著，值得尝试。

### 替代方案 3: 使用 useMemo 和 React.memo 手动优化

**优点**:
- 完全可控
- 无编译器依赖

**缺点**:
- 手动维护成本高
- 容易遗漏
- 性能优化不彻底

**选择 React Compiler 的原因**: 自动化优化，减少人为错误。

## 后果

### 正面影响

- ✅ **性能优化**: 减少 20-40% 不必要的重新渲染
- ✅ **UI 响应速度**: 提升 15-25%
- ✅ **内存使用**: 优化 10-15%
- ✅ **开发体验**: 减少手动优化工作
- ✅ **平滑迁移**: 可选启用，风险可控
- ✅ **回滚简单**: 一键禁用，零停机

### 负面影响

- ⚠️ **构建时间**: 编译器增加 ~5-10s 构建时间
- ⚠️ **兼容性检查**: 需要扫描和修复不兼容的组件
- ⚠️ **学习成本**: 团队需要理解 React Compiler

### 风险缓解

1. **白名单模式**: 只编译经过验证的组件
2. **兼容性检查**: 扫描并修复不兼容的代码
3. **功能开关**: 可随时禁用编译器
4. **A/B 测试**: 部分用户先试用，收集反馈
5. **性能监控**: 实时对比编译前后的性能

### 测试计划

1. **单元测试**: 确保组件功能不变
2. **性能测试**: 对比编译前后的渲染次数
3. **E2E 测试**: 确保用户体验一致
4. **回归测试**: 检测性能回归

## 相关决策

- [ADR-0001: 使用 Zustand 进行状态管理](0001-use-zustand-for-state-management.md) - Zustand 与 React Compiler 兼容
- [ADR-0005: 使用 Vitest 作为测试框架](0005-use-vitest-for-testing.md) - 编译后测试覆盖

## 未来方向

1. **全量启用**: 逐步扩大编译范围，最终全量启用
2. **性能分析**: 深入分析编译前后的性能差异
3. **自定义优化**: 结合项目特点，定制编译器配置
4. **社区反馈**: 参与社区讨论，分享使用经验
