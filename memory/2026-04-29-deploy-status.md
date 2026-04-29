# 7zi.com 生产环境部署状态报告

**检查时间:** 2026-04-29 16:44 GMT+2  
**服务器:** 165.99.43.61

---

## ✅ 服务状态: 在线

| 项目 | 状态 |
|------|------|
| PM2 进程 (7zi-main) | ✅ online |
| 进程 PID | 2457648 |
| 运行时间 | 3h |
| 重启次数 | 3 |
| 内存占用 | 70.7MB |
| CPU | 0% |
| 监听端口 | 3001 |

---

## ⚠️ HTTP 状态: 307 (Redirect)

访问 `https://7zi.com/` 返回 HTTP 307 (临时重定向)。这是 Cloudflare 或 Nginx 的重定向行为，需确认是否正常。

---

## 🚨 磁盘空间: 严重不足!

| 文件系统 | 大小 | 已用 | 可用 | 使用率 |
|----------|------|------|------|--------|
| /dev/vda1 | 88G | 85G | **2.7G** | **97%** |

**危险:** 磁盘使用率 97%，剩余空间仅 2.7GB。需要立即清理!

---

## 🔍 最新日志错误

### 错误类型:

1. **MISSING_MESSAGE** - `nav.theme (zh)`
   - `use-intl` 国际化消息缺失
   
2. **TypeError: Cannot read properties of undefined (reading 'siteName')**
   - 位置: `.next/server/chunks/ssr/_0f8sj06._.js`
   - digest: `1874758209`
   - 重复出现多次

### Next.js 版本: 16.2.4

---

## 📋 需要处理的问题 (优先级排序)

1. **[紧急] 磁盘清理** - 97%使用率，必须立即释放空间
2. **[高] 修复 siteName 错误** - `siteName` 未定义导致部分页面可能无法正常渲染
3. **[中] 修复国际化缺失** - `nav.theme (zh)` 翻译键缺失
4. **[低] 调查 307 重定向** - 确认 https://7zi.com/ 重定向行为是否预期

---

## 🔧 建议操作

```bash
# 1. 磁盘清理
pm2 flush                    # 清理 PM2 日志
journalctl --vacuum-time=7d  # 清理 7 天前日志
npm cache clean --force      # 清理 npm 缓存
rm -rf /tmp/*                # 清理临时文件

# 2. 检查 messages 文件
# 查找 messages.json/zh.json 确认 siteName 字段

# 3. 检查 7zi-main 重启原因
pm2 show 7zi-main
```
