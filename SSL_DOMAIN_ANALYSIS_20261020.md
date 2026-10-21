# SSL 域名续期问题分析报告

**分析日期**: 2026-10-20  
**分析师**: 📚 咨询师（Consultant）  
**服务器**: bot6 (109.123.246.140)

---

## 一、域名 SSL 状态总览

| 域名 | 当前证书到期日 | SSL 状态 | nginx 配置 | DNS 指向 |
|------|---------------|----------|------------|----------|
| `86.work.gd` | ❌ 已过期 3个月+ | 无有效证书 | ❌ 不存在 | 165.99.43.61 (非本机) |
| `mainlander.cn` | ✅ 2026-12-10 | 有效 | ❌ 不存在 | 198.44.179.155 (本机? 但未匹配) |
| `visa.mainlander.cn` | ❌ 2026-05-11 已过期 | 过期证书仍可用 | ❌ 不存在 | 198.44.179.155 (本机? 但未匹配) |

> **关键发现**: 这三个域名在当前 bot6 服务器的 nginx 中**均无配置**。

---

## 二、逐域名分析

### 1. `86.work.gd`

**证书状态**: SSL 连接返回 `mainlander.cn` 证书（DNS/路由异常）

**DNS 解析**:
```
165.99.43.61
```
指向的是**另一台服务器**（nginx 1.18.0 Ubuntu），该服务器将 HTTP 请求重定向到 `https://7zi.com/`。

**nginx 配置**: ❌ **不存在** — 当前 bot6 上无任何 86.work.gd 的 server block

**webroot 验证测试**:
```
$ curl -I http://86.work.gd/.well-known/acme-challenge/test
→ 301 重定向到 https://7zi.com/.well-known/acme-challenge/test
```
Let's Encrypt 机器人无法跟踪外部重定向，验证必然失败。

**结论**: 该域名当前解析到**第三方服务器**，与本 bot6 无关。

---

### 2. `mainlander.cn`

**证书状态**: ✅ 有效（2026-12-10 到期）
```
NotBefore: Sep 11 03:10:58 2026 GMT
NotAfter:  Dec 10 03:10:57 2026 GMT
Issuer:    Let's Encrypt (YE1)
```
**但**: 该证书安装在 198.44.179.155（与本机 109.123.246.140 不同）

**DNS 解析**:
```
198.44.179.155
```
本地路由显示 `198.44.179.155 via 109.123.240.1 dev eth0 src 109.123.246.140`，说明本机网卡上有这个 IP（或路由可达）。

**nginx 配置**: ❌ **不存在** — 无 mainlander.cn 的 server block

**webroot 验证测试**:
```
$ curl -I http://mainlander.cn/.well-known/acme-challenge/test
→ 301 重定向到 https://www.7zi.com/
```
Let's Encrypt 验证失败（重定向到外部域名）。

**结论**: 域名有有效证书但证书安装在**其他服务器**上，本机无 nginx 配置。

---

### 3. `visa.mainlander.cn`

**证书状态**: ❌ **已过期**（2026-05-11）
```
CN = *.mainlander.cn
NotAfter:  May 11 22:02:41 2026 GMT
```
HTTPS 访问仍可返回内容（不验证证书），但浏览器会报安全警告。

**DNS 解析**: 同 mainlander.cn → 198.44.179.155

**nginx 配置**: ❌ **不存在** — 无 visa.mainlander.cn 的 server block

**webroot 验证测试**:
```
$ curl -I http://visa.mainlander.cn/.well-known/acme-challenge/test
→ 200 OK (有内容返回)
```
HTTP 路径可访问，但**无 nginx 配置处理**，实际返回的是默认 server 内容。

**结论**: 证书已过期，本机无配置，DNS 指向可能正确的服务器。

---

## 三、webroot 验证失败根本原因

| 原因 | 说明 |
|------|------|
| **域名未在 nginx 中配置** | 三个域名的 server block 均不存在，acme-challenge 请求无 location 处理 |
| **HTTP → HTTPS 强制重定向** | mainlander.cn 和 86.work.gd 将 HTTP 请求重定向到 HTTPS 或外部域名 |
| **DNS 指向可能不一致** | 86.work.gd 指向 165.99.43.61（完全不同服务器），mainlander.cn/visa 指向 198.44.179.155 |
| **无 .well-known/acme-challenge/ 目录** | 未确认是否存在对应 webroot 目录 |

---

## 四、域名价值评估

| 域名 | 是否仍在使用 | 依据 | 价值评估 |
|------|-------------|------|----------|
| `86.work.gd` | ❓ **存疑** | DNS 不指向本机，原域名可能已废弃迁走 | 低 — 已失效 3个月+ |
| `mainlander.cn` | ✅ **可能使用中** | 有有效证书，DNS 仍指向服务器 | 中 — 证书还有 2 个月 |
| `visa.mainlander.cn` | ✅ **仍在使用** | 子域名明确业务用途，证书已过期需续期 | 高 — 业务域名，已过期 |

---

## 五、决策建议

### A. `86.work.gd` → 🔴 **建议放弃**

**理由**:
- DNS 已脱离本服务器，指向第三方（165.99.43.61）
- 已过期 3 个月，如仍在使用早该有人反馈
- 域名名称 "86.work.gd" 含义模糊，可能是临时项目域名

**操作**: 从 nginx 中移除相关配置（如存在），不再续期。

---

### B. `mainlander.cn` → 🟡 **评估后决定**

**理由**:
- 证书仍有效（2026-12-10），有缓冲时间
- 需要确认域名当前是否仍被访问/使用
- DNS 指向 198.44.179.155，与本机 IP (109.123.246.140) 不一致，需核查

**操作**: 
1. 确认域名业务是否仍需要
2. 如需保留：修复 nginx 配置并重新申请证书
3. 如已废弃：移除配置并停止续期

---

### C. `visa.mainlander.cn` → 🟢 **建议修复并续期**

**理由**:
- `visa.` 子域名明确指向签证相关业务
- 证书已过期，浏览器报安全警告，影响业务
- 尽快续期可避免业务中断

---

## 六、修复步骤（针对 visa.mainlander.cn）

### 步骤 1: 创建 nginx server block

```bash
# 创建配置文件
sudo nano /etc/nginx/conf.d/visa.mainlander.cn.conf
```

内容:
```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name visa.mainlander.cn;

    # SSL 证书（先使用自签名，续期后替换）
    ssl_certificate /etc/letsencrypt/live/visa.mainlander.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/visa.mainlander.cn/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # ACME webroot（关键！）
    location /.well-known/acme-challenge/ {
        root /var/www/acme;
        allow all;
    }

    # 业务代理（根据实际需求调整）
    location / {
        proxy_pass http://127.0.0.1:YOUR_PORT;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 步骤 2: 创建 webroot 目录

```bash
sudo mkdir -p /var/www/acme/.well-known/acme-challenge
sudo chmod -R 755 /var/www/acme
```

### 步骤 3: 测试 nginx 配置

```bash
sudo nginx -t
```

### 步骤 4: 重新加载 nginx

```bash
sudo systemctl reload nginx
```

### 步骤 5: 验证 webroot 可访问

```bash
# 创建测试文件
echo "test" | sudo tee /var/www/acme/.well-known/acme-challenge/testfile

# 验证
curl -I http://visa.mainlander.cn/.well-known/acme-challenge/testfile
# 期望: HTTP/1.1 200 OK（不重定向）
```

### 步骤 6: 使用 certbot 申请/续期证书

```bash
# 方式 A: 申请新证书（webroot 模式）
sudo certbot certonly --webroot -w /var/www/acme -d visa.mainlander.cn --agree-tos --email your@email.com --no-eff-email

# 方式 B: 如果 certbot 已配置域名，可用
sudo certbot renew --webroot -w /var/www/acme
```

### 步骤 7: 验证证书

```bash
openssl s_client -connect visa.mainlander.cn:443 -servername visa.mainlander.cn </dev/null 2>&1 | grep "NotAfter"
```

---

## 七、附：检查清单

```bash
# 1. 检查 DNS 是否指向本机
dig +short visa.mainlander.cn A
# 期望: 本机 IP (198.44.179.155 或 109.123.246.140)

# 2. 检查 webroot 路径
ls -la /var/www/acme/.well-known/acme-challenge/

# 3. 确认 nginx 包含 acme location
grep -A5 "acme-challenge" /etc/nginx/conf.d/visa.mainlander.cn.conf

# 4. 测试 HTTP 验证路径（无重定向）
curl -I http://visa.mainlander.cn/.well-known/acme-challenge/test
# 期望: HTTP/1.1 200 OK，不应有 Location 重定向
```

---

## 八、总结

| 域名 | 建议操作 | 优先级 | 原因 |
|------|---------|--------|------|
| `86.work.gd` | 🔴 放弃 | 低 | DNS 已脱离，失效 3个月+ |
| `mainlander.cn` | 🟡 评估后决定 | 中 | 证书仍有效，需确认业务需求 |
| `visa.mainlander.cn` | 🟢 立即修复续期 | 高 | 业务域名已过期，需尽快处理 |

---

*报告生成时间: 2026-10-20 22:40 GMT+2*
