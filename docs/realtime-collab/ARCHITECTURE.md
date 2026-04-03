# 实时协作架构总览

**版本**: v1.11.0  
**最后更新**: 2026-04-03

---

## 概述

v1.11.0 实时协作系统基于 **Y.js CRDT** 引擎构建，提供多用户同时编辑文档、画布、工作流的实时同步能力。

## 核心组件

| 组件 | 职责 |
|------|------|
| **Y.js Engine** | CRDT 文档引擎，处理冲突解决 |
| **WebSocket Server** | 双向实时通信 |
| **Room Manager** | 多房间管理和路由 |
| **Persistence Layer** | 三层存储 (Memory + Redis + LevelDB) |
| **Awareness Protocol** | 光标/选择状态同步 |

## 相关文档

- [PROTOCOL.md](./PROTOCOL.md) - WebSocket 消息协议详细设计
- [WEBSOCKET.md](../WEBSOCKET.md) - 现有 WebSocket 文档

## 技术栈

- **CRDT**: Y.js
- **传输**: WebSocket
- **存储**: Redis + LevelDB
- **语言**: TypeScript

---

**状态**: 设计完成
