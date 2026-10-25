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
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum package.json | awk '{print $1}'
  else
    shasum -a 256 package.json | awk '{print $1}'
  fi
}

# ---- 选包管理器：优先 pnpm（与仓库 lock 一致），否则退回 npm ----------
if [ -f pnpm-lock.yaml ] || command -v pnpm >/dev/null 2>&1; then
  PM=pnpm
elif command -v npm >/dev/null 2>&1; then
  PM=npm
else
  echo "[deps] 未找到 pnpm/npm，无法安装依赖" | tee -a "$LOG"
  exit 1
fi

# ---- 关键依赖清单：必须能在 node_modules 顶层解析 ----------------------
# 这些包历史上出过「只 import 未声明」的问题，纳入强制校验。
CRITICAL_DEPS="tailwindcss clsx express js-yaml ws next react react-dom"

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
