# 敏感信息防护规范

**生效时间**: 2026-03-16  
**优先级**: 最高

---

## 核心原则

1. **禁止硬编码**: 任何敏感信息不得硬编码在代码中
2. **环境变量**: 使用 `.env` 文件 + 环境变量
3. **模板文件**: 提供 `.env.example` 作为模板
4. **Git 忽略**: `.env` 必须加入 `.gitignore`
5. **推送前扫描**: 每次 commit/push 前运行 secret-scanner.sh

---

## 敏感信息类型

| 类型 | 示例 | 风险等级 |
|------|------|----------|
| **GitHub Token** | `ghp_xxxx`, `github_pat_xxxx` | 🔴 高 |
| **API Keys** | `sk-xxxx`, `AKIAxxxx` | 🔴 高 |
| **私钥** | `-----BEGIN PRIVATE KEY-----` | 🔴 高 |
| **密码** | `password=xxxx` | 🟠 中 |
| **Secret** | `secret=xxxx` | 🟠 中 |

---

## 正确做法

### ✅ 使用环境变量

```javascript
// ❌ 错误：硬编码
const token = "ghp_xxxxxxxxxxxxxxxxxxxx";

// ✅ 正确：环境变量
const token = process.env.GITHUB_TOKEN;
```

### ✅ 使用 .env 文件

```bash
# .env (不提交到 git)
GITHUB_TOKEN=ghp_xxxx
CLOB_API_SECRET=your_secret

# .env.example (提交到 git)
GITHUB_TOKEN=your_token_here
CLOB_API_SECRET=your_secret_here
```

### ✅ 使用 .gitignore

```gitignore
.env
.env.local
*.pem
*.key
secrets.json
```

---

## 工作流程

### 开发时

1. 复制 `.env.example` 为 `.env`
2. 在 `.env` 中填写真实值
3. 代码中使用 `process.env.VAR_NAME`

### Commit 前

```bash
# 运行敏感信息扫描
./tools/secret-scanner.sh

# 如果发现问题，修复后再 commit
```

### Push 前

```bash
# 再次扫描
./tools/secret-scanner.sh

# 确认无误后推送
git push origin main
```

---

## 自动化集成

### Git Hook (推荐)

创建 `.git/hooks/pre-commit`:

```bash
#!/bin/bash
if [ -f "./tools/secret-scanner.sh" ]; then
  ./tools/secret-scanner.sh || exit 1
fi
```

### CI/CD 检查

在 CI 流程中添加：
```yaml
- name: Scan for secrets
  run: ./tools/secret-scanner.sh
```

---

## 违规处理

### 发现历史 commit 中有敏感信息

1. **立即**: 在 GitHub 撤销该 token/密码
2. **修复**: 使用 `git filter-branch` 或 BFG 移除
3. **推送**: force push 覆盖历史

```bash
# 使用 BFG Repo-Cleaner
bfg --delete-files .env
bfg --replace-text passwords.txt
git push --force
```

### GitHub Secret Scanning 告警

1. 访问告警链接
2. 确认是否为误报
3. 如为真实 secret，立即撤销
4. 从历史中移除

---

## 检查清单

每次 commit/push 前确认：

- [ ] 已运行 `./tools/secret-scanner.sh`
- [ ] `.env` 文件在 `.gitignore` 中
- [ ] 代码中使用环境变量
- [ ] 没有硬编码的 token/password/secret
- [ ] `.env.example` 已更新（如有新变量）

---

## 责任

- **开发者**: 遵守规范，推送前自检
- **Code Review**: 检查是否有敏感信息
- **CI/CD**: 自动扫描阻止推送

---

**违反此规范的后果**: 
- 可能导致账号被盗
- API 配额被滥用
- 数据泄露
- 财务损失

**记住**: 安全是每个人的责任！
