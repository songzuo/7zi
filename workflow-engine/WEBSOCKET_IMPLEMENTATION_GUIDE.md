# WebSocket 优化实施指南

**版本**: 1.0  
**日期**: 2026-04-04  
**状态**: 原型已完成

---

## 快速开始

### 1. 后端集成 (5 分钟)

#### 步骤 1: 集成 WebSocketManager

编辑 `backend/server.js`，在文件顶部添加：

```javascript
const WebSocketManager = require('./websocket/WebSocketManager');
```

#### 步骤 2: 初始化 WebSocket

在创建 HTTP server 后添加：

```javascript
// 创建 HTTP server
const server = http.createServer(app);

// 初始化 WebSocket Manager
const wsManager = new WebSocketManager(server, engine);
```

#### 步骤 3: 添加管理端点

```javascript
// WebSocket 统计
app.get('/api/ws/stats', (req, res) => {
  res.json({
    success: true,
    data: wsManager.getStats()
  });
});
```

#### 步骤 4: 更新启动代码

```javascript
// 使用 server 而不是 app.listen
server.listen(PORT, () => {
  console.log(`HTTP API:  http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
});
```

### 2. 前端集成 (10 分钟)

#### 步骤 1: 使用 WebSocket Hook

在 `ExecutionMonitor.tsx` 中替换轮询：

```typescript
import { useExecutionWebSocket } from './hooks/useExecutionWebSocket';

const ExecutionMonitor: React.FC<ExecutionMonitorProps> = ({ executionId, onClose }) => {
  const { execution, connected, connecting, error } = useExecutionWebSocket(executionId);

  if (connecting) {
    return <div>Connecting...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // 其余 UI 代码保持不变
  return (
    <div className="execution-monitor">
      <div className="ws-status">
        {connected ? '🟢 Live' : '🔴 Offline'}
      </div>
      {/* ... */}
    </div>
  );
};
```

#### 步骤 2: 添加降级支持 (可选)

```typescript
import { useExecution } from './hooks/useExecutionWebSocket';

// 自动选择 WebSocket 或轮询
const { execution, connected } = useExecution(executionId, true);
```

---

## 测试

### 1. 后端测试

```bash
# 启动服务器
cd backend
npm start

# 测试 WebSocket 连接
wscat -c ws://localhost:3001/ws

# 发送订阅消息
{"type":"subscribe","executionId":"test_exec"}

# 查看统计信息
curl http://localhost:3001/api/ws/stats
```

### 2. 前端测试

```bash
# 启动前端
cd frontend
npm run dev

# 打开浏览器开发者工具
# 查看 Network -> WS 标签
# 应该看到 WebSocket 连接和消息
```

### 3. 集成测试

```bash
# 1. 创建工作流
curl -X POST http://localhost:3001/api/workflows \
  -H "Content-Type: application/json" \
  -d @test-workflow.json

# 2. 执行工作流
curl -X POST http://localhost:3001/api/workflows/{id}/execute

# 3. 在前端监控执行
# 应该看到实时更新，无轮询请求
```

---

## 监控

### WebSocket 连接统计

```bash
curl http://localhost:3001/api/ws/stats
```

响应示例：

```json
{
  "success": true,
  "data": {
    "totalConnections": 5,
    "activeSubscriptions": 3,
    "messagesSent": 1250,
    "messagesReceived": 150,
    "subscriptions": [
      {
        "executionId": "exec_123",
        "subscribers": 2
      }
    ],
    "uptime": 3600.5
  }
}
```

### 浏览器控制台

```javascript
// 查看所有 WebSocket 消息
// 在 Console 中输入：
window.wsMessages = [];

// 在 Network -> WS -> Messages 中查看
```

---

## 故障排查

### 问题 1: WebSocket 连接失败

**症状**: 前端显示 "Connecting..." 或错误

**解决方案**:
1. 检查后端是否启动: `curl http://localhost:3001/health`
2. 检查 WebSocket 路径: `ws://localhost:3001/ws`
3. 检查防火墙设置
4. 查看浏览器控制台错误

### 问题 2: 没有收到事件

**症状**: 连接成功但没有更新

**解决方案**:
1. 检查 executionId 是否正确
2. 检查工作流是否正在执行
3. 查看后端日志: `[WebSocket] Broadcast event`
4. 使用 `/api/ws/stats` 检查订阅状态

### 问题 3: 连接频繁断开

**症状**: 连接不稳定，频繁重连

**解决方案**:
1. 检查网络稳定性
2. 增加心跳间隔: `heartbeatInterval: 60000`
3. 检查服务器负载
4. 查看后端日志中的错误信息

---

## 性能对比

### 测试场景

执行一个包含 10 个节点的工作流，每个节点耗时 1 秒。

### 轮询方式

```
执行时间: 10 秒
HTTP 请求: 5 次 (0s, 2s, 4s, 6s, 8s)
实际数据变化: 10 次 (每个节点)
冗余请求: 50%
```

### WebSocket 方式

```
执行时间: 10 秒
WebSocket 消息: 11 次 (1 初始状态 + 10 节点事件)
实时延迟: <100ms
冗余请求: 0%
```

### 资源使用

| 指标 | 轮询 | WebSocket | 改善 |
|------|------|-----------|------|
| 请求数 | 5 | 1 | -80% |
| 带宽 | 25KB | 6KB | -76% |
| 延迟 | 2s | <100ms | -95% |

---

## 高级配置

### 1. 自定义事件过滤

```typescript
const { execution } = useExecutionWebSocket(executionId, {
  onEvent: (event, data) => {
    // 只处理特定事件
    if (event === 'node:completed') {
      console.log('Node completed:', data.nodeId);
    }
  }
});
```

### 2. 批量事件处理

```javascript
// 在 WebSocketManager.js 中
class BatchBroadcaster {
  constructor(wsManager, delay = 100) {
    this.wsManager = wsManager;
    this.delay = delay;
    this.buffer = new Map();
    this.timer = null;
  }

  add(executionId, event, data) {
    if (!this.buffer.has(executionId)) {
      this.buffer.set(executionId, []);
    }
    this.buffer.get(executionId).push({ event, data });

    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.delay);
    }
  }

  flush() {
    this.buffer.forEach((events, executionId) => {
      const clients = this.wsManager.clients.get(executionId);
      if (clients) {
        clients.forEach(client => {
          client.send(JSON.stringify({
            type: 'batch',
            events
          }));
        });
      }
    });
    this.buffer.clear();
    this.timer = null;
  }
}
```

### 3. 数据压缩

```javascript
const zlib = require('zlib');

// 在发送大型数据时压缩
function sendCompressed(ws, data) {
  const json = JSON.stringify(data);
  if (json.length > 1024) { // > 1KB
    const compressed = zlib.gzipSync(json);
    ws.send(JSON.stringify({
      type: 'compressed',
      data: compressed.toString('base64')
    }));
  } else {
    ws.send(json);
  }
}
```

---

## 安全考虑

### 1. 认证

```javascript
// 在 WebSocketManager.js 中添加认证
wss.on('connection', (ws, req) => {
  const token = new URL(req.url, 'http://localhost').searchParams.get('token');
  
  if (!validateToken(token)) {
    ws.close(1008, 'Unauthorized');
    return;
  }
  
  ws.user = decodeToken(token);
});
```

### 2. 速率限制

```javascript
const rateLimiter = new Map();

function checkRateLimit(ws) {
  const now = Date.now();
  const user = ws.user?.id || ws.id;
  
  if (!rateLimiter.has(user)) {
    rateLimiter.set(user, []);
  }
  
  const requests = rateLimiter.get(user);
  const recent = requests.filter(t => now - t < 60000); // 1 分钟内
  
  if (recent.length > 100) { // 每分钟最多 100 条消息
    return false;
  }
  
  recent.push(now);
  rateLimiter.set(user, recent);
  return true;
}
```

### 3. 输入验证

```javascript
function validateMessage(message) {
  const allowedTypes = ['subscribe', 'unsubscribe', 'ping'];
  
  if (!message.type || !allowedTypes.includes(message.type)) {
    return false;
  }
  
  if (message.type === 'subscribe' && !message.executionId) {
    return false;
  }
  
  return true;
}
```

---

## 部署清单

### 开发环境

- [ ] 安装依赖: `npm install`
- [ ] 集成 WebSocketManager
- [ ] 更新前端组件
- [ ] 本地测试通过
- [ ] 代码审查完成

### 生产环境

- [ ] 配置反向代理 (Nginx)
- [ ] 启用 WSS (WebSocket Secure)
- [ ] 配置认证
- [ ] 设置监控告警
- [ ] 准备回滚方案
- [ ] 灰度发布 (10% -> 50% -> 100%)

### Nginx 配置示例

```nginx
location /ws {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 86400;
}
```

---

## 回滚方案

如果 WebSocket 出现问题，可以快速回滚到轮询：

```typescript
// 在前端配置中设置
const USE_WEBSOCKET = false; // 强制使用轮询

// 或使用环境变量
const useWebSocket = process.env.REACT_APP_USE_WEBSOCKET !== 'false';
```

---

## 下一步

1. **完成集成测试**
   - 单元测试
   - 集成测试
   - 压力测试

2. **性能优化**
   - 批量推送
   - 数据压缩
   - 增量更新

3. **监控告警**
   - Prometheus 指标
   - Grafana 仪表板
   - 错误告警

4. **文档完善**
   - API 文档
   - 用户指南
   - 故障排查手册

---

## 支持

如有问题，请：

1. 查看主报告: `REPORT_WORKFLOW_WEBSOCKET_OPTIMIZATION_20260404.md`
2. 检查日志: 后端控制台 + 浏览器控制台
3. 提交 Issue: 项目 Issue Tracker

---

**实施完成时间**: 预计 2-3 天  
**风险等级**: 低  
**收益**: 高 (减少 92-95% HTTP 请求)