# ADR-0003: 使用 Redis 进行缓存

## 状态

Accepted

## 上下文

随着用户增长，需要缓存层来提升性能：

- 减少数据库查询
- 加速 API 响应
- 存储临时数据（会话、速率限制等）

现有性能瓶颈：

- 数据库查询耗时高（~50-200ms）
- 重复查询未缓存
- 分布式环境下的缓存同步问题

## 决策

采用 [Redis](https://redis.io/) 作为主要的缓存和会话存储。

### 实现方案

1. **缓存策略**:
   - LRU (Least Recently Used) 淘汰策略
   - TTL (Time-To-Live) 自动过期
   - 多级缓存（内存 + Redis）

2. **缓存类型**:
   - 数据库查询缓存
   - API 响应缓存
   - Session 存储
   - 速率限制计数器
   - WebSocket 适配器

3. **配置**:
   - 内存: 256MB
   - 最大连接数: 100
   - 持久化: RDB + AOF (可选)

### Redis 优势

- **高性能**: 内存存储，读写速度快（~100K ops/s）
- **数据结构丰富**: String, Hash, List, Set, Sorted Set
- **原子操作**: 支持事务
- **TTL**: 自动过期机制
- **分布式**: 支持集群和哨兵模式
- **持久化**: 可选的 RDB 和 AOF

## 权衡

### 替代方案 1: Memcached

**优点**:

- 简单高效
- 成熟稳定

**缺点**:

- 数据结构单一（仅 Key-Value）
- 无持久化
- 功能有限

**选择 Redis 的原因**: 项目需要多种数据结构（List 用于队列、Set 用于标签等），Redis 更适合。

### 替代方案 2: 内存缓存 (Node.js Map)

**优点**:

- 零外部依赖
- 访问速度快
- 简单易用

**缺点**:

- 内存占用高
- 多实例无法共享
- 无持久化

**选择 Redis 的原因**: 项目需要多实例共享缓存和持久化，Redis 是必要的选择。

### 替代方案 3: 数据库缓存表

**优点**:

- 无需额外服务
- 数据持久化

**缺点**:

- 性能较差（磁盘 I/O）
- 增加数据库负载

**选择 Redis 的原因**: 缓存层应比数据库快 10-100 倍，Redis 能满足性能需求。

## 后果

### 正面影响

- ✅ **性能提升**: 数据库查询减少 60-80%
- ✅ **响应速度**: API 响应时间从 50-200ms 降至 10-50ms
- ✅ **可扩展**: 支持分布式部署
- ✅ **功能丰富**: 支持多种数据结构和原子操作
- ✅ **会话管理**: 统一的 Session 存储

### 负面影响

- ⚠️ **复杂度增加**: 需要维护 Redis 服务
- ⚠️ **缓存一致性问题**: 需要处理缓存失效
- ⚠️ **内存成本**: Redis 需要额外内存

### 缓存策略

1. **Cache-Aside Pattern**:

   ```typescript
   // 伪代码
   async function getData(key) {
     const cached = await redis.get(key)
     if (cached) return JSON.parse(cached)

     const data = await db.query(key)
     await redis.set(key, JSON.stringify(data), 'EX', 3600)
     return data
   }
   ```

2. **Write-Through Pattern**:

   ```typescript
   // 写入时同时更新缓存
   async function setData(key, value) {
     await db.set(key, value)
     await redis.set(key, JSON.stringify(value), 'EX', 3600)
   }
   ```

3. **Tag-based Invalidation** (用于 Next.js):
   ```typescript
   // 基于标签的缓存失效
   revalidateTag('user:123')
   ```

## 相关决策

- [ADR-0007: 性能监控架构](0007-performance-monitoring-architecture.md) - Redis 作为性能监控数据存储
- [ADR-0008: WebSocket 房间系统设计](0008-websocket-room-system-design.md) - Redis Adapter 用于多服务器支持
