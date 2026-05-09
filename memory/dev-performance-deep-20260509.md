# 深度性能分析报告 - 2026-05-09 02:45

## 📊 系统概览

| 项目 | 值 |
|------|-----|
| CPU | 4核 (负载 9.27 = 严重过载) |
| 内存 | 7.9GB total, 可用 2.0GB (26%) |
| Swap | 4GB total, 使用 3GB (73%) |
| 磁盘 | 72G/145G (50%) |

---

## 🔥 资源消耗最多的进程

### CPU 排行
| 进程 | PID | CPU | RSS |
|------|-----|-----|-----|
| node (vitest fork worker) | 2748179 | **77%** | 139MB |
| node (vitest fork worker) | 3444098 | **53%** | 183MB |
| node (vitest fork worker) | 3443882 | **53%** | 183MB |
| node (vitest fork worker) | 3421818 | **52%** | 181MB |
| node (vitest fork worker) | 3434927 | **52%** | 176MB |
| node (vitest fork worker) | 3442838 | **51%** | 180MB |
| node (vitest fork worker) | 3409278 | **50%** | 174MB |
| openclaw-gateway | 298333 | 6.9% | **1.2GB** |
| java (im-usersearch) | 989687 | 1.9% | 368MB |
| java (elasticsearch) | 3354444 | 0.8% | 337MB |

### 内存排行
| 进程 | PID | MEM | RSS |
|------|-----|-----|-----|
| **openclaw-gateway** | 298333 | **15.3%** | **1.2GB** |
| node (vitest --coverage) | 3304575 | 4.6% | 371MB |
| java (im-usersearch) | 989687 | 4.6% | 376MB |
| java (elasticsearch) | 3354444 | 4.1% | 337MB |
| node (vitest run) | 3313010 | 4.1% | 328MB |
| node (vitest --coverage --reporter=json) | 3303587 | 3.9% | 323MB |
| node (vitest --reporter=verbose) | 3299203 | 3.9% | 321MB |
| node (vitest --coverage) | 3299514 | 3.9% | 320MB |

**Node.js 进程总内存消耗: ~5.4GB** (含 7+ vitest worker 进程)

---

## ⚠️ 主要问题

### 1. Vitest 测试进程疯狂占用 CPU
- **7个 vitest fork worker** 在同时运行，每个 50%+ CPU
- 总计占用约 **400% CPU**（超过4核上限）
- 同时还有 5个 vitest run 进程在后台运行
- 这些是执行 `vitest run --coverage` 的测试进程

### 2. Swap 使用过高 (73%)
- 已使用 3GB / 4GB
- **原因**: 大量 node 进程 + Java 服务压满内存
- Active(anon) = 4.9GB，远超 MemAvailable 2GB
- 内核被迫换出页面

### 3. 磁盘 I/O 压力
```
sda: r/s=954, w/s=6, dkB/s=6872 (持续高读)
d_await: 1718ms (写延迟极高)
%util: 61-75%
```
- 主要来源：vitest 产生大量读取（可能加载大量模块）
- 写操作：主要在 loop0 (可能的日志/TMP)

### 4. 僵尸进程
- 发现 4 个 zombie 进程 (`ps` 显示 4 zombie)
- 父进程可能未能正确回收

---

## 🔍 分析

### 内存泄漏?
- **不是内存泄漏**。node 进程内存高是正常的（V8 堆 + 模块缓存）
- 但多个 vitest 进程同时存在说明有进程泄露（测试完成后未退出）
- openclaw-gateway 本身 1.2GB 合理

### Swap 过多原因
1. 7个 vitest worker + 5个 vitest 主进程同时运行
2. Java 服务占用 ~700MB
3. 系统内存被压垮，内核开始换页

### 异常进程
- 无恶意进程
- 但 **vitest 进程数量异常**：多个 `--coverage` 和 `--reporter=verbose` 同时运行
- 这说明有人/脚本同时启动了多个测试任务

---

## 💡 建议

1. **立即清理 vitest 进程**:
   ```bash
   pkill -f "vitest run"   # 停止所有测试进程
   ```

2. **限制 vitest 并发**: 添加 `--pool=forks --poolOptions.forks.singleFork` 限制并发数

3. **增加内存或减少并发**: swap 使用已超 70%，高负载下系统不稳定

4. **检查僵尸进程**: 找到这些 zombie 的父进程，可能需要手动 kill

5. **监控 I/O**: iostat 显示 d_await=1718ms，建议后续加装 SSD

---

## 📈 关键指标汇总

```
Load Average: 9.27 (严重过载, 4核系统)
CPU 使用率: 92% (user), 7.7% (system)
内存使用: 5896MB / 7941MB (74%)
Swap 使用: 3077820KB / 4194300KB (73%)
磁盘 util: 62-75% (sda)
iostat 读: 900+ r/s, ~7000KB/s
```