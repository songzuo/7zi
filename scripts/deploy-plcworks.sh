#!/usr/bin/env bash
# ============================================================
# 主仓一键部署 plcworks（六期：同步到主仓库后的统一入口）
#
# 背景：plcworks（代码审译工场 / 设备上云工场后端）是主站的配套服务，
#       代码单独成仓 root@198.44.179.155:/root/plcworks.git，
#       线上部署目录 /opt/plcworks 是 git 工作副本。
#
# 本脚本在主仓（szspd-src）里作为「统一部署入口」存在：
#   主仓 push → 服务器 hook 部署主站 → 本脚本顺带把 plcworks 拉到最新并重启
#   （plcworks 自身也可用 bash deploy/deploy-git.sh 单独部署）
#
# 用法：
#   bash scripts/deploy-plcworks.sh
#   bash scripts/deploy-plcworks.sh --check
#
# 环境变量：
#   PLCWORKS_HOST   默认 root@198.44.179.155
#   PLCWORKS_DIR    默认 /opt/plcworks
#   PLCWORKS_BRANCH 默认 master
# ============================================================
set -euo pipefail

HOST="${PLCWORKS_HOST:-root@198.44.179.155}"
DIR="${PLCWORKS_DIR:-/opt/plcworks}"
BRANCH="${PLCWORKS_BRANCH:-master}"
MODE="deploy"

for a in "$@"; do
  case "$a" in
    --check) MODE="check" ;;
    *) echo "未知参数：$a"; exit 1 ;;
  esac
done

SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new)
[ -f "$HOME/.ssh/id_rsa_7zi" ] && SSH_OPTS=(-i "$HOME/.ssh/id_rsa_7zi" "${SSH_OPTS[@]}")

remote() { ssh "${SSH_OPTS[@]}" "$HOST" "$@"; }

echo "== plcworks 部署目标：$HOST:$DIR（分支 $BRANCH）"

if [ "$MODE" = "check" ]; then
  remote "cd $DIR && git log --oneline -3 && git status --short | head -10 && systemctl is-active plcworks"
  exit 0
fi

remote "set -e
  cd $DIR
  git fetch origin $BRANCH
  git checkout $BRANCH
  git reset --hard origin/$BRANCH
  git log --oneline -1
  bash deploy/sync-site-pages.sh
  python3 deploy/nav_sync.py --mode apply --root /var/www/a.7zi.com || true
  systemctl restart plcworks"

# 等服务就绪再报结果（多 worker 启动约 3~5 秒）
OK=""
for i in $(seq 1 20); do
  OK=$(remote "curl -fsS --max-time 5 http://127.0.0.1:8809/api/plc/health 2>/dev/null || echo ''" || true)
  [ -n "$OK" ] && break
  sleep 2
done

if [ -z "$OK" ]; then
  echo "⚠️  plcworks 健康检查未通过"
  remote "journalctl -u plcworks -n 40 --no-pager" || true
  exit 1
fi

echo "✅ plcworks 部署完成并通过健康检查"
remote "cd $DIR && git log --oneline -1"
