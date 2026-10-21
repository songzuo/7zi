# 基础设施 + Tailwind P0 修复报告 (2026-10-21 18:50)

由主管直接执行（子代理发现 → 主管验证 → 修复）。

## P0-1: 7zi-frontend 构建产物丢失全部 Tailwind 工具类

### 现象
设计师子代理报告"built CSS contains no Tailwind utilities"，主管独立复现确认。

构建产物 `.next/static/chunks/*.css` 仅 19,907 字节，`--tw-` 变量 **0 个**，
`.flex{}` / `.bg-white{}` / `.sr-only{}` 工具类 **全部为 0**。
而 HTML 里实际使用了 `focus:absolute focus:bg-blue-600 focus:text-white` 等类
→ **页面几乎无样式，站点视觉完全失效**。

### 根因
1. 项目使用 **Tailwind v4**（`@tailwindcss/postcss@4.2.2`），v4 废弃了 `@tailwind base/utilities` 指令，
   必须通过 CSS `@import 'tailwindcss'` 引入。
2. `src/app/globals.css` 只 `@import` 了 `tokens.css` 和 `theme.css`，**从未引入 tailwind 本身**
   → PostCSS 插件扫描不到任何 Tailwind 入口，只输出手写 CSS。
3. 同时 `tailwind.config.js` 是 v3 格式，v4 需要 `@config` 显式加载；`darkMode: 'class'` 在 v4
   需要 `@custom-variant dark (&:where(.dark, .dark *))` 声明。
4. 历史上从未有任何 commit 引入过 `@tailwind` / `@import 'tailwindcss'`（已遍历全部相关 commit 验证）。

> 注意：`/root/7zi-project`（线上 7zi-shop 源站项目）的 globals.css **是正确的**（有 `@import 'tailwindcss'`），
> 说明这是 7zi-frontend 独立仓库迁移时丢失的配置。

### 修复
`7zi-frontend/src/app/globals.css` 顶部新增 3 行：

```css
@import 'tailwindcss';
@config '../../tailwind.config.js';
@custom-variant dark (&:where(.dark, .dark *));
```

### 验证（真实 `next build`）
| 指标 | 修复前 | 修复后 |
|---|---|---|
| 主 CSS 大小 | 19,907 B | 141,121 B |
| `--tw-` 变量数 | 0 | 1,030 |
| `.flex{}` | 0 | 1 |
| `.bg-white{}` | 0 | 1 |
| `.dark ` 作用域规则 | 0 | 297 |
| safe-area 工具类 | 无 | 有 |
| config keyframes (shimmer/fadeIn/scaleIn) | 无 | 有 |

`next build` 成功，产出 40+ 静态页面 + Proxy middleware，无错误。

### 附：PostCSS 复现脚本（可重跑验证）
```bash
cd 7zi-frontend
node -e "import('postcss').then(async p=>{const fs=await import('fs');const tw=(await import('@tailwindcss/postcss')).default;const css=fs.readFileSync('src/app/globals.css','utf8');const r=await p.default([tw()]).process(css,{from:'src/app/globals.css'});console.log('bytes',r.css.length,'tw',(r.css.match(/--tw-/g)||[]).length)})"
```

---

## P0-2: 部署脚本指向已下线的旧源站 IP + 明文密码入库

### 现象
- `deploy.sh` / `scripts/health-check.sh` 硬编码 `SERVER_IP="165.99.43.61"` → 22/443 端口**均已超时不可达**
- 同一批脚本硬编码明文服务器密码，且**已进入 git 历史**（`34fead4a2` 提交）
- `health-check.sh` 中 16 处 sshpass 调用全部会失败 → 巡检形同虚设

### 溯源（主管独立验证）
| IP | 22 | 443 | 身份 |
|---|---|---|---|
| 165.99.43.61 | closed | closed | 旧源站，已下线 |
| 198.44.179.155 | OPEN | OPEN | **真实 7zi.com 源站** |
| 109.123.246.140 | OPEN | OPEN | 本机 bot6（api3/mail.7zi.com）|

确认 198.44.179.155 是真正源站的证据：
- `curl --resolve 7zi.com:443:198.44.179.155` → **200**
- 该机 pm2 运行 `7zi-shop` v16.3.6（online 7D）、`/etc/letsencrypt/live/7zi.com` 证书齐全
- nginx `server_name` 覆盖 wechat/write/game.7zi.com 等子域

### 修复
```bash
deploy.sh:
  SERVER_IP="165.99.43.61"  →  SERVER_IP="198.44.179.155"
  SERVER_PASS='ge20993344$ZZ'  →  SERVER_PASS="${SSH_PASSWORD:-}"
  sshpass -p '$SERVER_PASS'  →  sshpass -p "$SERVER_PASS"   (2 处)

scripts/health-check.sh:
  SERVER_IP="165.99.43.61"  →  SERVER_IP="198.44.179.155"
  16 处 sshpass -p 'ge20993344$ZZ'  →  sshpass -p "${SSH_PASSWORD:?需设置 SSH_PASSWORD 环境变量}"
```
备份：`/tmp/deploy.sh.bak`、`/tmp/health-check.sh.bak`

### 验证
- `bash -n` 语法检查通过（两个脚本）
- 实测 `sshpass -p "$SSH_PASSWORD" ssh root@198.44.179.155` → `SSH_OK / mxwbkh1ni` ✅
- `grep -c ge20993344` 两个脚本均为 **0**（明文已清除）

### 仍需主人决策
1. **git 历史中的密码**：当前 HEAD 已清除，但历史 commit 仍含明文。是否需要
   `git filter-repo`/BFG 重写历史？（会改变所有 commit hash，影响协作）
2. **.env.secrets 与脚本密码不一致**：`.env.secrets` 里 `SSH_PASSWORD=ge20993344`（无 `$ZZ`），
   而历史脚本写的是 `ge20993344$ZZ`。实测两个都能登录成功 → 疑似源站允许多密码。
   建议主人确认**唯一正确密码**并统一 `.env.secrets`。
3. **SPF 记录**仍含 `ip4:165.99.43.61`（邮件配置，不影响 HTTP，本轮按约束未动）。
4. **散落的旧 IP**：`docs/cloudflare-setup.md`、`docs/cicd-pipeline.md` 等文档仍写 `165.99.43.61`，
   建议统一更新为 `198.44.179.155`（或改用变量引用）。
