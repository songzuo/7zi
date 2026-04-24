# DNS 配置报告 - 7zi.com

**生成日期:** 2026-04-23  
**域名:** 7zi.com  
**DNS 提供商:** Cloudflare (ns.cloudflare.com)  
**状态:** ✅ 已配置并生效

---

## 📋 当前 DNS 记录

### 1. A 记录

| 主机名 | 记录类型 | 值 | TTL |
|--------|----------|-----|-----|
| 7zi.com | A | 172.67.184.212 | 300 |
| 7zi.com | A | 104.21.59.229 | 300 |
| www.7zi.com | A | 172.67.184.212 | 300 |
| www.7zi.com | A | 104.21.59.229 | 300 |

### 2. AAAA 记录 (IPv6)

| 主机名 | 记录类型 | 值 |
|--------|----------|-----|
| 7zi.com | AAAA | 2606:4700:3036::ac43:b8d4 |
| 7zi.com | AAAA | 2606:4700:3037::6815:3be5 |
| www.7zi.com | AAAA | 2606:4700:3036::ac43:b8d4 |
| www.7zi.com | AAAA | 2606:4700:3037::6815:3be5 |

### 3. CNAME 记录

| 主机名 | 记录类型 | 值 |
|--------|----------|-----|
| api.7zi.com | CNAME | 与主域名相同 (通过 Cloudflare 代理) |

### 4. MX 记录

| 主机名 | 优先级 | 值 |
|--------|--------|-----|
| 7zi.com | 10 | mail.7zi.com |

### 5. TXT 记录

| 主机名 | 值 | 用途 |
|--------|-----|------|
| 7zi.com | `v=spf1 a mx ip4:165.99.43.61 ip4:61.136.165.160 ip4:109.123.246.140 -all` | SPF (邮件发件验证) |
| _dmarc.7zi.com | `v=DMARC1; p=quarantine; fo=1; ruf=mailto:dmarc@qiye.163.com; rua=mailto:dmarc_report@qiye.163.com` | DMARC |

### 6. 邮件服务专用记录

| 主机名 | 记录类型 | 值 |
|--------|----------|-----|
| mail.7zi.com | A | 109.123.246.140 |

---

## 🔍 DNS 提供商信息

- **NS 服务器:**
  - `miki.ns.cloudflare.com`
  - `chip.ns.cloudflare.com`
- **类型:** Cloudflare (CDN + DNS + SSL)
- **代理状态:** 启用 (橙色云朵图标)

---

## 📊 DNS 传播状态

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 7zi.com 解析 | ✅ 正常 | 返回 2 个 Cloudflare IP |
| www.7zi.com 解析 | ✅ 正常 | 返回与主域名相同 IP |
| api.7zi.com 解析 | ✅ 正常 | 通过 Cloudflare 代理 |
| MX 记录 | ✅ 正常 | 指向 mail.7zi.com |
| SPF 记录 | ✅ 正常 | 允许指定 IP 发邮件 |
| DMARC 记录 | ✅ 正常 |  quarantine 模式 |
| IPv6 解析 | ✅ 正常 | 双栈支持 |

---

## ⚠️ 重要发现

### 1. DNS 提供商是 Cloudflare，不是 AWS Route53

当前配置使用 **Cloudflare** 作为 DNS 提供商，并非 AWS Route53。

### 2. 目标环境需要确认

任务描述提到的 "ELB/ALB" 配置暗示期望使用 AWS 负载均衡器。但当前：
- 实际通过 Cloudflare CDN 分发
- 直接部署到 `165.99.43.61` (从 SPF 记录可见)

### 3. api.7zi.com 当前配置

api 子域名当前与主域名共用相同的 Cloudflare IP，未单独配置 CNAME 指向 ALB endpoint。

---

## 🔧 如果需要迁移到 AWS Route53

如果确定要使用 AWS Route53 + ELB/ALB，需要：

### 步骤 1: 创建 Route53 托管区域
```bash
aws route53 create-hosted-zone --name 7zi.com --caller-reference $(date +%s)
```

### 步骤 2: 获取 ELB/ALB 的 CNAME
```bash
aws elbv2 describe-load-balancers --names your-alb-name
```

### 步骤 3: 创建 DNS 记录
```bash
# A 记录指向 ALB (使用 alias)
aws route53 change-resource-record-sets --hosted-zone-id Z123456 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "7zi.com",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "your-alb-123456.elb.amazonaws.com",
          "HostedZoneId": "ELB_HOSTED_ZONE_ID",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

### 步骤 4: 将 NS 记录切换到 Route53

在域名注册商处更新 nameservers 为 Route53 提供的 4 个 NS。

---

## 📝 变更记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-04-23 | DNS 现状检查 | 确认使用 Cloudflare，当前配置正常 |

---

## ✅ 结论

**当前 DNS 配置通过 Cloudflare 已正确设置，生产环境可用。**

如果项目需要切换到 AWS Route53 + ELB/ALB 架构，需要：
1. 在 AWS 创建 ELB/ALB
2. 创建 Route53 托管区域
3. 导入现有 DNS 记录
4. 修改域名注册商的 NS 记录

**当前状态:** 生产就绪，无需修改。 🚀
