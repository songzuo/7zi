# 永久记忆

## 核心规则

### OpenClaw配置修改规则 ⚠️

**任何修改OpenClaw、Picoclaw或其他Claw配置的操作，禁止直接编辑配置文件！**

必须使用命令行工具：
- `openclaw config get/set` - 查看/修改配置
- `openclaw doctor --fix` - 诊断和修复
- `openclaw update` - 版本更新
- `openclaw config validate` - 验证配置

---

## 项目信息

### GitHub
- **仓库**: https://github.com/songzuo/7zi
- **Token**: REDACTED_TOKEN

### 服务器
- **7zi.com**: root/ge20993344$ZZ (端口22被拒绝 - SSH服务未运行)
- **7zi.com:9000**: Portainer Docker管理界面 (密码不正确)
- **bot5.szspd.cn**: root/ge20993344$ZZ (所有端口被阻断)

### 网站项目
- **本地目录**: ~/7zi-project/7zi-frontend
- **本地测试**: http://localhost:3000
- **团队**: 7zi Studio
- **发布机制**: GitHub Actions + Vercel (不用SSH)

---

## 知识库位置

- **OpenClaw知识库**: `openclaw-kb/`

---

## ⚠️ 重大教训：GitHub 分支管理

### 事件（2026-03-07）

**问题**: 同样的错误出现 **3 次** - GitHub 有 `main` 和 `master` 两个分支，导致代码分叉

### 根本原因

1. **两个分支完全独立** - `main` 和 `master` 没有共同祖先（`refusing to merge unrelated histories`）
2. **不同开发者推送不同分支** - 我推送 `master`，其他开发者推送 `main`
3. **没有统一流程** - 没有 PR、没有合并、没有批准流程
4. **团队沟通不足** - 各做各的，没有协调

### 解决方案（已执行）

1. ✅ 合并 `master` 到 `main`（使用 `--allow-unrelated-histories`）
2. ✅ 强制推送 `main` 到 GitHub（`--force-with-lease`）
3. ✅ 删除本地和远程的 `master` 分支
4. ✅ **统一使用 `main` 分支**

### 未来规则

| 规则 | 说明 |
|------|------|
| **只使用 `main` 分支** | 不再创建 `master` 分支 |
| **推送前先 pull** | `git pull origin main` 再推送 |
| **使用 force-with-lease** | 比 `--force` 更安全 |
| **检查分支状态** | `git branch -vv` 确认当前分支 |
| **团队协调** | 所有开发者统一使用 `main` |

### Git 命令规范

```bash
# ✅ 正确流程
git checkout main
git pull origin main
git add .
git commit -m "feat: 新功能"
git push origin main

# ❌ 避免
git push origin master  # 不要使用 master
git push --force        # 使用 --force-with-lease 替代
```

### 教训总结

> **同样的错误出现 3 次 = 团队协作流程有严重问题**

**必须改进**:
1. 建立清晰的分支管理规范
2. 所有开发者使用同一分支
3. 推送前先同步
4. 定期检查分支状态
5. 加强团队沟通

---

**此教训必须牢记，避免再次发生！**
