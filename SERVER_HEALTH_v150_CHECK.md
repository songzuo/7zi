# 服务器健康检查报告

**服务器**: 7zi.com (165.99.43.61)  
**检查时间**: 2026-03-30 11:08:32 CST  
**运行时间**: 6 天 2 小时 21 分钟

---

## 1. CPU/内存使用率 ✅ 正常

| 指标                 | 值                     | 状态      |
| -------------------- | ---------------------- | --------- |
| CPU 负载 (1/5/15min) | 0.05 / 0.14 / 0.12     | ✅ 低负载 |
| CPU 使用率           | 1.4% user, 0.7% system | ✅ 正常   |
| 内存总量             | 7.8 GB                 | -         |
| 内存已用             | 2.5 GB (32%)           | ✅ 正常   |
| 内存可用             | 4.9 GB                 | ✅ 充足   |
| Swap                 | 未配置                 | ⚠️ 建议   |

**结论**: 系统资源充足，负载很低。

---

## 2. 磁盘空间 ⚠️ 需关注

| 分区                   | 大小 | 已用 | 可用 | 使用率 | 状态      |
| ---------------------- | ---- | ---- | ---- | ------ | --------- |
| /dev/vda1 (/)          | 88G  | 58G  | 30G  | 66%    | ⚠️ 需关注 |
| /dev/vda15 (/boot/efi) | 105M | 6.1M | 99M  | 6%     | ✅ 正常   |
| tmpfs                  | 3.9G | 6.6M | 3.9G | 1%     | ✅ 正常   |

**建议**:

- 根分区使用率 66%，建议定期清理日志和临时文件
- 当使用率超过 80% 时需要紧急处理

---

## 3. Docker 容器状态 ⚠️ 无容器运行

```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

**状态**: 无任何 Docker 容器运行

**结论**: 服务器当前没有通过 Docker 部署的应用。

---

## 4. Nginx 服务状态 ✅ 运行中

| 项目     | 状态                     |
| -------- | ------------------------ |
| 服务状态 | ✅ active (running)      |
| 运行时间 | 1 天 21 小时             |
| 进程数   | 9 (1 master + 8 workers) |
| 内存占用 | 27.4 MB                  |
| 开机启动 | ✅ enabled               |

### ⚠️ Nginx 配置警告

以下 server_name 配置存在冲突（重复定义）:

- `visa.7zi.com` on port 80
- `7zi.com` on port 80/443
- `www.7zi.com` on port 80/443
- `api.7zi.com` on port 443
- `mail.7zi.com` on port 443

**建议**: 检查 Nginx 配置文件，合并或删除重复的 server_name 定义。

---

## 5. 应用日志 ERROR 检查 ❌ 发现严重错误

### ❌ 系统服务错误 - good.7zi.com.service

**错误描述**: 服务持续启动失败，每 10 秒重试一次

```
Failed at step EXEC spawning /web/good/app-7yjgrzlwtatd/node_modules/.bin/taro:
No such file or directory
```

**问题分析**:

- 服务 `good.7zi.com.service` 配置的可执行文件不存在
- 路径 `/web/good/app-7yjgrzlwtatd/node_modules/.bin/taro` 缺失
- 可能原因：node_modules 未安装或路径错误

**建议操作**:

1. 检查服务配置: `systemctl cat good.7zi.com.service`
2. 进入项目目录重新安装依赖: `cd /web/good && npm install`
3. 或禁用该服务: `systemctl stop good.7zi.com.service && systemctl disable good.7zi.com.service`

---

## 总结

| 检查项   | 状态      | 说明                          |
| -------- | --------- | ----------------------------- |
| CPU      | ✅ 正常   | 负载极低                      |
| 内存     | ✅ 正常   | 使用率 32%                    |
| 磁盘     | ⚠️ 需关注 | 66% 使用率                    |
| Docker   | ⚠️ 无容器 | 无 Docker 应用运行            |
| Nginx    | ✅ 运行中 | 有配置警告                    |
| 服务错误 | ❌ 严重   | good.7zi.com.service 持续失败 |

### 需要立即处理

1. **修复 good.7zi.com.service** - 每隔 10 秒失败一次，造成日志堆积
2. **检查 Nginx 配置** - 修复重复的 server_name 定义

### 后续建议

1. 配置 Swap 分区（当前未配置）
2. 设置磁盘空间监控告警
3. 定期清理系统日志
