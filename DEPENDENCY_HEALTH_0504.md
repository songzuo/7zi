# Dependency Health Report — 2026-05-04

## 状态概览

| 项目 | 状态 |
|------|------|
| node_modules | ✅ 正常 (930 packages, 2.6GB) |
| 安全漏洞 | ❌ 14 个漏洞 (3低、4中、7高) |

## 高危漏洞 (需优先处理)

1. **redis 2.6.0-3.1.0** (High) — 通过 `bull` 依赖引入，指数级正则 DoS 风险
   - 修复：升级到 bull 4.16.5+，但属破坏性变更
2. **serialize-javascript ≤7.0.4** (High) — RCE + DoS 漏洞，通过 workbox-webpack-plugin 链式依赖
3. **tmp ≤0.2.3** (High) — 符号链接目录遍历，可任意写入临时文件

## 中危漏洞

4. **next** — 被 @sentry/nextjs、@ducanh2912/next-pwa、next-intl 依赖，多个已知问题
5. **workbox-webpack-plugin** — 依赖链最终指向 serialize-javascript

## 修复建议

```bash
# 安全修复（破坏性）
npm audit fix --force

# 非破坏性修复（部分）
npm audit fix
```

⚠️ 强制修复会升级：bull→4.16.5, @ducanh2912/next-pwa→8.7.1  
建议在测试环境验证后再上生产。

## 结论

生产环境存在 7 个高危漏洞，需尽快修复。依赖树较深（bull→redis），建议优先升级 bull 并锁定版本。