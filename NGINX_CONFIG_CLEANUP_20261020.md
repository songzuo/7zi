# Nginx 配置清理报告
**日期**: 2026-10-21  
**执行者**: 🛡️ 系统管理员子代理  
**状态**: ✅ 清理完成

---

## 1. 配置审计结果

### 1.1 当前配置文件清单

| 文件 | 用途 | 端口 | server_name |
|------|------|------|-------------|
| `ai-frontend.conf` | bot6 前端+AI API (HTTP) | 80 | `bot6.szspd.cn _` |
| `bot6-https.conf` | bot6 HTTPS | 443 | `bot6.szspd.cn _` |
| `bot6.conf` | 默认 HTTP 捕获 (旧) | 80 | `_` |
| `szspd-shop.conf` | szspd 商城 | 80/443 | `szspd.cn www.szspd.cn` |
| `mail-api.conf` | 邮件 API | 80/443 | `mail.7zi.com` |
| `bt_proxy.conf` | BT 代理 | 40099 | `_` |

### 1.2 发现的重复/冲突问题

#### 问题 1: bot6.szspd.cn 三处定义 (实际为 2 处)

| 文件 | 端口 | server_name | 问题 |
|------|------|-------------|------|
| `ai-frontend.conf` | 80 | `bot6.szspd.cn _` | HTTP 重定向 + 前端服务 |
| `bot6-https.conf` | 443 | `bot6.szspd.cn _` | HTTPS 服务 |
| `bot6.conf` | 80 | `_` | **冲突! 与 ai-frontend.conf 的 `_` 冲突** |

**nginx -t 输出**:
```
2026/10/21 00:39:46 [warn] conflicting server name "_" on 0.0.0.0:80, ignored
```
⚠️ `bot6.conf` 的 `server_name _` 与 `ai-frontend.conf` 的 `server_name bot6.szspd.cn _` 冲突，nginx 忽略了 bot6.conf。

#### 问题 2: szspd.cn/www.szspd.cn 重复定义 (误报)

szspd-shop.conf 中有两个 server 块：
- 第 10 行: HTTP (port 80) → 301 重定向到 HTTPS
- 第 17 行: HTTPS (port 443) → 实际服务

**这不是重复!** HTTP 和 HTTPS 是互补配置，分属不同端口，nginx 正常处理。

---

## 2. 流量/服务状态分析

| 服务 | 端口 | 进程 | 状态 |
|------|------|------|------|
| nginx | 80/443 | nginx (pid 1021) | ✅ 运行中 |
| Next.js (商城) | 3006 | next-server (pid 1789) | ✅ 运行中 |
| P2P Lobby | 35500 | python3 (pid 763) | ✅ 运行中 |
| Mail API | 8081 | python3 (pid 747) | ✅ 运行中 |
| microclaw (:28790) | - | ❌ 未运行 | ⚠️ 下游服务缺失 |
| Java 后端 (:8868) | - | ❌ 未运行 | ⚠️ 下游服务缺失 |

**注意**: `:28790` (microclaw) 和 `:8868` (Java) 目前未检测到进程，但 nginx 配置仍保留这些代理规则——可能是历史遗留配置。

---

## 3. 清理方案

### 方案: 删除已冲突的 bot6.conf

**理由**:
1. `bot6.conf` 的 `server_name _` 被 nginx 忽略（冲突警告）
2. `ai-frontend.conf` 已经覆盖了相同功能（HTTP -> 前端 + API 代理）
3. `bot6.conf` 是一个较旧的备份文件（内容几乎相同，仅 proxy_pass 路径略有差异）

**保留**:
- `ai-frontend.conf` - 活跃使用，处理 bot6.szspd.cn HTTP
- `bot6-https.conf` - 活跃使用，处理 bot6.szspd.cn HTTPS
- `szspd-shop.conf` - 活跃使用
- `mail-api.conf` - 活跃使用
- `bt_proxy.conf` - 活跃使用

**删除**:
- `bot6.conf` - 已冲突，被忽略，无实际作用

**SSL 证书**: 全部保留，不做修改

---

## 4. 备份

在清理前，创建备份目录：
```bash
mkdir -p /root/nginx-backup-20261021
cp /etc/nginx/conf.d/bot6.conf /root/nginx-backup-20261021/
```

---

## 5. 执行步骤

```bash
# 1. 备份
mkdir -p /root/nginx-backup-20261021
cp /etc/nginx/conf.d/bot6.conf /root/nginx-backup-20261021/

# 2. 删除冲突文件
rm /etc/nginx/conf.d/bot6.conf

# 3. 验证配置
/usr/sbin/nginx -t

# 4. 重载 nginx
systemctl reload nginx

# 5. 验证服务
ss -tlnp | grep :80
curl -I https://bot6.szspd.cn 2>/dev/null | head -5
curl -I https://szspd.cn 2>/dev/null | head -5
```

---

## 6. 验证结果 (清理后)

```
# nginx -t 应无任何 warn/error
nginx: configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful

# 无 conflicting server name 警告
```

---

## 7. 后续建议

1. **清理幽灵代理**: `:28790` 和 `:8868` 下游服务不存在，建议评估是否需要清理相关 location 块
2. **合并 ai-frontend.conf + bot6-https.conf**: 两者服务同一域名，可考虑合并为单个文件（HTTP + HTTPS 在同一 server 块），减少文件数量
3. **定期审计**: 建议每季度检查一次 nginx 配置，移除不使用的规则

---

## 8. 执行记录

| 时间 | 操作 | 结果 |
|------|------|------|
| 2026-10-21 00:41 | 备份 bot6.conf → /root/nginx-backup-20261021/ | ✅ |
| 2026-10-21 00:41 | 删除 /etc/nginx/conf.d/bot6.conf | ✅ |
| 2026-10-21 00:41 | nginx -t | ✅ 无警告 |
| 2026-10-21 00:41 | systemctl reload nginx | ✅ |
| 2026-10-21 00:41 | 验证 szspd.cn (HTTPS) | ✅ 200 OK |
| 2026-10-21 00:41 | 验证 szspd.cn (HTTP→HTTPS) | ✅ 301 重定向 |
| 2026-10-21 00:41 | 验证 bot6.szspd.cn | ⚠️ 403 (根目录为空，与本次清理无关) |

## 9. 额外发现的问题

### ⚠️ bot6.szspd.cn 403 错误（与本次清理无关）

**原因**: `/opt/frontend/` 目录为空，nginx 无法找到 `index.html` 返回目录索引，被拒绝。

**影响**: bot6.szspd.cn 前端不可访问（API 代理可能仍正常）

**建议**: 需要重新部署前端文件到 `/opt/frontend/`

---

## 附录: 当前完整 server_name 映射

```
bot6.szspd.cn  →  ai-frontend.conf (80) + bot6-https.conf (443)
szspd.cn       →  szspd-shop.conf (80→443 重定向, 443 服务)
www.szspd.cn   →  szspd-shop.conf (80→443 重定向, 443 服务)
mail.7zi.com   →  mail-api.conf (80/443)
*:40099        →  bt_proxy.conf
*:80 (默认)    →  ai-frontend.conf (server_name _)
```
