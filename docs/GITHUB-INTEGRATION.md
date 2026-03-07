# GitHub API 集成指南

**最后更新**: 2026-03-06  
**状态**: ✅ 已配置  
**API 版本**: REST API v3 + GraphQL API v4

---

## 📋 目录

1. [概述](#概述)
2. [认证配置](#认证配置)
3. [API 使用](#api 使用)
4. [Webhook 配置](#webhook 配置)
5. [常见问题](#常见问题)

---

## 概述

7zi Studio 与 GitHub 深度集成，支持：

- ✅ 仓库管理
- ✅ Issue 追踪
- ✅ Pull Request 自动化
- ✅ GitHub Actions 触发
- ✅ Webhook 事件处理
- ✅ 代码审查辅助

### 集成能力

| 功能 | 状态 | 说明 |
|------|------|------|
| 仓库读取 | ✅ | 读取代码、分支、标签 |
| Issue 管理 | ✅ | 创建/更新/关闭 Issue |
| PR 自动化 | ✅ | 自动审查、标签、分配 |
| Actions 触发 | ✅ | 通过 API 触发工作流 |
| Webhook 接收 | ✅ | 接收 Push、PR、Issue 事件 |
| 代码提交 | ✅ | 创建/更新文件 |

---

## 认证配置

### 1. 创建 Personal Access Token

1. 访问 GitHub Settings → Developer settings → Personal access tokens
2. 选择 "Tokens (classic)" 或 "Fine-grained tokens"
3. 设置权限范围 (scopes)

### 2. 所需权限

```
✅ repo - 完整仓库控制
✅ workflow - 管理 GitHub Actions
✅ admin:org - 组织管理 (如需)
✅ read:user - 读取用户信息
✅ user:email - 读取邮箱
```

### 3. 配置环境变量

```bash
# .env.local
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=songzuo
GITHUB_REPO=7zi
```

### 4. 安全存储

```bash
# 使用 OpenClaw secrets
openclaw secrets set GITHUB_TOKEN "ghp_xxx"

# 或使用 Git secrets
git secrets --register-provider
git secrets --add "ghp_.*"
```

---

## API 使用

### REST API 示例

#### 获取仓库信息

```typescript
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

async function getRepoInfo() {
  const { data } = await octokit.repos.get({
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!
  });
  
  return data;
}
```

#### 创建 Issue

```typescript
async function createIssue(title: string, body: string, labels?: string[]) {
  const { data } = await octokit.issues.create({
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
    title,
    body,
    labels
  });
  
  return data;
}
```

#### 获取 Pull Request

```typescript
async function getPullRequests(state: 'open' | 'closed' | 'all' = 'open') {
  const { data } = await octokit.pulls.list({
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
    state
  });
  
  return data;
}
```

#### 提交文件

```typescript
async function commitFile(
  path: string,
  content: string,
  message: string,
  branch: string = 'main'
) {
  // 获取当前文件 SHA
  const { data: file } = await octokit.repos.getContent({
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
    path,
    ref: branch
  }).catch(() => ({ data: null }));

  // 创建/更新文件
  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    sha: file?.sha,
    branch
  });

  return data;
}
```

### GraphQL API 示例

```typescript
import { graphql } from '@octokit/graphql';

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN}`
  }
});

async function getRepositoryInfo() {
  const query = `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        name
        description
        stargazerCount
        forkCount
        defaultBranchRef {
          name
          target {
            ... on Commit {
              history(first: 10) {
                nodes {
                  message
                  authoredDate
                  author {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await graphqlWithAuth(query, {
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!
  });

  return result.repository;
}
```

---

## Webhook 配置

### 1. 创建 Webhook

```bash
# 使用 GitHub CLI
gh api \
  /repos/songzuo/7zi/hooks \
  -f config.url="https://7zi.com/api/webhooks/github" \
  -f config.content_type="json" \
  -f config.secret="your-webhook-secret" \
  -f events[]=push \
  -f events[]=pull_request \
  -f events[]=issues \
  -f active=true
```

### 2. 支持的事件

| 事件 | 触发条件 | 用途 |
|------|---------|------|
| `push` | 代码推送 | 触发部署、更新缓存 |
| `pull_request` | PR 创建/更新 | 自动审查、运行测试 |
| `issues` | Issue 操作 | 同步到任务系统 |
| `release` | 发布新版本 | 触发构建流程 |
| `workflow_run` | Actions 完成 | 通知状态 |

### 3. Webhook 处理

```typescript
// /api/webhooks/github.ts
import { verify } from '@octokit/webhooks-methods';

export async function POST(req: Request) {
  const signature = req.headers.get('x-hub-signature-256');
  const event = req.headers.get('x-github-event');
  const body = await req.text();

  // 验证签名
  const isValid = await verify(
    process.env.GITHUB_WEBHOOK_SECRET!,
    body,
    signature!
  );

  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const payload = JSON.parse(body);

  // 处理不同事件
  switch (event) {
    case 'push':
      await handlePush(payload);
      break;
    case 'pull_request':
      await handlePullRequest(payload);
      break;
    case 'issues':
      await handleIssue(payload);
      break;
  }

  return new Response('OK', { status: 200 });
}

async function handlePush(payload: any) {
  const { repository, ref, commits } = payload;
  
  // 记录推送
  console.log(`Push to ${ref} by ${payload.sender.login}`);
  
  // 触发部署
  if (ref === 'refs/heads/main') {
    await triggerDeployment();
  }
}

async function handlePullRequest(payload: any) {
  const { action, pull_request } = payload;
  
  if (action === 'opened') {
    // 自动添加标签
    await addLabels(pull_request.number);
    
    // 分配审查者
    await assignReviewers(pull_request.number);
  }
}
```

### 4. 测试 Webhook

```bash
# 发送测试事件
gh api \
  /repos/songzuo/7zi/hooks/{hook_id}/tests \
  -f hook_id=123456789
```

---

## GitHub Actions 集成

### 触发工作流

```typescript
async function triggerWorkflow(
  workflowId: string,
  ref: string = 'main',
  inputs?: Record<string, string>
) {
  const { data } = await octokit.actions.createWorkflowDispatch({
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
    workflow_id: workflowId,
    ref,
    inputs
  });

  return data;
}

// 使用示例
await triggerWorkflow('deploy.yml', 'main', {
  environment: 'production',
  version: '1.0.0'
});
```

### 工作流文件示例

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'production'
      version:
        description: 'Version to deploy'
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to 7zi.com
        run: |
          ./deploy.sh ${{ github.event.inputs.environment }}
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

---

## 常见问题

### Q1: Token 权限不足

**错误**: `403 Forbidden`

**解决**:
1. 检查 Token 的 scopes 设置
2. 重新生成 Token 并授予所需权限
3. 更新环境变量

### Q2: 速率限制

**错误**: `403 rate limit exceeded`

**解决**:
```typescript
// 检查速率限制
const { data } = await octokit.rateLimit.get();
console.log(data.resources.core.remaining);

// 使用重试逻辑
import { retry } from "@octokit/plugin-retry";
const MyOctokit = Octokit.plugin(retry);
```

### Q3: Webhook 签名验证失败

**错误**: `Invalid signature`

**解决**:
1. 确认 Webhook Secret 一致
2. 检查编码格式 (UTF-8)
3. 使用原始 body 进行验证

### Q4: 大文件提交失败

**错误**: `file too large`

**解决**:
- 使用 Git LFS 管理大文件
- 或使用 GitHub Contents API 的分块上传

---

## 最佳实践

### 1. 错误处理

```typescript
try {
  await octokit.repos.get({ owner, repo });
} catch (error) {
  if (error.status === 404) {
    console.error('Repository not found');
  } else if (error.status === 403) {
    console.error('Permission denied');
  } else {
    console.error('GitHub API error:', error);
  }
}
```

### 2. 缓存

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 分钟

async function getCachedRepoInfo() {
  const cached = cache.get('repo-info');
  if (cached) return cached;

  const info = await getRepoInfo();
  cache.set('repo-info', info);
  return info;
}
```

### 3. 日志记录

```typescript
import { logger } from '../utils/logger';

async function createIssue(title: string, body: string) {
  logger.info('Creating GitHub issue', { title });
  
  try {
    const result = await octokit.issues.create({ /* ... */ });
    logger.info('Issue created', { id: result.data.id });
    return result.data;
  } catch (error) {
    logger.error('Failed to create issue', { error, title });
    throw error;
  }
}
```

---

## 参考资源

- [GitHub REST API 文档](https://docs.github.com/en/rest)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [Octokit 文档](https://octokit.github.io/rest.js/)
- [GitHub Webhooks](https://docs.github.com/en/developers/webhooks-and-events)

---

*本集成由 7zi Studio AI 团队维护*
