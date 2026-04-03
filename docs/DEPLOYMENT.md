# v1.11.0 实时协作功能 - 部署与监控配置

**生成日期**: 2026-04-03  
**服务器**: 7zi.com (165.99.43.61)  
**当前版本**: API Gateway v3.0

---

## 一、当前部署状态

### 1.1 服务器信息

| 项目 | 状态 |
|------|------|
| 主机 | 7zi.com (165.99.43.61) |
| 应用目录 | `/opt/api-gateway` |
| 服务名称 | api-gateway.service |
| 服务状态 | ✅ Active (running) |
| 运行时间 | 16h+ |
| 内存使用 | 170.4M |
| 端口 | 2000 |

### 1.2 应用结构

```
/opt/api-gateway/
├── app/
│   ├── main.py          # 主应用入口
│   ├── crud.py          # 数据库操作
│   ├── models.py        # 数据模型
│   ├── schemas.py       # 数据模式
│   ├── database.py      # 数据库配置
│   ├── api/             # API 路由
│   ├── core/            # 核心功能
│   ├── services/        # 服务层
│   └── static/          # 静态文件
├── api-gateway.db       # SQLite 数据库
├── .env                 # 环境配置
├── run.py              # 启动脚本
└── logs/               # 日志目录
```

### 1.3 当前配置

```bash
# 应用配置
APP_NAME=API Gateway v3.0
VERSION=3.0.0
HOST=0.0.0.0
PORT=2000

# 数据库
DATABASE_URL=sqlite:///./api-gateway.db

# JWT 配置
SECRET_KEY=yFEAgUxiQG8ol8v0D5_Jupn1L0XRzZQpRexdn8axMiI
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
```

---

## 二、WebSocket 监控方案

### 2.1 监控指标设计

#### 2.1.1 连接指标

| 指标名称 | 描述 | 类型 | 采集频率 |
|---------|------|------|---------|
| `ws_connections_total` | 当前活跃连接总数 | Gauge | 实时 |
| `ws_connections_created` | 新建连接数 | Counter | 实时 |
| `ws_connections_closed` | 关闭连接数 | Counter | 实时 |
| `ws_connections_failed` | 连接失败数 | Counter | 实时 |
| `ws_connection_duration` | 连接持续时间 | Histogram | 连接关闭时 |

#### 2.1.2 消息指标

| 指标名称 | 描述 | 类型 | 采集频率 |
|---------|------|------|---------|
| `ws_messages_sent` | 发送消息总数 | Counter | 实时 |
| `ws_messages_received` | 接收消息总数 | Counter | 实时 |
| `ws_message_size_bytes` | 消息大小（字节） | Histogram | 每条消息 |
| `ws_message_errors` | 消息错误数 | Counter | 实时 |

#### 2.1.3 延迟指标

| 指标名称 | 描述 | 类型 | 采集频率 |
|---------|------|------|---------|
| `ws_latency_ms` | 消息往返延迟 | Histogram | 每30秒 |
| `ws_ping_latency_ms` | Ping/Pong 延迟 | Gauge | 每10秒 |
| `ws_processing_time_ms` | 消息处理时间 | Histogram | 每条消息 |

### 2.2 监控实现方案

#### 2.2.1 WebSocket 连接管理器

```python
# app/services/websocket_manager.py

from fastapi import WebSocket
from typing import Dict, Set
from datetime import datetime
import asyncio
import time
from collections import defaultdict
from prometheus_client import Counter, Gauge, Histogram

# Prometheus 指标定义
WS_CONNECTIONS_TOTAL = Gauge('ws_connections_total', 'Active WebSocket connections')
WS_CONNECTIONS_CREATED = Counter('ws_connections_created', 'WebSocket connections created')
WS_CONNECTIONS_CLOSED = Counter('ws_connections_closed', 'WebSocket connections closed')
WS_MESSAGES_SENT = Counter('ws_messages_sent', 'WebSocket messages sent')
WS_MESSAGES_RECEIVED = Counter('ws_messages_received', 'WebSocket messages received')
WS_LATENCY = Histogram('ws_latency_ms', 'WebSocket message latency in milliseconds')
WS_MESSAGE_SIZE = Histogram('ws_message_size_bytes', 'WebSocket message size in bytes')

class ConnectionMetrics:
    """单个连接的指标"""
    def __init__(self, user_id: str, session_id: str):
        self.user_id = user_id
        self.session_id = session_id
        self.connected_at = datetime.utcnow()
        self.last_ping = time.time()
        self.messages_sent = 0
        self.messages_received = 0
        self.bytes_sent = 0
        self.bytes_received = 0
        self.errors = 0

class WebSocketManager:
    """WebSocket 连接管理器"""
    
    def __init__(self):
        # 活跃连接：{websocket: ConnectionMetrics}
        self.active_connections: Dict[WebSocket, ConnectionMetrics] = {}
        
        # 用户连接映射：{user_id: Set[WebSocket]}
        self.user_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        
        # 会话连接映射：{session_id: Set[WebSocket]}
        self.session_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        
        # 锁
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, user_id: str, session_id: str):
        """建立新连接"""
        await websocket.accept()
        
        async with self._lock:
            metrics = ConnectionMetrics(user_id, session_id)
            self.active_connections[websocket] = metrics
            self.user_connections[user_id].add(websocket)
            self.session_connections[session_id].add(websocket)
            
            # 更新 Prometheus 指标
            WS_CONNECTIONS_TOTAL.inc()
            WS_CONNECTIONS_CREATED.inc()
        
        return metrics
    
    async def disconnect(self, websocket: WebSocket):
        """断开连接"""
        async with self._lock:
            if websocket in self.active_connections:
                metrics = self.active_connections[websocket]
                
                # 清理映射
                self.user_connections[metrics.user_id].discard(websocket)
                self.session_connections[metrics.session_id].discard(websocket)
                
                # 删除连接
                del self.active_connections[websocket]
                
                # 更新 Prometheus 指标
                WS_CONNECTIONS_TOTAL.dec()
                WS_CONNECTIONS_CLOSED.inc()
                
                return metrics
        return None
    
    async def record_message_sent(self, websocket: WebSocket, size: int):
        """记录发送消息"""
        if websocket in self.active_connections:
            metrics = self.active_connections[websocket]
            metrics.messages_sent += 1
            metrics.bytes_sent += size
            
            WS_MESSAGES_SENT.inc()
            WS_MESSAGE_SIZE.observe(size)
    
    async def record_message_received(self, websocket: WebSocket, size: int):
        """记录接收消息"""
        if websocket in self.active_connections:
            metrics = self.active_connections[websocket]
            metrics.messages_received += 1
            metrics.bytes_received += size
            
            WS_MESSAGES_RECEIVED.inc()
    
    async def record_latency(self, latency_ms: float):
        """记录延迟"""
        WS_LATENCY.observe(latency_ms)
    
    def get_stats(self) -> dict:
        """获取统计信息"""
        total_connections = len(self.active_connections)
        total_users = len(self.user_connections)
        total_sessions = len(self.session_connections)
        
        total_messages_sent = sum(
            m.messages_sent for m in self.active_connections.values()
        )
        total_messages_received = sum(
            m.messages_received for m in self.active_connections.values()
        )
        
        return {
            "connections": total_connections,
            "unique_users": total_users,
            "active_sessions": total_sessions,
            "messages_sent": total_messages_sent,
            "messages_received": total_messages_received,
            "uptime_seconds": time.time() - self._start_time if hasattr(self, '_start_time') else 0
        }

# 全局实例
ws_manager = WebSocketManager()
```

#### 2.2.2 WebSocket 路由实现

```python
# app/api/websocket.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.services.websocket_manager import ws_manager
import json
import time

router = APIRouter()

@router.websocket("/ws/collaboration/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    user_id: str = None
):
    """实时协作 WebSocket 端点"""
    
    # 连接
    metrics = await ws_manager.connect(websocket, user_id or "anonymous", session_id)
    
    try:
        # 发送欢迎消息
        await websocket.send_json({
            "type": "connected",
            "session_id": session_id,
            "timestamp": time.time()
        })
        
        # 消息循环
        while True:
            # 接收消息
            data = await websocket.receive_text()
            receive_time = time.time()
            
            # 记录接收
            await ws_manager.record_message_received(websocket, len(data))
            
            try:
                message = json.loads(data)
                
                # 处理不同类型的消息
                if message.get("type") == "ping":
                    # Ping/Pong 用于延迟检测
                    latency = (receive_time - message.get("timestamp", receive_time)) * 1000
                    await ws_manager.record_latency(latency)
                    
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": time.time()
                    })
                
                elif message.get("type") == "collaboration":
                    # 协作消息，广播给同会话的其他用户
                    await broadcast_to_session(session_id, message, exclude=websocket)
                
                else:
                    # 其他消息处理
                    await handle_message(websocket, message)
                
                # 记录发送
                response_size = len(json.dumps(message))
                await ws_manager.record_message_sent(websocket, response_size)
                
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON"
                })
    
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        await ws_manager.disconnect(websocket)
        raise

async def broadcast_to_session(session_id: str, message: dict, exclude=None):
    """广播消息到会话中的所有连接"""
    from app.services.websocket_manager import ws_manager
    
    for connection in ws_manager.session_connections[session_id]:
        if connection != exclude:
            await connection.send_json(message)
```

### 2.3 Prometheus 配置

#### 2.3.1 prometheus.yml 更新

```yaml
# /opt/api-gateway/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # API Gateway 主应用
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['localhost:2000']
    metrics_path: '/metrics'
    
  # WebSocket 专用监控
  - job_name: 'websocket-monitor'
    static_configs:
      - targets: ['localhost:2000']
    metrics_path: '/metrics'
    scrape_interval: 10s  # 更频繁采集
    
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']
```

#### 2.3.2 告警规则

```yaml
# /opt/api-gateway/alerts/websocket.yml

groups:
  - name: websocket_alerts
    interval: 30s
    rules:
      # 连接数告警
      - alert: WebSocketConnectionsHigh
        expr: ws_connections_total > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "WebSocket 连接数过高"
          description: "当前连接数: {{ $value }}"
      
      # 连接失败率告警
      - alert: WebSocketConnectionFailures
        expr: rate(ws_connections_failed[5m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "WebSocket 连接失败率过高"
          description: "5分钟内失败率: {{ $value }}/s"
      
      # 延迟告警
      - alert: WebSocketLatencyHigh
        expr: histogram_quantile(0.95, rate(ws_latency_ms_bucket[5m])) > 100
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "WebSocket 延迟过高"
          description: "P95 延迟: {{ $value }}ms"
      
      # 消息错误告警
      - alert: WebSocketMessageErrors
        expr: rate(ws_message_errors[5m]) > 5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "WebSocket 消息错误过多"
          description: "错误率: {{ $value }}/s"
```

---

## 三、健康检查端点配置

### 3.1 增强的健康检查端点

```python
# app/api/health.py

from fastapi import APIRouter, Response
from datetime import datetime
import time
import psutil
import asyncio

router = APIRouter()

# 应用启动时间
START_TIME = time.time()

@router.get("/health")
async def health_check():
    """基础健康检查"""
    return {
        "status": "ok",
        "service": "API Gateway v3.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/api/health")
async def detailed_health_check():
    """详细健康检查 - 包含协作服务状态"""
    
    # 检查数据库
    db_status = await check_database()
    
    # 检查 WebSocket 服务
    ws_status = await check_websocket_service()
    
    # 检查内存
    memory = psutil.virtual_memory()
    
    # 检查 CPU
    cpu_percent = psutil.cpu_percent(interval=1)
    
    # 计算运行时间
    uptime = time.time() - START_TIME
    
    # 整体状态
    all_healthy = (
        db_status["status"] == "healthy" and
        ws_status["status"] == "healthy" and
        memory.percent < 90
    )
    
    status_code = 200 if all_healthy else 503
    
    response = {
        "status": "healthy" if all_healthy else "degraded",
        "service": "API Gateway v3.0",
        "version": "3.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": round(uptime, 2),
        "checks": {
            "database": db_status,
            "websocket": ws_status,
            "memory": {
                "status": "healthy" if memory.percent < 90 else "warning",
                "used_percent": memory.percent,
                "available_mb": memory.available / 1024 / 1024
            },
            "cpu": {
                "status": "healthy" if cpu_percent < 80 else "warning",
                "used_percent": cpu_percent
            }
        }
    }
    
    # WebSocket 统计
    from app.services.websocket_manager import ws_manager
    response["websocket_stats"] = ws_manager.get_stats()
    
    return Response(
        content=json.dumps(response),
        status_code=status_code,
        media_type="application/json"
    )

async def check_database() -> dict:
    """检查数据库连接"""
    try:
        from app.database import engine
        from sqlalchemy import text
        
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        
        return {
            "status": "healthy",
            "type": "sqlite",
            "latency_ms": 0  # 可以添加延迟测量
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

async def check_websocket_service() -> dict:
    """检查 WebSocket 服务状态"""
    try:
        from app.services.websocket_manager import ws_manager
        
        stats = ws_manager.get_stats()
        
        # 判断是否健康
        status = "healthy"
        if stats["connections"] > 1000:
            status = "warning"
        
        return {
            "status": status,
            "active_connections": stats["connections"],
            "unique_users": stats["unique_users"],
            "active_sessions": stats["active_sessions"]
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
```

### 3.2 Kubernetes 探针配置

```yaml
# kubernetes/deployment.yaml

livenessProbe:
  httpGet:
    path: /health
    port: 2000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/health
    port: 2000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2

startupProbe:
  httpGet:
    path: /health
    port: 2000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 30
```

---

## 四、部署检查清单

### 4.1 部署前检查

#### 环境准备
- [ ] 检查 Python 版本 >= 3.9
- [ ] 检查依赖包完整性 `pip install -r requirements.txt`
- [ ] 检查环境变量配置 `.env`
- [ ] 检查数据库备份
- [ ] 检查磁盘空间 >= 5GB 可用
- [ ] 检查内存 >= 2GB 可用

#### 配置验证
- [ ] 验证 JWT 密钥已配置
- [ ] 验证数据库路径正确
- [ ] 验证 CORS 配置
- [ ] 验证日志路径存在且有写权限

#### 监控准备
- [ ] Prometheus 已配置并运行
- [ ] Alertmanager 已配置告警规则
- [ ] Grafana Dashboard 已准备
- [ ] 日志收集已配置

### 4.2 部署步骤

#### 步骤 1：备份
```bash
# 备份数据库
cp /opt/api-gateway/api-gateway.db /opt/api-gateway/backups/api-gateway-$(date +%Y%m%d-%H%M%S).db

# 备份配置
cp /opt/api-gateway/.env /opt/api-gateway/backups/.env-$(date +%Y%m%d-%H%M%S)
```

#### 步骤 2：拉取最新代码
```bash
cd /opt/api-gateway
git fetch origin
git checkout v1.11.0
```

#### 步骤 3：安装依赖
```bash
pip install -r requirements.txt
```

#### 步骤 4：数据库迁移（如有）
```bash
alembic upgrade head
```

#### 步骤 5：重启服务
```bash
systemctl restart api-gateway
```

#### 步骤 6：验证部署
```bash
# 检查服务状态
systemctl status api-gateway

# 检查健康端点
curl http://localhost:2000/health
curl http://localhost:2000/api/health

# 检查日志
tail -f /opt/api-gateway/logs/app.log
```

### 4.3 部署后验证

#### 功能验证
- [ ] 健康检查端点返回正常
- [ ] API 文档可访问 `/docs`
- [ ] 用户登录功能正常
- [ ] WebSocket 连接可建立
- [ ] 协作功能正常工作

#### 监控验证
- [ ] Prometheus 可抓取指标
- [ ] Grafana 显示正常数据
- [ ] 告警规则已激活
- [ ] 日志正常收集

#### 性能验证
- [ ] 响应时间 < 200ms
- [ ] WebSocket 连接延迟 < 100ms
- [ ] 内存使用正常
- [ ] CPU 使用正常

### 4.4 回滚计划

如果部署失败：

```bash
# 1. 停止服务
systemctl stop api-gateway

# 2. 切换到旧版本
cd /opt/api-gateway
git checkout <previous-version>

# 3. 恢复数据库
cp /opt/api-gateway/backups/api-gateway-YYYYMMDD-HHMMSS.db /opt/api-gateway/api-gateway.db

# 4. 重启服务
systemctl start api-gateway

# 5. 验证
curl http://localhost:2000/health
```

### 4.5 监控仪表板配置

#### Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "WebSocket Collaboration Metrics",
    "panels": [
      {
        "title": "Active Connections",
        "type": "gauge",
        "targets": [
          {
            "expr": "ws_connections_total",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "title": "Message Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(ws_messages_sent[5m])",
            "legendFormat": "Messages Sent/s"
          },
          {
            "expr": "rate(ws_messages_received[5m])",
            "legendFormat": "Messages Received/s"
          }
        ]
      },
      {
        "title": "Latency (P95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(ws_latency_ms_bucket[5m]))",
            "legendFormat": "P95 Latency"
          }
        ]
      }
    ]
  }
}
```

---

## 五、常见问题排查

### 5.1 WebSocket 连接失败

**症状**: 客户端无法建立 WebSocket 连接

**排查步骤**:
1. 检查 Nginx 配置是否支持 WebSocket 升级
2. 检查防火墙规则
3. 检查服务日志
4. 验证 WebSocket 端点路径

**解决方案**:
```nginx
# Nginx WebSocket 配置
location /ws/ {
    proxy_pass http://localhost:2000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
}
```

### 5.2 连接频繁断开

**症状**: WebSocket 连接不稳定，频繁断开重连

**排查步骤**:
1. 检查网络稳定性
2. 检查超时配置
3. 检查心跳机制
4. 检查服务端日志

**解决方案**:
- 增加心跳频率
- 调整超时时间
- 实现自动重连机制

### 5.3 性能下降

**症状**: 响应延迟增加，连接处理变慢

**排查步骤**:
1. 检查服务器资源使用
2. 检查数据库查询性能
3. 检查 WebSocket 连接数
4. 检查消息队列积压

**解决方案**:
- 增加服务器资源
- 优化数据库查询
- 实现连接池
- 启用消息压缩

---

## 六、维护计划

### 6.1 日常维护

- **每日**: 检查服务状态、监控告警
- **每周**: 检查日志、性能趋势分析
- **每月**: 数据库备份验证、安全审计

### 6.2 升级计划

- **版本升级**: 测试环境验证 → 灰度发布 → 全量发布
- **依赖更新**: 定期检查安全更新
- **配置更新**: 变更管理流程

### 6.3 容量规划

- **当前容量**: 支持 1000 并发连接
- **扩展方案**: 
  - 水平扩展：多实例部署 + 负载均衡
  - 垂直扩展：增加服务器资源
  - 架构优化：Redis 发布订阅、消息队列

---

## 七、联系信息

### 技术支持

- **运维团队**: ops@7zi.com
- **开发团队**: dev@7zi.com
- **紧急联系**: +86-xxx-xxxx-xxxx

### 文档更新

- **更新日期**: 2026-04-03
- **更新人**: AI 系统管理员
- **版本**: 1.0

---

**备注**: 本文档基于当前服务器状态自动生成，请根据实际情况调整配置参数。
