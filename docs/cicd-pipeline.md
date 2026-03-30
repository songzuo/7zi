# 7zi 项目 CI/CD 流水线方案

> 📅 设计日期：2026-03-30
> 🎯 版本：v1.5.0
> 🛡️ 维护者：系统管理员

---

## 目录

- [1. 概述](#1-概述)
- [2. 架构设计](#2-架构设计)
- [3. GitHub Actions 工作流](#3-github-actions-工作流)
- [4. GitLab CI 工作流](#4-gitlab-ci-工作流)
- [5. 部署策略](#5-部署策略)
- [6. 通知配置](#6-通知配置)
- [7. 安全配置](#7-安全配置)
- [8. 监控与告警](#8-监控与告警)
- [9. 故障恢复](#9-故障恢复)
- [10. 最佳实践](#10-最佳实践)

---

## 1. 概述

### 1.1 项目背景

- **项目名称**: 7zi-frontend
- **技术栈**: Next.js 22 + Node.js 22 + Turbopack
- **容器化**: Docker 多阶段构建
- **版本**: v1.4.0 → v1.5.0

### 1.2 部署目标

| 目标 | 当前状态 | 目标状态 |
|------|---------|---------|
| 部署时间 | 20-30 分钟 | <10 分钟 |
| 停机时间 | 有停机 | 零停机 |
| 回滚时间 | 10-15 分钟 | <2 分钟 |
| 自动化程度 | 部分自动 | 全自动 |

### 1.3 目标服务器

| 环境 | 服务器 | IP 地址 | 用途 |
|------|--------|---------|------|
| Production | 7zi.com | 165.99.43.61 | 生产环境 |
| Staging | bot5.szspd.cn | 182.43.36.134 | 测试环境 |

---

## 2. 架构设计

### 2.1 CI/CD 流水线架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CI/CD Pipeline Overview                        │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │  Code Push   │
                              │  / PR / Tag  │
                              └──────┬───────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              CI Phase                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   │
│  │  Lint   │   │ Type    │   │  Unit   │   │  Build  │   │  E2E    │   │
│  │  Check  │   │ Check   │   │  Tests  │   │         │   │  Tests  │   │
│  └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘   │
│       │             │             │             │             │         │
│       └─────────────┴─────────────┴──────┬──────┴─────────────┘         │
│                                          │                              │
│                                          ▼                              │
│                               ┌─────────────────┐                       │
│                               │  Docker Build   │                       │
│                               │  & Push to GHCR │                       │
│                               └────────┬────────┘                       │
└─────────────────────────────────────────┼───────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              CD Phase                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│   │   Staging    │    │   Health     │    │ Production   │             │
│   │   Deploy     │───▶│   Check      │───▶│   Deploy     │             │
│   │   (Auto)     │    │   & Verify   │    │  (Manual)    │             │
│   └──────────────┘    └──────────────┘    └──────────────┘             │
│          │                   │                   │                      │
│          ▼                   ▼                   ▼                      │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│   │  bot5.       │    │  Smoke       │    │  7zi.com     │             │
│   │  szspd.cn    │    │  Tests       │    │  (Blue-Green)│             │
│   └──────────────┘    └──────────────┘    └──────────────┘             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Notification                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│   │   Telegram   │    │    Slack     │    │    Email     │             │
│   │   Bot        │    │   Webhook    │    │   (Optional) │             │
│   └──────────────┘    └──────────────┘    └──────────────┘             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 蓝绿部署架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Blue-Green Deployment                             │
└─────────────────────────────────────────────────────────────────────────┘

                           ┌─────────────────┐
                           │   Nginx (LB)    │
                           │  Port 80/443    │
                           │  SSL Termination│
                           └────────┬────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               │               ▼
         ┌──────────────────┐       │      ┌──────────────────┐
         │   Blue (Active)  │       │      │ Green (Standby)  │
         │   Port 3000      │◄──────┼─────▶│   Port 3001      │
         │   Version: 1.4.0 │       │      │   Version: 1.5.0 │
         │   Health: ✓      │       │      │   Health: ✓      │
         └──────────────────┘       │      └──────────────────┘
                                    │
                           ┌────────┴────────┐
                           │  Shared SQLite  │
                           │  (Persistent)   │
                           └─────────────────┘

部署流程:
1. 新版本部署到 Green 环境
2. 健康检查验证 Green
3. Nginx 切换到 Green
4. Blue 变为备份（可快速回滚）
```

---

## 3. GitHub Actions 工作流

### 3.1 流水线概览

| 阶段 | Job | 触发条件 | 超时 | 缓存 |
|------|-----|---------|------|------|
| **CI** | 变更检测 | Always | 3min | - |
| | 依赖安装 | Always | 5min | node_modules |
| | 代码检查 | Always | 5min | node_modules |
| | 类型检查 | Always | 5min | node_modules |
| | 单元测试 | 非跳过 | 10min | node_modules |
| | 构建 | CI通过 | 15min | node_modules + .next |
| | E2E测试 | PR/main | 20min | node_modules |
| **CD** | Docker构建 | main/tag | 20min | GHA cache |
| | Staging部署 | main分支 | 15min | - |
| | Production部署 | tag/手动 | 20min | - |
| | 通知 | Always | 3min | - |

### 3.2 触发条件配置

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
    tags: ['v*.*.*']  # 版本标签触发生产部署
  pull_request:
    branches: [main, develop]
  workflow_dispatch:
    inputs:
      skip-tests:
        description: '跳过测试'
        type: boolean
        default: false
      environment:
        description: '部署环境'
        type: choice
        options: [staging, production]
        default: staging
      deploy-strategy:
        description: '部署策略'
        type: choice
        options: [blue-green, rolling]
        default: blue-green
```

### 3.3 核心配置说明

#### 3.3.1 缓存策略

```yaml
# Node Modules 缓存
- name: 缓存 node_modules
  uses: actions/cache@v4
  with:
    path: |
      node_modules
      ~/.npm
    key: ${{ runner.os }}-node-modules-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-modules-

# Next.js Turbopack 缓存
- name: 缓存 Next.js turbo
  uses: actions/cache@v4
  with:
    path: .next/cache
    key: ${{ runner.os }}-nextjs-turbo-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('src/**/*.{ts,tsx}') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-turbo-

# Docker GHA 缓存
- name: 构建并推送 Docker 镜像
  uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

#### 3.3.2 测试分片

```yaml
# 单元测试 4 分片并行
test-unit:
  strategy:
    fail-fast: false
    matrix:
      shard: [1, 2, 3, 4]
  steps:
    - name: 运行单元测试
      run: npm run test:run -- --shard=${{ matrix.shard }}/4
```

#### 3.3.3 部署配置

```yaml
# Staging 自动部署
deploy-staging:
  needs: [docker]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  environment:
    name: staging
    url: https://bot5.szspd.cn

# Production 手动触发或 tag 触发
deploy-production:
  needs: [docker]
  if: startsWith(github.ref, 'refs/tags/v') || (github.event_name == 'workflow_dispatch' && inputs.environment == 'production')
  environment:
    name: production
    url: https://7zi.com
```

---

## 4. GitLab CI 工作流

### 4.1 完整配置 (.gitlab-ci.yml)

```yaml
# ============================================
# 7zi-frontend GitLab CI/CD Pipeline
# ============================================

stages:
  - lint
  - test
  - build
  - docker
  - deploy-staging
  - deploy-production
  - notify

variables:
  NODE_VERSION: "22"
  DOCKER_TLS_CERTDIR: ""
  FF_USE_FASTZIP: "true"

# ============================================
# 缓存配置
# ============================================
.node_cache: &node_cache
  cache:
    key: 
      files: [package-lock.json]
    paths: [node_modules/, .npm/]

# ============================================
# Stage: Lint
# ============================================
lint:
  extends: .node_cache
  stage: lint
  image: node:${NODE_VERSION}-alpine
  script:
    - npm ci --prefer-offline
    - npm run lint
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"

typecheck:
  extends: .node_cache
  stage: lint
  image: node:${NODE_VERSION}-alpine
  script:
    - npm ci --prefer-offline
    - npm run type-check
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"

# ============================================
# Stage: Test
# ============================================
test-unit:
  extends: .node_cache
  stage: test
  image: node:${NODE_VERSION}-alpine
  script:
    - npm ci --prefer-offline
    - npm run test:run
  coverage: '/All files\s+\|\s+\d+\s+\|\s+\d+\s+\|\s+[\d.]+/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"

test-e2e:
  stage: test
  image: mcr.microsoft.com/playwright:v1.42.0-jammy
  script:
    - npm ci --prefer-offline
    - npx playwright install --with-deps chromium
    - npm run test:e2e
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 7 days
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      when: manual

# ============================================
# Stage: Build
# ============================================
build:
  extends: .node_cache
  stage: build
  image: node:${NODE_VERSION}-alpine
  script:
    - npm ci --prefer-offline
    - npm run build
  artifacts:
    paths:
      - .next/standalone
      - .next/static
      - public
    expire_in: 1 day
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_COMMIT_TAG

# ============================================
# Stage: Docker
# ============================================
docker-build:
  stage: docker
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - IMAGE_TAG="${CI_COMMIT_TAG:-${CI_COMMIT_SHORT_SHA}}"
    - docker build -f Dockerfile.optimized -t $CI_REGISTRY_IMAGE:$IMAGE_TAG .
    - docker push $CI_REGISTRY_IMAGE:$IMAGE_TAG
    - |
      if [ -n "$CI_COMMIT_TAG" ]; then
        docker tag $CI_REGISTRY_IMAGE:$IMAGE_TAG $CI_REGISTRY_IMAGE:latest
        docker push $CI_REGISTRY_IMAGE:latest
      fi
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_COMMIT_TAG

# ============================================
# Stage: Deploy Staging
# ============================================
deploy-staging:
  stage: deploy-staging
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh && chmod 700 ~/.ssh
  script:
    - |
      ssh -o StrictHostKeyChecking=no $DEPLOY_USER@$STAGING_HOST "
        set -e
        cd /opt/7zi-frontend
        docker pull $CI_REGISTRY_IMAGE:${CI_COMMIT_SHORT_SHA}
        docker-compose -f docker-compose.prod.yml up -d --no-deps --build 7zi-frontend
        
        echo 'Waiting for health check...'
        sleep 15
        for i in \$(seq 1 10); do
          if curl -sf http://localhost:3000/api/health; then
            echo '✅ Staging deployed successfully'
            exit 0
          fi
          sleep 5
        done
        echo '❌ Health check failed'
        exit 1
      "
  environment:
    name: staging
    url: https://bot5.szspd.cn
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# ============================================
# Stage: Deploy Production
# ============================================
deploy-production:
  stage: deploy-production
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh && chmod 700 ~/.ssh
  script:
    - |
      ssh -o StrictHostKeyChecking=no $DEPLOY_USER@$PRODUCTION_HOST "
        set -e
        cd /opt/7zi-frontend
        
        # Backup
        BACKUP_DIR=/opt/backups/7zi-frontend-\$(date +%Y%m%d-%H%M%S)
        mkdir -p \$BACKUP_DIR
        
        # Pull and deploy
        docker pull $CI_REGISTRY_IMAGE:${CI_COMMIT_TAG}
        ./scripts/deploy/blue-green-deploy.sh auto $CI_REGISTRY_IMAGE:${CI_COMMIT_TAG}
        
        echo 'Waiting for health check...'
        sleep 20
        for i in \$(seq 1 15); do
          if curl -sf http://localhost:3000/api/health; then
            echo '✅ Production deployed successfully'
            exit 0
          fi
          sleep 5
        done
        
        echo '❌ Rolling back...'
        ./scripts/deploy/rollback.sh
        exit 1
      "
  environment:
    name: production
    url: https://7zi.com
  rules:
    - if: $CI_COMMIT_TAG
  when: manual

# ============================================
# Stage: Notify
# ============================================
notify-telegram:
  stage: notify
  image: alpine:latest
  script:
    - |
      STATUS="✅ Success"
      [ "$CI_JOB_STATUS" = "failed" ] && STATUS="❌ Failed"
      
      MESSAGE="$STATUS Pipeline Complete
      
      📦 Project: $CI_PROJECT_NAME
      🌿 Branch: $CI_COMMIT_REF_NAME
      📝 Commit: $CI_COMMIT_SHORT_SHA
      👤 Author: $CI_COMMIT_AUTHOR
      
      🔗 $CI_PROJECT_URL/-/pipelines/$CI_PIPELINE_ID"
      
      curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d chat_id="${TELEGRAM_CHAT_ID}" \
        -d text="${MESSAGE}" \
        -d parse_mode="Markdown"
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_COMMIT_TAG
  when: always

notify-slack:
  stage: notify
  image: alpine:latest
  script:
    - |
      COLOR="good"
      [ "$CI_JOB_STATUS" = "failed" ] && COLOR="danger"
      
      curl -s -X POST "${SLACK_WEBHOOK_URL}" \
        -H 'Content-Type: application/json' \
        -d "{
          \"attachments\": [{
            \"color\": \"${COLOR}\",
            \"title\": \"Pipeline ${CI_JOB_STATUS}\",
            \"fields\": [
              {\"title\": \"Project\", \"value\": \"${CI_PROJECT_NAME}\", \"short\": true},
              {\"title\": \"Branch\", \"value\": \"${CI_COMMIT_REF_NAME}\", \"short\": true},
              {\"title\": \"Commit\", \"value\": \"${CI_COMMIT_SHORT_SHA}\", \"short\": true},
              {\"title\": \"Author\", \"value\": \"${CI_COMMIT_AUTHOR}\", \"short\": true}
            ],
            \"actions\": [{
              \"type\": \"button\",
              \"text\": \"View Pipeline\",
              \"url\": \"${CI_PROJECT_URL}/-/pipelines/${CI_PIPELINE_ID}\"
            }]
          }]
        }"
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_COMMIT_TAG
  when: always
```

---

## 5. 部署策略

### 5.1 蓝绿部署 (Blue-Green Deployment)

#### 5.1.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Blue-Green Deployment                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Phase 1: 初始状态                                              │
│   ┌─────────────┐                                                │
│   │   Nginx     │                                                │
│   │   :80/443   │                                                │
│   └──────┬──────┘                                                │
│          │ proxy_pass http://127.0.0.1:3000                     │
│          ▼                                                       │
│   ┌─────────────┐     ┌─────────────┐                           │
│   │    BLUE     │     │    GREEN    │                           │
│   │   :3000     │     │   :3001     │                           │
│   │  (Active)   │     │ (Standby)   │                           │
│   │   v1.4.0    │     │     -       │                           │
│   └─────────────┘     └─────────────┘                           │
│                                                                  │
│   Phase 2: 部署新版本到 Green                                    │
│   ┌─────────────┐     ┌─────────────┐                           │
│   │    BLUE     │     │    GREEN    │                           │
│   │   :3000     │     │   :3001     │                           │
│   │  (Active)   │     │  (New Ver)  │                           │
│   │   v1.4.0    │     │   v1.5.0    │                           │
│   └─────────────┘     └─────────────┘                           │
│          │                    │                                  │
│          │    Health Check    │                                  │
│          │    ────────────────│                                  │
│          │                    ▼                                  │
│          │            ✓ Verified                                 │
│                                                                  │
│   Phase 3: 切换流量到 Green                                      │
│   ┌─────────────┐                                                │
│   │   Nginx     │                                                │
│   └──────┬──────┘                                                │
│          │ proxy_pass http://127.0.0.1:3001  ← Changed!         │
│          ▼                                                       │
│   ┌─────────────┐     ┌─────────────┐                           │
│   │    BLUE     │     │    GREEN    │                           │
│   │   :3000     │     │   :3001     │                           │
│   │ (Standby)   │     │  (Active)   │                           │
│   │   v1.4.0    │     │   v1.5.0    │                           │
│   └─────────────┘     └─────────────┘                           │
│                                                                  │
│   Phase 4: Blue 准备下次部署                                     │
│   ┌─────────────┐     ┌─────────────┐                           │
│   │    BLUE     │     │    GREEN    │                           │
│   │   :3000     │     │   :3001     │                           │
│   │ (Standby)   │     │  (Active)   │                           │
│   │   Ready     │     │   v1.5.0    │                           │
│   └─────────────┘     └─────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.1.2 部署脚本 (scripts/deploy/blue-green-deploy.sh)

```bash
#!/bin/bash
# ============================================
# 7zi-frontend 蓝绿部署脚本
# ============================================

set -e

# 配置
BLUE_PORT=3000
GREEN_PORT=3001
HEALTH_CHECK_RETRIES=15
HEALTH_CHECK_INTERVAL=5

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 获取当前活跃的部署槽
get_active_slot() {
    if docker ps --filter "name=7zi-frontend-blue" --filter "status=running" -q | grep -q .; then
        echo "blue"
    else
        echo "green"
    fi
}

# 健康检查
health_check() {
    local port=$1
    local attempt=1
    
    log_info "健康检查: http://localhost:$port/api/health"
    
    while [ $attempt -le $HEALTH_CHECK_RETRIES ]; do
        if curl -sf "http://localhost:$port/api/health" > /dev/null 2>&1; then
            log_info "✅ 健康检查通过"
            return 0
        fi
        echo "  尝试 $attempt/$HEALTH_CHECK_RETRIES..."
        sleep $HEALTH_CHECK_INTERVAL
        attempt=$((attempt + 1))
    done
    
    log_error "❌ 健康检查失败"
    return 1
}

# 更新 Nginx 配置
switch_nginx() {
    local target_port=$1
    local nginx_conf="/etc/nginx/sites-available/7zi.com"
    
    log_info "切换 Nginx 到端口 $target_port"
    
    # 更新配置
    sed -i "s/proxy_pass http:\/\/127.0.0.1:300[01]/proxy_pass http:\/\/127.0.0.1:$target_port/" "$nginx_conf"
    
    # 验证并重载
    nginx -t && systemctl reload nginx
    
    log_info "✅ Nginx 切换完成"
}

# 主部署逻辑
main() {
    local image=$1
    local active=$(get_active_slot)
    local target
    
    if [ "$active" = "blue" ]; then
        target="green"
        target_port=$GREEN_PORT
    else
        target="blue"
        target_port=$BLUE_PORT
    fi
    
    log_info "🚀 开始蓝绿部署"
    log_info "当前活跃: $active"
    log_info "部署目标: $target"
    
    # 1. 拉取镜像
    log_info "拉取镜像: $image"
    docker pull "$image"
    
    # 2. 停止目标容器（如果存在）
    docker stop "7zi-frontend-$target" 2>/dev/null || true
    docker rm "7zi-frontend-$target" 2>/dev/null || true
    
    # 3. 启动新容器
    log_info "启动 $target 容器..."
    docker run -d \
        --name "7zi-frontend-$target" \
        --network 7zi-network \
        -p $target_port:3000 \
        -v 7zi-data:/app/data \
        -e NODE_ENV=production \
        "$image"
    
    # 4. 健康检查
    if ! health_check $target_port; then
        log_error "部署失败，清理..."
        docker stop "7zi-frontend-$target"
        docker rm "7zi-frontend-$target"
        exit 1
    fi
    
    # 5. 切换 Nginx
    switch_nginx $target_port
    
    # 6. 停止旧容器
    log_info "停止旧容器: 7zi-frontend-$active"
    docker stop "7zi-frontend-$active" 2>/dev/null || true
    
    log_info "✅ 蓝绿部署完成！"
    log_info "新版本运行在 $target (端口 $target_port)"
}

# 执行
main "$@"
```

### 5.2 滚动更新 (Rolling Update)

#### 5.2.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Rolling Update                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   初始状态 (3 个副本)                                            │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐                          │
│   │ Pod 1   │ │ Pod 2   │ │ Pod 3   │                          │
│   │ v1.4.0  │ │ v1.4.0  │ │ v1.4.0  │                          │
│   │ Ready   │ │ Ready   │ │ Ready   │                          │
│   └─────────┘ └─────────┘ └─────────┘                          │
│                                                                  │
│   Step 1: 更新 Pod 1                                             │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐                          │
│   │ Pod 1   │ │ Pod 2   │ │ Pod 3   │                          │
│   │ v1.5.0  │ │ v1.4.0  │ │ v1.4.0  │                          │
│   │ Starting│ │ Ready   │ │ Ready   │                          │
│   └─────────┘ └─────────┘ └─────────┘                          │
│                                                                  │
│   Step 2: Pod 1 就绪，更新 Pod 2                                 │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐                          │
│   │ Pod 1   │ │ Pod 2   │ │ Pod 3   │                          │
│   │ v1.5.0  │ │ v1.5.0  │ │ v1.4.0  │                          │
│   │ Ready   │ │ Starting│ │ Ready   │                          │
│   └─────────┘ └─────────┘ └─────────┘                          │
│                                                                  │
│   Step 3: Pod 2 就绪，更新 Pod 3                                 │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐                          │
│   │ Pod 1   │ │ Pod 2   │ │ Pod 3   │                          │
│   │ v1.5.0  │ │ v1.5.0  │ │ v1.5.0  │                          │
│   │ Ready   │ │ Ready   │ │ Starting│                          │
│   └─────────┘ └─────────┘ └─────────┘                          │
│                                                                  │
│   完成                                                           │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐                          │
│   │ Pod 1   │ │ Pod 2   │ │ Pod 3   │                          │
│   │ v1.5.0  │ │ v1.5.0  │ │ v1.5.0  │                          │
│   │ Ready   │ │ Ready   │ │ Ready   │                          │
│   └─────────┘ └─────────┘ └─────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.2.2 滚动更新脚本 (scripts/deploy/rolling-update.sh)

```bash
#!/bin/bash
# ============================================
# 7zi-frontend 滚动更新脚本
# ============================================

set -e

# 配置
REPLICAS=3
BASE_PORT=3000
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=3

log_info() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

# 健康检查
health_check() {
    local port=$1
    local attempt=1
    
    while [ $attempt -le $HEALTH_CHECK_RETRIES ]; do
        if curl -sf "http://localhost:$port/api/health" > /dev/null 2>&1; then
            return 0
        fi
        sleep $HEALTH_CHECK_INTERVAL
        attempt=$((attempt + 1))
    done
    return 1
}

# 滚动更新单个实例
update_instance() {
    local index=$1
    local image=$2
    local port=$((BASE_PORT + index))
    local container_name="7zi-frontend-$index"
    
    log_info "更新实例 $index (端口 $port)..."
    
    # 停止旧容器
    docker stop "$container_name" 2>/dev/null || true
    docker rm "$container_name" 2>/dev/null || true
    
    # 启动新容器
    docker run -d \
        --name "$container_name" \
        --network 7zi-network \
        -p $port:3000 \
        -v 7zi-data:/app/data \
        -e NODE_ENV=production \
        "$image"
    
    # 健康检查
    if ! health_check $port; then
        log_error "实例 $index 健康检查失败"
        return 1
    fi
    
    log_info "✅ 实例 $index 更新完成"
    return 0
}

# 主逻辑
main() {
    local image=$1
    
    log_info "🚀 开始滚动更新"
    log_info "镜像: $image"
    log_info "副本数: $REPLICAS"
    
    # 拉取镜像
    docker pull "$image"
    
    # 逐个更新实例
    for i in $(seq 0 $((REPLICAS - 1))); do
        if ! update_instance $i "$image"; then
            log_error "滚动更新失败！"
            exit 1
        fi
    done
    
    log_info "✅ 滚动更新完成！"
}

main "$@"
```

### 5.3 部署策略对比

| 特性 | 蓝绿部署 | 滚动更新 |
|------|---------|---------|
| **停机时间** | 零停机 | 最小停机 |
| **回滚速度** | 即时 (<1min) | 较慢 (逐个回滚) |
| **资源需求** | 2x 容器 | 1x + 部分额外 |
| **适用场景** | 生产环境 | 大规模集群 |
| **复杂度** | 中等 | 高 |
| **风险** | 低 | 中 |

**推荐**: 生产环境使用蓝绿部署，测试环境使用简单部署。

---

## 6. 通知配置

### 6.1 Telegram Bot 配置

#### 6.1.1 创建 Telegram Bot

```bash
# 1. 在 Telegram 中找到 @BotFather
# 2. 发送 /newbot 创建新机器人
# 3. 按提示命名机器人
# 4. 获取 Bot Token (格式: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz)

# 5. 获取 Chat ID
# 方法1: 发送消息给机器人后访问
curl "https://api.telegram.org/bot<BOT_TOKEN>/getUpdates"

# 方法2: 使用 @userinfobot
# 在 Telegram 中找到 @userinfobot，发送任意消息获取 Chat ID
```

#### 6.1.2 GitHub Secrets 配置

```yaml
# 在 GitHub 仓库设置中添加以下 Secrets:

TELEGRAM_BOT_TOKEN: "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
TELEGRAM_CHAT_ID: "-1001234567890"  # 或个人 Chat ID
```

#### 6.1.3 通知消息模板

```bash
# 成功消息
MESSAGE="✅ CI/CD Pipeline 完成

📦 项目: 7zi-frontend
🌿 分支: main
📝 Commit: abc1234
👤 触发者: developer

🔗 查看详情: https://github.com/..."

# 失败消息  
MESSAGE="❌ CI/CD Pipeline 失败

📦 项目: 7zi-frontend
🌿 分支: main
📝 Commit: abc1234
👤 触发者: developer

❌ 失败阶段: test-unit

🔗 查看详情: https://github.com/..."
```

### 6.2 Slack Webhook 配置

#### 6.2.1 创建 Slack Webhook

```bash
# 1. 访问 https://api.slack.com/apps
# 2. 创建新 App 或选择现有 App
# 3. 进入 "Incoming Webhooks"
# 4. 激活并创建新的 Webhook URL
# 5. 选择要发送消息的频道
# 6. 复制 Webhook URL (格式: https://hooks.slack.com/services/xxx/yyy/zzz)
```

#### 6.2.2 GitHub Secrets 配置

```yaml
SLACK_WEBHOOK_URL: "YOUR_SLACK_WEBHOOK_URL"
```

#### 6.2.3 Slack 消息格式

```json
{
  "attachments": [{
    "color": "good",
    "blocks": [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": "✅ CI/CD Pipeline 完成"
        }
      },
      {
        "type": "section",
        "fields": [
          {"type": "mrkdwn", "text": "*项目:*\n7zi-frontend"},
          {"type": "mrkdwn", "text": "*分支:*\nmain"},
          {"type": "mrkdwn", "text": "*Commit:*\nabc1234"},
          {"type": "mrkdwn", "text": "*触发者:*\ndeveloper"}
        ]
      },
      {
        "type": "actions",
        "elements": [{
          "type": "button",
          "text": {"type": "plain_text", "text": "查看详情"},
          "url": "https://github.com/..."
        }]
      }
    ]
  }]
}
```

### 6.3 通知触发条件

| 事件 | Telegram | Slack | Email |
|------|----------|-------|-------|
| CI 成功 | ✅ | ✅ | ❌ |
| CI 失败 | ✅ | ✅ | ✅ |
| Staging 部署 | ✅ | ✅ | ❌ |
| Production 部署 | ✅ | ✅ | ✅ |
| 回滚操作 | ✅ | ✅ | ✅ |

---

## 7. 安全配置

### 7.1 SSH 密钥认证

#### 7.1.1 生成 SSH 密钥

```bash
# 生成 Ed25519 密钥对（推荐）
ssh-keygen -t ed25519 -C "github-actions@7zi.com" -f deploy_key -N ""

# 输出:
# deploy_key (私钥)
# deploy_key.pub (公钥)
```

#### 7.1.2 配置服务器

```bash
# 将公钥添加到服务器的 authorized_keys
ssh root@7zi.com "mkdir -p ~/.ssh && echo 'YOUR_PUBLIC_KEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

# 同样配置 bot5.szspd.cn
ssh root@bot5.szspd.cn "mkdir -p ~/.ssh && echo 'YOUR_PUBLIC_KEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

#### 7.1.3 GitHub Secrets 配置

```yaml
# SSH 私钥（完整内容，包括 BEGIN/END 行）
SSH_PRIVATE_KEY: |
  -----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
  ...完整私钥内容...
  -----END OPENSSH PRIVATE KEY-----

# 服务器信息
PRODUCTION_HOST: "165.99.43.61"
STAGING_HOST: "182.43.36.134"
DEPLOY_USER: "root"
```

### 7.2 GitHub Secrets 清单

| Secret 名称 | 描述 | 示例 |
|-------------|------|------|
| `SSH_PRIVATE_KEY` | SSH 私钥 | `-----BEGIN...` |
| `PRODUCTION_HOST` | 生产服务器 IP | `165.99.43.61` |
| `STAGING_HOST` | 测试服务器 IP | `182.43.36.134` |
| `DEPLOY_USER` | 部署用户 | `root` |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | `123456:ABC...` |
| `TELEGRAM_CHAT_ID` | Telegram Chat ID | `-1001234567890` |
| `SLACK_WEBHOOK_URL` | Slack Webhook URL | `https://hooks.slack.com/...` |
| `GITHUB_TOKEN` | GitHub Token (自动) | - |

### 7.3 环境变量配置

#### 7.3.1 GitHub Environments

```yaml
# 在 GitHub 仓库设置中创建两个 Environment:

# Environment: staging
# - 自动部署: 是
# - 保护规则: 无
# - 变量:
STAGING_URL: "https://bot5.szspd.cn"

# Environment: production
# - 自动部署: 否（需要手动触发）
# - 保护规则: 
#   - Required reviewers: 1 人
#   - Wait timer: 5 分钟
# - 变量:
PRODUCTION_URL: "https://7zi.com"
```

### 7.4 敏感信息保护

```yaml
# ❌ 错误：硬编码敏感信息
- name: Deploy
  run: ssh root@7zi.com "PASSWORD='secret123' deploy"

# ✅ 正确：使用 Secrets
- name: Deploy
  env:
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  run: |
    ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.PRODUCTION_HOST }} << EOF
      export DB_PASSWORD="$DB_PASSWORD"
      deploy.sh
    EOF
```

---

## 8. 监控与告警

### 8.1 健康检查端点

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  };

  return NextResponse.json(health, { status: 200 });
}
```

### 8.2 监控指标

| 指标 | 阈值 | 告警级别 | 通知渠道 |
|------|------|---------|---------|
| 响应时间 | > 3s | Warning | Telegram |
| 响应时间 | > 5s | Critical | Telegram + Slack |
| 错误率 | > 1% | Warning | Telegram |
| 错误率 | > 5% | Critical | Telegram + Slack + Email |
| CPU 使用率 | > 80% | Warning | Telegram |
| 内存使用率 | > 90% | Critical | Telegram + Slack |
| 磁盘使用率 | > 85% | Warning | Telegram |
| 磁盘使用率 | > 95% | Critical | Telegram + Slack |

### 8.3 健康检查脚本

```bash
#!/bin/bash
# scripts/monitor/health-check.sh

ENDPOINTS=(
  "https://7zi.com/api/health"
  "https://bot5.szspd.cn/api/health"
)

for endpoint in "${ENDPOINTS[@]}"; do
  response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
  
  if [ "$response" = "200" ]; then
    echo "✅ $endpoint - OK"
  else
    echo "❌ $endpoint - FAILED (HTTP $response)"
    # 发送告警
    ./scripts/notify/alert.sh "$endpoint is down (HTTP $response)"
  fi
done
```

---

## 9. 故障恢复

### 9.1 回滚流程

```bash
# 自动回滚触发条件:
# 1. 健康检查失败（15 次重试后）
# 2. 容器启动失败
# 3. Nginx 配置验证失败

# 手动回滚步骤:
# 1. SSH 到服务器
ssh root@7zi.com

# 2. 执行回滚脚本
cd /opt/7zi-frontend
./scripts/deploy/rollback.sh

# 3. 或手动操作
docker stop 7zi-frontend-green
docker start 7zi-frontend-blue
# 更新 Nginx 配置指向 Blue
sed -i 's/:3001/:3000/' /etc/nginx/sites-available/7zi.com
nginx -t && systemctl reload nginx
```

### 9.2 回滚脚本 (scripts/deploy/rollback.sh)

```bash
#!/bin/bash
# ============================================
# 7zi-frontend 回滚脚本
# ============================================

set -e

# 配置
BLUE_PORT=3000
GREEN_PORT=3001
NGINX_CONF="/etc/nginx/sites-available/7zi.com"

log_info() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

# 获取当前活跃容器
get_active() {
    local nginx_port=$(grep "proxy_pass http://127.0.0.1:" "$NGINX_CONF" | grep -oP ':\d+' | tail -1)
    echo "$nginx_port"
}

# 回滚到另一个容器
rollback() {
    local current_port=$(get_active)
    local target_port
    
    if [ "$current_port" = ":$GREEN_PORT" ]; then
        target_port=$BLUE_PORT
        target_name="blue"
    else
        target_port=$GREEN_PORT
        target_name="green"
    fi
    
    log_info "当前运行在端口 ${current_port#:}"
    log_info "回滚到 $target_name (端口 $target_port)"
    
    # 检查目标容器是否存在并运行
    if ! docker ps --filter "name=7zi-frontend-$target_name" --filter "status=running" -q | grep -q .; then
        log_error "目标容器 7zi-frontend-$target_name 未运行"
        log_info "尝试启动..."
        docker start "7zi-frontend-$target_name" || {
            log_error "无法启动 $target_name 容器"
            exit 1
        }
        sleep 5
    fi
    
    # 健康检查
    if ! curl -sf "http://localhost:$target_port/api/health" > /dev/null; then
        log_error "目标容器健康检查失败"
        exit 1
    fi
    
    # 更新 Nginx
    sed -i "s/proxy_pass http:\/\/127.0.0.1:300[01]/proxy_pass http:\/\/127.0.0.1:$target_port/" "$NGINX_CONF"
    nginx -t && systemctl reload nginx
    
    log_info "✅ 回滚完成！"
    log_info "现在运行在 $target_name (端口 $target_port)"
}

# 执行
rollback "$@"
```

### 9.3 故障排查清单

```markdown
## 部署失败排查步骤

### 1. 检查容器状态
```bash
docker ps -a | grep 7zi-frontend
docker logs 7zi-frontend-blue --tail 100
```

### 2. 检查网络
```bash
docker network inspect 7zi-network
curl -v http://localhost:3000/api/health
```

### 3. 检查 Nginx
```bash
nginx -t
systemctl status nginx
tail -f /var/log/nginx/error.log
```

### 4. 检查资源
```bash
df -h  # 磁盘空间
free -m  # 内存
docker stats  # 容器资源使用
```

### 5. 检查数据库
```bash
sqlite3 /opt/7zi-frontend/data/7zi.db ".tables"
```
```

---

## 10. 最佳实践

### 10.1 Git 工作流

```
main (生产)
  │
  ├── v1.5.0 (Tag → 触发 Production 部署)
  │
  ├── develop (开发)
  │     │
  │     ├── feature/xxx (功能分支)
  │     ├── bugfix/xxx (修复分支)
  │     └── release/1.5.0 (发布分支)
  │
  └── hotfix/xxx (紧急修复 → main + develop)
```

### 10.2 版本发布流程

```bash
# 1. 创建发布分支
git checkout develop
git checkout -b release/1.5.0

# 2. 更新版本号
npm version minor  # 1.4.0 → 1.5.0

# 3. 合并到 main
git checkout main
git merge release/1.5.0

# 4. 创建 Tag
git tag -a v1.5.0 -m "Release v1.5.0"
git push origin main --tags

# 5. CI/CD 自动执行:
# - 构建 Docker 镜像
# - 部署到 Staging (自动)
# - 部署到 Production (手动触发或 tag 触发)
```

### 10.3 CI/CD 优化建议

| 优化项 | 方法 | 预期效果 |
|--------|------|---------|
| 依赖安装 | npm ci + 缓存 | 2-3min → <10s |
| 构建 | Turbopack + 增量构建 | 5-8min → 1-3min |
| 测试 | 分片并行执行 | 10min → 3min |
| Docker | 多阶段构建 + GHA cache | 5-10min → 1-2min |
| 部署 | 蓝绿部署 | 10min → <5min |
| **总时间** | 综合优化 | 30min → <10min |

### 10.4 安全检查清单

- [ ] SSH 密钥认证，禁用密码登录
- [ ] 敏感信息存储在 GitHub Secrets
- [ ] 使用环境保护规则 (Production)
- [ ] 定期轮换 Secrets
- [ ] 限制 CI/CD 触发分支
- [ ] 使用最小权限原则
- [ ] 启用 Dependabot 自动更新
- [ ] 定期安全扫描

### 10.5 监控与告警

- [ ] 配置 Telegram Bot 通知
- [ ] 配置 Slack Webhook 通知
- [ ] 设置健康检查端点
- [ ] 配置自动回滚
- [ ] 定期检查日志
- [ ] 监控资源使用

---

## 附录

### A. 常用命令

```bash
# 查看 CI/CD 运行状态
gh run list --limit 10

# 手动触发工作流
gh workflow run "CI/CD Pipeline" -f environment=staging

# 查看部署日志
gh run view --log

# SSH 到服务器
ssh root@7zi.com
ssh root@bot5.szspd.cn

# Docker 操作
docker ps -a
docker logs 7zi-frontend-blue -f
docker exec -it 7zi-frontend-blue sh

# Nginx 操作
nginx -t
systemctl reload nginx
tail -f /var/log/nginx/access.log
```

### B. 文件结构

```
7zi-frontend/
├── .github/
│   └── workflows/
│       ├── ci.yml              # 主 CI/CD 工作流
│       ├── preview.yml         # PR 预览
│       └── security-scan.yml   # 安全扫描
├── scripts/
│   ├── deploy/
│   │   ├── blue-green-deploy.sh
│   │   ├── rolling-update.sh
│   │   └── rollback.sh
│   └── notify/
│       └── alert.sh
├── nginx/
│   └── nginx.conf
├── docker-compose.prod.yml
├── Dockerfile.optimized
└── docs/
    └── cicd-pipeline.md
```

### C. 参考链接

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [GitLab CI/CD 文档](https://docs.gitlab.com/ee/ci/)
- [Docker 文档](https://docs.docker.com/)
- [Nginx 文档](https://nginx.org/en/docs/)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Slack Webhook API](https://api.slack.com/messaging/webhooks)

---

**文档版本**: 1.0.0
**最后更新**: 2026-03-30
**维护者**: 系统管理员
**审核状态**: ✅ 已完成