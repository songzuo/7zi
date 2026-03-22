# 使用示例

**最后更新**: 2026-03-06

本文档提供 7zi Studio API 的实际使用示例。

---

## 目录

1. [环境配置](#环境配置)
2. [基础示例](#基础示例)
3. [React 示例](#react-示例)
4. [命令行示例](#命令行示例)
5. [完整工作流](#完整工作流)

---

## 环境配置

### 1. 获取 GitHub Token

1. 访问 [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 复制生成的 Token

### 2. 配置环境变量

```bash
# .env.local
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=songzuo
GITHUB_REPO=7zi
```

---

## 基础示例

### JavaScript/Fetch

```javascript
// fetch-issues.js
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'songzuo';
const REPO = '7zi';

async function getIssues() {
  const response = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=all&per_page=50`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${GITHUB_TOKEN}`
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const issues = await response.json();
  // 过滤掉 Pull Requests
  return issues.filter(issue => !issue.pull_request);
}

getIssues()
  .then(issues => {
    console.log(`获取到 ${issues.length} 个 Issues`);
    issues.forEach(issue => {
      console.log(`#${issue.number}: ${issue.title} [${issue.state}]`);
    });
  })
  .catch(console.error);
```

**运行**:

```bash
GITHUB_TOKEN=your_token node fetch-issues.js
```

---

### Python

```python
# fetch_issues.py
import os
import requests

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
OWNER = "songzuo"
REPO = "7zi"

def get_issues():
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/issues"
    params = {"state": "all", "per_page": 50}
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {GITHUB_TOKEN}"
    }
    
    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()
    
    issues = response.json()
    # 过滤掉 Pull Requests
    return [i for i in issues if "pull_request" not in i]

if __name__ == "__main__":
    issues = get_issues()
    print(f"获取到 {len(issues)} 个 Issues")
    for issue in issues:
        print(f"#{issue['number']}: {issue['title']} [{issue['state']}]")
```

**运行**:

```bash
export GITHUB_TOKEN=your_token
python fetch_issues.py
```

---

## React 示例

### 使用自定义 Hook

```tsx
// components/TeamDashboard.tsx
'use client';

import { useState, useEffect } from 'react';

interface Issue {
  number: number;
  title: string;
  state: string;
  assignee: { login: string } | null;
}

interface Commit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
}

export default function TeamDashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
        const headers = {
          Accept: 'application/vnd.github.v3+json',
          ...(token && { Authorization: `token ${token}` })
        };

        const [issuesRes, commitsRes] = await Promise.all([
          fetch('https://api.github.com/repos/songzuo/7zi/issues?state=all', { headers }),
          fetch('https://api.github.com/repos/songzuo/7zi/commits?per_page=10', { headers })
        ]);

        if (!issuesRes.ok || !commitsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const issuesData = await issuesRes.json();
        const commitsData = await commitsRes.json();

        setIssues(issuesData.filter((i: any) => !i.pull_request));
        setCommits(commitsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">团队看板</h1>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-xl font-semibold">活跃 Issues ({issues.length})</h2>
          <ul className="mt-2">
            {issues.slice(0, 5).map(issue => (
              <li key={issue.number} className="py-2 border-b">
                #{issue.number} {issue.title}
                <span className="ml-2 text-sm text-gray-500">
                  [{issue.assignee?.login || '未分配'}]
                </span>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold">最近 Commits ({commits.length})</h2>
          <ul className="mt-2">
            {commits.slice(0, 5).map(commit => (
              <li key={commit.sha} className="py-2 border-b text-sm">
                <code className="text-xs">{commit.sha.slice(0, 7)}</code>
                <p className="truncate">{commit.commit.message}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

## 命令行示例

### 使用 curl

```bash
# 设置变量
TOKEN="your_github_token"
OWNER="songzuo"
REPO="7zi"

# 获取 Open 状态的 Issues
curl -s -H "Authorization: token $TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     "https://api.github.com/repos/$OWNER/$REPO/issues?state=open" | \
  jq '.[] | "#\(.number): \(.title)"'

# 获取最近的 Commits
curl -s -H "Authorization: token $TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     "https://api.github.com/repos/$OWNER/$REPO/commits?per_page=5" | \
  jq '.[] | "\(.sha[0:7]) - \(.commit.message | split("\n")[0])"'
```

### 使用 GitHub CLI

```bash
# 安装 GitHub CLI
# brew install gh

# 登录
gh auth login

# 查看 Issues
gh issue list --repo songzuo/7zi --state all

# 查看 Commits
gh repo view songzuo/7zi --json commits

# 创建 Issue
gh issue create --repo songzuo/7zi \
  --title "新功能请求" \
  --body "请添加XXX功能"

# 创建 PR
gh pr create --repo songzuo/7zi \
  --title "功能实现" \
  --body "实现了XXX功能" \
  --base master
```

---

## 完整工作流

### 自动化任务同步

```javascript
// sync-tasks.js
// 完整的工作流示例：同步 GitHub Issues 到本地

const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'songzuo';
const REPO = '7zi';

async function syncTasks() {
  console.log('🚀 开始同步任务...');
  
  // 1. 获取所有 Issues
  const issuesRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=all&per_page=100`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${GITHUB_TOKEN}`
      }
    }
  );
  
  const allIssues = await issuesRes.json();
  const tasks = allIssues
    .filter(issue => !issue.pull_request)
    .map(issue => ({
      id: issue.number,
      title: issue.title,
      state: issue.state,
      assignee: issue.assignee?.login || null,
      labels: issue.labels.map(l => l.name),
      created: issue.created_at,
      updated: issue.updated_at,
      url: issue.html_url
    }));
  
  // 2. 保存到本地文件
  const outputPath = path.join(__dirname, 'data', 'tasks.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(tasks, null, 2));
  
  console.log(`✅ 已同步 ${tasks.length} 个任务到 ${outputPath}`);
  
  // 3. 统计
  const openCount = tasks.filter(t => t.state === 'open').length;
  const closedCount = tasks.filter(t => t.state === 'closed').length;
  console.log(`📊 统计: ${openCount} 开放 / ${closedCount} 已关闭`);
}

syncTasks().catch(console.error);
```

---

## 调试技巧

### 检查 API 速率限制

```bash
curl -H "Authorization: token YOUR_TOKEN" \
     https://api.github.com/rate_limit | jq
```

### 调试请求

```javascript
// 添加详细日志
fetch(url, {
  headers: { ... },
  // 调试：打印响应
}).then(async res => {
  console.log('Status:', res.status);
  console.log('Headers:', [...res.headers.entries()]);
  const data = await res.json();
  console.log('Data:', JSON.stringify(data, null, 2));
  return data;
});
```

---

## 相关文档

- [API-REFERENCE.md](./API-REFERENCE.md) - API 详细参考
- [GITHUB-INTEGRATION.md](./GITHUB-INTEGRATION.md) - GitHub 集成配置
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南

---

*示例由 7zi Studio AI 团队维护 🤖*
