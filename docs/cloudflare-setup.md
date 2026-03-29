# Cloudflare CDN 配置指南

**文档版本:** 1.0
**创建日期:** 2026-03-29
**适用项目:** 7zi-frontend

---

## 📋 概述

本文档详细说明如何为 7zi.com 配置 Cloudflare CDN，使用免费套餐实现：
- 全球加速（200+ 数据中心）
- 带宽节省 60%+
- DDoS 防护
- SSL 证书管理
- 页面缓存优化

---

## 🚀 第一步：注册 Cloudflare 账户

### 1.1 注册账户

1. 访问 [Cloudflare 官网](https://dash.cloudflare.com/sign-up)
2. 填写邮箱和密码
3. 验证邮箱地址

### 1.2 选择免费套餐

Cloudflare 免费套餐包含：
- ✅ 无限流量
- ✅ 全球 CDN 加速
- ✅ 免费 SSL 证书
- ✅ DDoS 防护
- ✅ 页面规则（3 条）
- ✅ 缓存分析

---

## 🌐 第二步：添加域名

### 2.1 添加站点

```
1. 登录 Cloudflare Dashboard
2. 点击 "Add a site"
3. 输入域名: 7zi.com
4. 选择 "Free" 套餐
5. 点击 "Continue"
```

### 2.2 DNS 记录扫描

Cloudflare 会自动扫描现有 DNS 记录。

**预期的 DNS 记录：**

| 类型 | 名称 | 内容 | 代理状态 |
|------|------|------|----------|
| A | @ | 165.99.43.61 | ✅ 已代理 |
| A | www | 165.99.43.61 | ✅ 已代理 |
| CNAME | api | 7zi.com | ✅ 已代理 |

### 2.3 更换域名服务器

Cloudflare 会提供两个名称服务器：

```
示例：
  bob.ns.cloudflare.com
  linda.ns.cloudflare.com
```

**更换步骤：**

1. 登录域名注册商后台（购买 7zi.com 的地方）
2. 找到 DNS 设置 / 名称服务器设置
3. 将原有名称服务器替换为 Cloudflare 提供的服务器
4. 保存更改

**生效时间：** 通常 2-24 小时

---

## 🔒 第三步：配置 SSL/TLS

### 3.1 SSL 加密模式

**推荐配置：Full (Strict)**

```
Cloudflare Dashboard → SSL/TLS → Overview

选择: Full (strict)
```

**模式说明：**

| 模式 | 说明 | 推荐度 |
|------|------|--------|
| Off | 无加密 | ❌ 不推荐 |
| Flexible | Cloudflare 到浏览器加密，服务器无加密 | ⚠️ 不安全 |
| Full | Cloudflare 到服务器加密，但不验证证书 | ✅ 可用 |
| **Full (strict)** | 完全加密 + 证书验证 | ✅ **推荐** |

### 3.2 服务器证书要求

Full (Strict) 模式要求源服务器有有效证书：

```bash
# 检查服务器证书
curl -v https://7zi.com/api/health 2>&1 | grep -i "ssl\|tls"

# 或使用 openssl
openssl s_client -connect 7zi.com:443 -servername 7zi.com
```

**如果服务器使用自签名证书：**
- 使用 Let's Encrypt 获取免费证书
- 或使用 Cloudflare Origin Certificate

### 3.3 Origin Certificate（备选方案）

如果无法获取 Let's Encrypt 证书：

```
Cloudflare Dashboard → SSL/TLS → Origin Server

1. 点击 "Create Certificate"
2. 选择有效期：15 年
3. 选择主机名：7zi.com, *.7zi.com
4. 点击 "Create"
5. 下载证书和私钥
```

**安装到服务器：**

```bash
# 创建证书目录
mkdir -p /etc/nginx/ssl/cloudflare

# 保存证书
cat > /etc/nginx/ssl/cloudflare/origin.pem << 'EOF'
-----BEGIN CERTIFICATE-----
[粘贴证书内容]
-----END CERTIFICATE-----
EOF

# 保存私钥
cat > /etc/nginx/ssl/cloudflare/origin.key << 'EOF'
-----BEGIN PRIVATE KEY-----
[粘贴私钥内容]
-----END PRIVATE KEY-----
EOF

# 设置权限
chmod 600 /etc/nginx/ssl/cloudflare/origin.key
```

---

## ⚡ 第四步：配置缓存规则

### 4.1 默认缓存行为

Cloudflare 默认缓存：
- 静态文件：图片、CSS、JS
- 不缓存：HTML、动态内容

### 4.2 页面规则配置

**免费套餐支持 3 条页面规则**

#### 规则 1：静态资源缓存（最高优先级）

```
URL 模式: *7zi.com/_next/static/*

设置:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: 1 year
```

**说明：** Next.js 静态资源包含内容哈希，可永久缓存

#### 规则 2：图片缓存

```
URL 模式: *7zi.com/_next/image*

设置:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 30 days
  - Browser Cache TTL: 7 days
```

#### 规则 3：API 缓存（可选）

```
URL 模式: *7zi.com/api/public/*

设置:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 5 minutes
  - Browser Cache TTL: 2 minutes
```

### 4.3 配置缓存规则（新界面）

```
Cloudflare Dashboard → Caching → Configuration

1. Caching Level: Standard
2. Browser Cache TTL: 4 hours
3. Always Online: On
```

---

## 📄 第五步：配置 Page Rules

### 5.1 创建页面规则

```
Cloudflare Dashboard → Rules → Page Rules

点击 "Create Page Rule"
```

### 5.2 推荐规则配置

**规则 1 - Next.js 静态资源**
```
URL: 7zi.com/_next/static/*

设置:
  ✓ Cache Level: Cache Everything
  ✓ Edge Cache TTL: 1 month
  ✓ Browser Cache TTL: 1 month
```

**规则 2 - 图片优化**
```
URL: 7zi.com/_next/image*

设置:
  ✓ Cache Level: Cache Everything
  ✓ Edge Cache TTL: 1 week
  ✓ Browser Cache TTL: 1 day
```

**规则 3 - 首页缓存**
```
URL: 7zi.com/

设置:
  ✓ Cache Level: Standard
  ✓ Edge Cache TTL: 2 hours
```

---

## 🔧 第六步：优化配置

### 6.1 性能优化

```
Cloudflare Dashboard → Speed → Optimization

推荐启用:
  ✓ Auto Minify: JavaScript, CSS, HTML
  ✓ Brotli: On
  ✓ Early Hints: On
  ✓ Rocket Loader: Off (可能与 Next.js 冲突)
```

### 6.2 安全配置

```
Cloudflare Dashboard → Security

推荐设置:
  ✓ Security Level: Medium
  ✓ Challenge Passage: 30 minutes
  ✓ Browser Integrity Check: On
  ✓ Bot Fight Mode: On
```

### 6.3 网络配置

```
Cloudflare Dashboard → Network

推荐启用:
  ✓ HTTP/3 (QUIC): On
  ✓ 0-RTT Connection Resumption: On
  ✓ WebSockets: On
```

---

## 📊 第七步：监控和分析

### 7.1 查看缓存统计

```
Cloudflare Dashboard → Analytics & Logs

查看指标:
  - 带宽节省
  - 请求数量
  - 缓存命中率
  - 威胁阻止
```

### 7.2 缓存命中率目标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 缓存命中率 | > 85% | 静态资源命中率 |
| 带宽节省 | > 60% | CDN 节省带宽比例 |
| 平均响应时间 | < 100ms | 全球平均 |

### 7.3 清除缓存

当更新网站时需要清除缓存：

```bash
# 通过 Dashboard
Cloudflare Dashboard → Caching → Configuration → Purge Everything

# 或使用 API（需要 API Token）
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

---

## 🔄 第八步：Nginx 配置适配

### 8.1 更新 Nginx 配置

为 Cloudflare 优化 Nginx：

```nginx
# /etc/nginx/conf.d/cloudflare.conf

# Cloudflare IP 地址范围（定期更新）
# 获取地址: https://www.cloudflare.com/ips/

# 真实 IP 设置
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;

real_ip_header CF-Connecting-IP;

# 缓存控制头
location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-Content-Type-Options "nosniff";
}

location /_next/image {
    expires 30d;
    add_header Cache-Control "public";
}

# 禁用不必要的日志（Cloudflare 已记录）
location ~*\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
    access_log off;
    expires 7d;
}
```

### 8.2 SSL 配置

```nginx
# 使用 Cloudflare Origin Certificate
server {
    listen 443 ssl http2;
    server_name 7zi.com www.7zi.com;

    ssl_certificate /etc/nginx/ssl/cloudflare/origin.pem;
    ssl_certificate_key /etc/nginx/ssl/cloudflare/origin.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS（可选，Cloudflare 也可设置）
    add_header Strict-Transport-Security "max-age=63072000" always;
}
```

---

## 🧪 第九步：验证配置

### 9.1 检查 CDN 生效

```bash
# 检查响应头
curl -I https://7zi.com

# 期望看到
# cf-cache-status: HIT (缓存命中)
# cf-ray: xxx (Cloudflare Ray ID)
# server: cloudflare
```

### 9.2 检查 SSL

```bash
# 检查 SSL 证书
openssl s_client -connect 7zi.com:443 -servername 7zi.com 2>/dev/null | openssl x509 -noout -issuer

# 期望看到
# issuer=C = US, O = "Cloudflare, Inc.", CN = Cloudflare Inc ECC CA-3
```

### 9.3 测试全球延迟

```bash
# 使用不同地理位置测试
# 欧洲
curl -w "Time: %{time_total}s\n" -o /dev/null -s https://7zi.com

# 或使用在线工具
# https://tools.keycdn.com/performance
# https://www.webpagetest.org/
```

---

## ⚠️ 常见问题

### 问题 1：重定向循环

**症状：** ERR_TOO_MANY_REDIRECTS

**解决方案：**
1. 检查 SSL 模式是否正确（应使用 Full 或 Full Strict）
2. 确保 Nginx 没有强制 HTTPS 重定向到 HTTP

### 问题 2：缓存未命中

**症状：** cf-cache-status: MISS

**解决方案：**
1. 检查页面规则是否正确配置
2. 检查响应头是否有 `Cache-Control: no-cache` 或 `private`
3. 确保 URL 模式匹配

### 问题 3：WebSocket 连接失败

**症状：** WebSocket 连接断开

**解决方案：**
```
Cloudflare Dashboard → Network → WebSockets: On
```

---

## 📈 预期收益

| 指标 | 配置前 | 配置后 | 改善 |
|------|--------|--------|------|
| 全球延迟 | 300ms | < 100ms | -66% |
| 带宽成本 | $8/月 | $3/月 | -62% |
| TTFB | 500ms | < 50ms | -90% |
| 安全性 | 基础 | DDoS 防护 | +100% |

---

## 📚 参考链接

- [Cloudflare 官方文档](https://developers.cloudflare.com/)
- [Next.js + Cloudflare 最佳实践](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Cloudflare IP 地址列表](https://www.cloudflare.com/ips/)

---

**文档维护者:** 🛡️ 系统管理员
**最后更新:** 2026-03-29
