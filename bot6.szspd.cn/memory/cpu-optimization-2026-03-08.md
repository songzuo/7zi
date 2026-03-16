# CPU 优化报告 - 2026-03-08

## 问题发现
健康检查发现 CPU 负载 129%，Node.js 进程占用过高。

## 根本原因
两个 vitest 测试 worker 进程并行运行，占用 238% CPU：
- PID 2274124: vitest worker - 150% CPU, 2.3GB 内存
- PID 2274115: vitest worker - 114% CPU, 2.0GB 内存

## 执行操作

### 1. 终止高负载进程
```bash
kill -15 2274124 2274115  # vitest workers
kill -15 2273366          # vitest main process
```

### 2. 优化 vitest 配置
编辑 `vitest.config.ts`，添加并行限制：
```typescript
test: {
  // 限制并行 worker 数量，避免 CPU 过载
  maxWorkers: 2,
  minWorkers: 1,
  ...
}
```

## 优化结果

### 优化前
- CPU 负载：129%+
- 用户态 CPU: 95.8%
- 空闲 CPU: 0.0%
- 内存使用：6.2GB / 8GB

### 优化后
- CPU 负载：~3.2 (正常)
- 用户态 CPU: 25.6% (包含 apt-get 临时进程)
- 空闲 CPU: 67.4%
- 内存使用：1.8GB / 8GB
- 可用内存：6.2GB

## 后续建议

1. **运行测试时使用限制**：
   ```bash
   # 显式限制 worker 数量
   npm run test -- --maxWorkers=2
   ```

2. **监控 CPU 使用**：
   ```bash
   # 查看 top 进程
   ps aux --sort=-%cpu | head -10
   ```

3. **CI/CD 优化**：
   - 在生产环境运行测试时，确保设置 `CI=true` 和 worker 限制
   - 考虑使用 `--bail` 选项在失败时快速退出

## 配置文件更新
- ✅ `vitest.config.ts` - 添加 maxWorkers: 2

---
优化完成，系统 CPU 使用率恢复正常。
