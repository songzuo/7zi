# v1.10.0 高级工作流自动化引擎

## 项目概述

构建下一代工作流自动化系统，支持可视化流程设计、分布式执行、流程市场和 AI 辅助功能。

## 核心特性

### 1. 可视化流程设计器
- 拖拽式节点编辑
- 条件分支与循环
- 并行/串行执行
- 子流程调用

### 2. 执行引擎
- 分布式任务执行
- 断点续传
- 失败重试策略
- 执行超时控制

### 3. 流程市场
- 预置模板库
- 社区分享机制
- 一键导入/导出

### 4. 高级特性
- AI 辅助流程生成
- 自然语言流程描述
- 智能优化建议

## 技术栈

- **前端**: React + TypeScript + Vite
- **后端**: Node.js + Express
- **运行时**: minimax
- **工作流定义**: JSON Schema
- **可视化**: React Flow

## 项目结构

```
workflow-engine/
├── frontend/          # React 前端应用
├── backend/           # Node.js 后端服务
├── schemas/           # JSON Schema 定义
├── templates/         # 预置模板
└── docs/             # 文档
```

## 快速开始

### 前端启动
```bash
cd frontend
npm install
npm run dev
```

### 后端启动
```bash
cd backend
npm install
npm start
```

## API 文档

详见 `docs/API.md`

## 工作流 Schema

详见 `schemas/workflow-schema.json`