#!/bin/bash
# ==========================================================================
# install-deps.sh —— 部署期依赖幂等安装
#
# 背景（2026-10-26 事故二）：
#   pnpm 只把 package.json 中【直接声明】的依赖提升到 node_modules/ 顶层，
#   间接依赖留在 node_modules/.pnpm/ 内。Next/Turbopack 构建按顶层解析，
#   因此任何「源码 import 了但 package.json 未声明」的包都会报
#   Can't resolve 'xxx'，构建必然失败。
#
#   旧的 hook 逻辑有两个致命问题：
#     1) 仅在 node_modules 整体缺失时才安装 —— 依赖新增/变更时不会安装；
#     2) 用 npm install --legacy-peer-deps —— 会重排 node_modules 结构，
#        摧毁 pnpm 的严格隔离，把间接依赖也平铺到顶层，问题被掩盖但
#        体积与解析行为不可控，且与 .pnpm 缓存不一致。
#
# 本脚本：
#   - 以 package.json 的 sha256 作为 stamp，判定是否需要安装；
#   - 统一使用 pnpm（仓库带 pnpm-lock.yaml），--no-frozen-lockfile 允许
#     lock 与 package.json 短暂不同步（本地开发机不提交 lock）；
#   - 安装后做【顶层可解析性校验】，把缺失清单直接打印出来，
#     避免"构建跑 10 分钟才发现少一个包"；
#   - 全程幂等，重复执行安全。
#
# 用法：bash install-deps.sh <项目目录>
# 退出码：0 = 依赖就绪；1 = 安装失败；2 = 校验失败（有包无法顶层解析）
# ==========================================================================
set -uo pipefail

PROJECT_DIR="${1:?用法: install-deps.sh <项目目录>}"
LOG="${INSTALL_DEPS_LOG:-/tmp/install-deps.log}"

cd "$PROJECT_DIR" || { echo "[deps] 项目目录不存在: $PROJECT_DIR" | tee -a "$LOG"; exit 1; }

STAMP_FILE="node_modules/.deps-stamp"
sha_of_pkg() {
  # 把 package.json 与 .npmrc 一起纳入 stamp：
  # .npmrc 决定 node-linker（isolated/hoisted），它一变就必须重装。
  if command -v sha256sum >/dev/null 2>&1; then
    { sha256sum package.json; [ -f .npmrc ] && sha256sum .npmrc; } | awk '{print $1}' | tr '\n' '-'
  else
    { shasum -a 256 package.json; [ -f .npmrc ] && shasum -a 256 .npmrc; } | awk '{print $1}' | tr '\n' '-'
  fi
}

# ---- 选包管理器：优先 pnpm（与仓库 lock 一致），否则退回 npm ----------
if [ -f pnpm-lock.yaml ] && command -v pnpm >/dev/null 2>&1; then
  PM=pnpm
elif command -v pnpm >/dev/null 2>&1 && [ ! -f package-lock.json ]; then
  PM=pnpm
elif command -v npm >/dev/null 2>&1; then
  PM=npm
else
  echo "[deps] 未找到 pnpm/npm，无法安装依赖" | tee -a "$LOG"
  exit 1
fi

# ---- pnpm 12 自愈：确保 pnpm-workspace.yaml 存在 -------------------------
# pnpm 12 起不再读 package.json 的 pnpm 字段；overrides 与 allowBuilds
# 必须放在 pnpm-workspace.yaml。若缺失（部署目录是旧提交解包产物），
# ERR_PNPM_IGNORED_BUILDS 会让 install 直接失败 —— 这里补齐。
if [ "$PM" = pnpm ]; then
  # linker 切换（isolated ↔ hoisted）时，pnpm 不会自动重排已有布局，
  # 必须清空 node_modules 重装，否则旧布局残留导致 Turbopack 解析失败。
  WANT_LINKER="hoisted"
  if [ -f .npmrc ] && grep -qE '^\s*node-linker\s*=\s*isolated' .npmrc; then
    WANT_LINKER="isolated"
  fi
  CUR_LINKER=""
  [ -f node_modules/.modules.yaml ] && CUR_LINKER="$(grep -m1 'nodeLinker:' node_modules/.modules.yaml 2>/dev/null | awk '{print $2}')"
  if [ -n "$CUR_LINKER" ] && [ "$CUR_LINKER" != "$WANT_LINKER" ]; then
    echo "[deps] node-linker 变更（$CUR_LINKER → $WANT_LINKER）—— 清空 node_modules 重装" | tee -a "$LOG"
    rm -rf node_modules
  fi

  if [ ! -f pnpm-workspace.yaml ]; then
    cat > pnpm-workspace.yaml << 'YAML'
overrides:
  brace-expansion@>=4.0.0 <5.0.5: '>=5.0.5'
  flatted@<=3.4.1: '>=3.4.2'
  serialize-javascript: '>=7.0.5'

allowBuilds:
  '@parcel/watcher': true
  '@sentry/cli': true
  '@swc/core': true
  better-sqlite3: true
  core-js: true
  msw: true
  sharp: true
  unrs-resolver: true
YAML
    echo "[deps] pnpm-workspace.yaml 缺失 —— 已自动补齐（overrides + allowBuilds）" | tee -a "$LOG"
  elif ! grep -q "allowBuilds" pnpm-workspace.yaml; then
    echo "[deps] pnpm-workspace.yaml 缺 allowBuilds —— 追加构建白名单" | tee -a "$LOG"
    cat >> pnpm-workspace.yaml << 'YAML'

allowBuilds:
  '@parcel/watcher': true
  '@sentry/cli': true
  '@swc/core': true
  better-sqlite3: true
  core-js: true
  msw: true
  sharp: true
  unrs-resolver: true
YAML
  fi
fi

# ---- 关键依赖清单：必须能在 node_modules 顶层解析 ----------------------
# 这些包历史上出过「只 import 未声明」的问题，纳入强制校验。
# postcss / postcss-load-config 虽未被源码直接 import，但 Turbopack 的
# postcss transform 会从项目根解析它们，缺失即构建失败。
CRITICAL_DEPS="tailwindcss clsx express js-yaml ws next react react-dom postcss postcss-load-config"

PKG_SHA="$(sha_of_pkg)"
OLD_SHA=""
[ -f "$STAMP_FILE" ] && OLD_SHA="$(cat "$STAMP_FILE")"

NEED_INSTALL=1
if [ -d node_modules ] && [ "$PKG_SHA" = "$OLD_SHA" ]; then
  NEED_INSTALL=0
fi

# 即使 stamp 命中，也做一次快速解析校验；缺任一关键包即重新安装。
missing_before=""
if [ "$NEED_INSTALL" -eq 0 ]; then
  for d in $CRITICAL_DEPS; do
    if ! /usr/bin/node -e "require.resolve('$d')" >/dev/null 2>&1; then
      missing_before="$missing_before $d"
    fi
  done
  [ -n "$missing_before" ] && NEED_INSTALL=1
fi

if [ "$NEED_INSTALL" -eq 0 ]; then
  echo "[deps] 依赖已就绪（stamp=${PKG_SHA:0:12}），跳过安装" | tee -a "$LOG"
  exit 0
fi

echo "[deps] 开始安装（pm=$PM, pkg sha=${PKG_SHA:0:12}）${missing_before:+，校验缺失:$missing_before}" | tee -a "$LOG"

if [ "$PM" = pnpm ]; then
  # --no-frozen-lockfile：本地开发机未提交 lock 时不阻塞部署
  pnpm install --no-frozen-lockfile --prefer-offline >>"$LOG" 2>&1
  RC=$?
  [ $RC -ne 0 ] && { echo "[deps] pnpm install 失败 (exit=$RC)，详见 $LOG" | tee -a "$LOG"; tail -25 "$LOG"; exit 1; }
else
  npm install --legacy-peer-deps >>"$LOG" 2>&1
  RC=$?
  [ $RC -ne 0 ] && { echo "[deps] npm install 失败 (exit=$RC)，详见 $LOG" | tee -a "$LOG"; tail -25 "$LOG"; exit 1; }
fi

# ---- 顶层可解析性校验 --------------------------------------------------
MISSING=""
for d in $CRITICAL_DEPS; do
  if ! /usr/bin/node -e "require.resolve('$d')" >/dev/null 2>&1; then
    MISSING="$MISSING $d"
  fi
done

if [ -n "$MISSING" ]; then
  echo "[deps] 校验失败：以下包无法在 node_modules 顶层解析：$MISSING" | tee -a "$LOG"
  echo "[deps] 修复方式：在 package.json 的 dependencies 中【直接声明】这些包" | tee -a "$LOG"
  exit 2
fi

mkdir -p node_modules
echo "$PKG_SHA" > "$STAMP_FILE"
echo "[deps] 安装完成，$CRITICAL_DEPS 全部可顶层解析" | tee -a "$LOG"
exit 0
