# 缓存配置说明

## Next.js 静态导出 (output: 'export') 缓存配置

由于使用了静态导出 (`output: 'export'`)，Next.js 的 headers 配置**不会自动生效**。
需要在 CDN 或服务器层面配置缓存。

## 推荐缓存策略

### 1. 静态资源 (CSS, JS, Fonts)
```
Cache-Control: public, max-age=31536000, immutable
```
- 有效期：1年
- 适用于带 hash 的文件

### 2. 图片资源
```
Cache-Control: public, max-age=31536000, immutable
```
- 有效期：1年
- Next.js 生成的优化图片会自动添加 hash

### 3. HTML 文件
```
Cache-Control: public, max-age=0, must-revalidate
```
- 不缓存，验证后使用
- 或使用较短的缓存时间

### 4. 页面跳转
```
Cache-Control: no-cache, no-store, must-revalidate
```

## Nginx 配置示例

```nginx
# 静态资源 - 1年缓存
location ~* \.(js|css|png|jpg|jpeg|webp|avif|svg|ico|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML - 不缓存
location ~* \.html$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# Next.js 静态文件
location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Vercel 部署

Vercel 会自动应用最佳缓存策略，无需额外配置。

## Cloudflare 配置

1. 登录 Cloudflare
2. 进入 Caching > Configuration
3. 设置 Browser Cache TTL 为 1 year
4. 为静态资源创建 Page Rules
