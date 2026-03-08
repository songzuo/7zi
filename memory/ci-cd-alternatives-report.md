# GitHub Actions 替代方案研究报告

## 背景
- GitHub Actions 额度剩余 10%
- 预计 2026-04-01 用完
- 需要 CI/CD 替代方案

---

## 主要 CI/CD 替代方案对比

### 1. GitLab CI/CD ⭐⭐⭐⭐⭐

| 项目 | 详情 |
|------|------|
| **免费额度** | Free: 400 分钟/月；Premium: 10,000 分钟/月；Ultimate: 50,000 分钟/月 |
| **自托管** | ✅ 完全支持，自托管无限分钟 |
| **开源项目** | 无限制 |

**优点：**
- 一体化平台（代码托管 + CI/CD + Issue tracking）
- 自托管版本完全免费，无分钟限制
- 与 GitHub 项目兼容性好，可导入仓库
- 内置 Container Registry
- 成熟稳定，社区活跃

**缺点：**
- 自托管需要服务器资源（建议 4GB+ RAM）
- 学习曲线较陡（YAML 配置语法不同）

---

### 2. CircleCI ⭐⭐⭐⭐

| 项目 | 详情 |
|------|------|
| **免费额度** | 30,000 credits/月（约 3,000 分钟），5 活跃用户 |
| **自托管** | ✅ 支持 self-hosted runners（免费 5 并发）|
| **开源项目** | 400,000 credits/月（约 80,000 分钟）|

**优点：**
- 灵活的按需付费模式
- 强大的并发能力（免费 30x）
- 支持 Docker/Linux/Windows/macOS/ARM
- 配置迁移相对简单

**缺点：**
- 免费额度对大型项目可能不够
- credits 过期不累积

---

### 3. Jenkins ⭐⭐⭐

| 项目 | 详情 |
|------|------|
| **免费额度** | ✅ 完全免费开源 |
| **自托管** | 必须自托管 |

**优点：**
- 完全免费，无任何限制
- 插件生态丰富（1,800+ 插件）
- 完全控制，适合企业级
- 社区成熟，文档丰富

**缺点：**
- 需要自己维护服务器
- 配置复杂，学习曲线陡峭
- UI 较老旧
- Groovy 脚本学习成本

---

### 4. Woodpecker CI ⭐⭐⭐⭐

| 项目 | 详情 |
|------|------|
| **免费额度** | ✅ 完全免费开源 |
| **自托管** | 必须自托管 |

**优点：**
- 完全免费，无分钟限制
- 轻量级，资源占用少
- 基于 Docker，配置简单
- 兼容 Drone CI 配置
- 支持 GitHub/Gitea/Gogs/Bitbucket 等多个代码托管平台

**缺点：**
- 社区相对较小
- 文档可能不够完善
- 需要自己托管

---

### 5. Azure Pipelines ⭐⭐⭐

| 项目 | 详情 |
|------|------|
| **免费额度** | Public: 无限制；Private: 1,800 分钟/月 |
| **自托管** | ✅ 支持自托管 agents |

**优点：**
- 公开项目无限分钟
- 微软生态集成
- 支持 Linux/Windows/macOS

**缺点：**
- 私有项目免费额度较少
- 与 Azure 绑定较深

---

### 6. Buildkite ⭐⭐⭐

| 项目 | 详情 |
|------|------|
| **免费额度** | 开源项目免费 |
| **自托管** | ✅ 核心模式就是自托管 runners |

**优点：**
- 混合架构：云端控制 + 自托管 runners
- 安全性好（代码不离开基础设施）
- 配置简单

**缺点：**
- 私有项目需付费
- 需要自己管理 runners

---

## 综合对比表

| 方案 | 免费额度 | 自托管 | 迁移难度 | 推荐指数 |
|------|----------|--------|----------|----------|
| GitLab CI/CD | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 中等 | ⭐⭐⭐⭐⭐ |
| CircleCI | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 低 | ⭐⭐⭐⭐ |
| Jenkins | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 高 | ⭐⭐⭐ |
| Woodpecker CI | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 低 | ⭐⭐⭐⭐ |
| Azure Pipelines | ⭐⭐⭐ | ⭐⭐⭐⭐ | 中等 | ⭐⭐⭐ |
| Buildkite | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 低 | ⭐⭐⭐ |

---

## 推荐方案

### 最佳选择：GitLab CI/CD（自托管）

**理由：**
1. **自托管无限分钟** - 解决 GitHub Actions 额度问题
2. **一体化平台** - 可替代 GitHub + Actions
3. **成熟的迁移工具** - 可从 GitHub 导入项目
4. **容器原生** - 支持 Docker，与现有项目兼容
5. **活跃社区** - 文档完善，问题容易解决

### 备选方案：Woodpecker CI + GitHub

如果希望保留 GitHub 作为代码托管：

1. **继续使用 GitHub 存放代码**
2. **自托管 Woodpecker CI** 处理 CI/CD
3. **完全免费**，无分钟限制
4. **配置简单**，基于 Docker

### 托管服务备选：CircleCI

如果不想自托管服务器：

1. **免费额度较大**（30,000 credits/月）
2. **开源项目额度更高**（400,000 credits/月）
3. **支持 self-hosted runners**（混合方案）
4. **迁移成本低**

---

## 迁移建议

### 从 GitHub Actions 迁移到 GitLab CI

```yaml
# GitHub Actions 示例
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test
```

```yaml
# GitLab CI 等效配置
stages:
  - build

build:
  stage: build
  image: node:latest
  script:
    - npm install
    - npm test
```

### 迁移步骤

1. **评估现有 workflow** - 列出所有 GitHub Actions workflow
2. **选择方案** - 根据团队需求选择 GitLab/Woodpecker/CircleCI
3. **搭建基础设施** - 如果自托管，准备服务器
4. **迁移配置** - 转换 YAML 配置
5. **测试验证** - 确保 CI/CD 正常工作
6. **切换** - 更新仓库设置，禁用 GitHub Actions

---

## 成本估算

### GitLab 自托管
- 服务器：$5-20/月（取决于规格）
- 无 CI/CD 分钟费用

### CircleCI 托管
- 免费额度内：$0
- 超出后：$15/25,000 credits

### Woodpecker CI 自托管
- 服务器：$5-20/月
- 无任何软件费用

---

## 结论

**强烈推荐 GitLab CI/CD 自托管方案**，理由：

1. ✅ 完全解决 GitHub Actions 额度问题
2. ✅ 自托管无分钟限制
3. ✅ 一体化平台，功能完整
4. ✅ 成熟稳定，社区活跃
5. ✅ 与现有技术栈兼容

如果希望保留 GitHub 作为代码托管，**Woodpecker CI** 是最佳选择，轻量级且完全免费。

---

*报告生成时间：2026-03-08*
*DevOps 工程师 - CI/CD 方案研究*