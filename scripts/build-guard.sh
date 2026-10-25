#!/usr/bin/env bash
# ============================================================
# 构建守卫（build guard）
#
# 背景（2026-10-26 生产事故）：
#   主仓 push 触发 post-receive → next build。实测三个问题：
#   ① 同一台机器上 deploy 与 prod 两条链路共用「同一部署目录 + 同一 build 锁 +
#      同一日志文件」，同时 push 必然自相残杀——一条报
#      "Another next build process is already running"，另一条成功但日志被覆盖，
#      最后无法判断到底哪个版本上线了。
#   ② 构建前不检查内存水位，next build 把 8G 机器的内存+swap 打满，
#      整机用户态饿死：sshd 不吐 banner、nginx 零字节响应，
#      但 TCP 端口仍可连、ping 正常 —— 极易误判成"网络故障"。
#   ③ 构建失败/被压死时没有留下可读的现场（dmesg OOM、free、top）。
#
# 本脚本提供三件套：
#   guard_precheck  构建前预检（内存/swap/磁盘/已有构建进程）
#   guard_lock      构建互斥锁（flock，防并发自伤）
#   guard_report    构建后现场报告（OOM 证据 / 内存 / 磁盘）
#
# 用法（典型 post-receive 集成）：
#   bash scripts/build-guard.sh precheck /root/7zi-project
#   bash scripts/build-guard.sh lock
#   bash scripts/build-guard.sh report
#
# 环境变量：
#   GUARD_MIN_AVAIL_MB   构建所需最小可用内存（默认 1200）
#   GUARD_MIN_FREE_DISK  构建所需最小可用磁盘百分比（默认 12）
#   GUARD_LOCK_FILE      互斥锁文件（默认 /tmp/szspd-next-build.lock）
#   GUARD_TIMEOUT        构建最长允许秒数（默认 1800，超时判失败不重启）
# ============================================================
set -uo pipefail

MIN_AVAIL_MB="${GUARD_MIN_AVAIL_MB:-1200}"
MIN_FREE_DISK="${GUARD_MIN_FREE_DISK:-12}"
LOCK_FILE="${GUARD_LOCK_FILE:-/tmp/szspd-next-build.lock}"
TIMEOUT="${GUARD_TIMEOUT:-1800}"
REPORT_FILE="${GUARD_REPORT_FILE:-/tmp/szspd-build-guard-report.log}"

# ---------- 通用小工具 ----------
# 注意：/proc/meminfo 在 Linux 上单位是 kB；Git Bash(MSYS) 上不存在，
# 因此这里用 awk 显式匹配并做空值兜底，绝不让空值流入整数比较。
mem_avail_mb() { awk '/^MemAvailable:/ {printf "%d", $2/1024; found=1} END {if (!found) print 0}' /proc/meminfo 2>/dev/null || echo 0; }
mem_total_mb() { awk '/^MemTotal:/ {printf "%d", $2/1024; found=1} END {if (!found) print 0}' /proc/meminfo 2>/dev/null || echo 0; }
swap_used_mb() { awk '/^SwapTotal:/ {t=$2} /^SwapFree:/ {f=$2} END {printf "%d", (t-f)/1024}' /proc/meminfo 2>/dev/null || echo 0; }
swap_total_mb() { awk '/^SwapTotal:/ {printf "%d", $2/1024; found=1} END {if (!found) print 0}' /proc/meminfo 2>/dev/null || echo 0; }

# 磁盘可用百分比：目录不存在时返回 -1（表示"无法判断"，不参与阈值判定）
disk_free_pct() {
  local d="$1"
  [ -d "$d" ] || { echo -1; return; }
  df -P "$d" 2>/dev/null | awk 'NR==2 {gsub("%","",$5); v=100-$5; if (v<0) v=0; printf "%d", v}' || echo -1
}

build_running() { pgrep -f "next/dist/bin/next build" >/dev/null 2>&1 && echo yes || echo no; }

# 数值守卫：把任何非数字/负数规整为安全值，避免 [: : integer expected
num_or() { case "$1" in ''|*[!0-9]*) echo "$2" ;; *) echo "$1" ;; esac; }

# ---------- 1. 构建前预检 ----------
do_precheck() {
  local dir="${1:-/root/7zi-project}"
  local avail total sw_used sw_total dfree busy
  avail=$(num_or "$(mem_avail_mb)" 0)
  total=$(num_or "$(mem_total_mb)" 0)
  sw_used=$(num_or "$(swap_used_mb)" 0)
  sw_total=$(num_or "$(swap_total_mb)" 0)
  dfree=$(disk_free_pct "$dir")
  busy=$(build_running)

  echo "== 构建预检 =="
  echo "内存: 可用 ${avail}MB / 总量 ${total}MB（阈值 ${MIN_AVAIL_MB}MB）"
  echo "swap: 已用 ${sw_used}MB / 总量 ${sw_total}MB"
  if [ "$dfree" -ge 0 ]; then
    echo "磁盘: ${dir} 可用 ${dfree}%（阈值 ${MIN_FREE_DISK}%）"
  else
    echo "磁盘: ${dir} 不存在或无法判断 —— 跳过磁盘阈值判定"
  fi
  echo "已有构建进程: ${busy}"

  local rc=0
  if [ "$busy" = "yes" ]; then
    echo "✗ 已有 next build 在跑 —— 拒绝并发构建（这是 10-26 自相残杀的直接原因）"
    rc=1
  fi
  if [ "$avail" -lt "$MIN_AVAIL_MB" ]; then
    echo "✗ 可用内存不足 ${MIN_AVAIL_MB}MB —— 拒绝构建"
    echo "  提示：next build 打满内存会让整机用户态饿死（sshd/nginx 无响应但端口可连）"
    echo "  处理：先回收（停构建/清 swap/停闲置进程），或调高 GUARD_MIN_AVAIL_MB 前先确认真有足够物理内存"
    rc=1
  fi
  if [ "$dfree" -ge 0 ] && [ "$dfree" -lt "$MIN_FREE_DISK" ]; then
    echo "✗ 磁盘可用不足 ${MIN_FREE_DISK}% —— 拒绝构建"
    rc=1
  fi
  if [ "$rc" -eq 0 ]; then
    echo "✔ 预检通过"
  else
    echo "✗ 预检未通过 —— 本次不构建、不重启，旧版保持运行"
  fi
  return $rc
}

# ---------- 2. 构建互斥锁 ----------
do_lock() {
  mkdir -p "$(dirname "$LOCK_FILE")"
  # flock 非阻塞：拿不到锁说明另一个构建在跑，直接退出码 2（表示"跳过"而非"失败"）
  # flock 在精简镜像里可能缺失，退化为 mkdir 原子锁（同样互斥，且跨 flock 可用）
  if command -v flock >/dev/null 2>&1; then
    exec 9>"$LOCK_FILE"
    if ! flock -n 9; then
      echo "✗ 已有构建持有锁 $LOCK_FILE —— 跳过本次构建"
      return 2
    fi
    echo "✔ 已获取构建锁 $LOCK_FILE (pid=$$, flock)"
    echo $$ > "$LOCK_FILE.pid" 2>/dev/null || true
    return 0
  fi
  local d="${LOCK_FILE}.d"
  if ! mkdir "$d" 2>/dev/null; then
    echo "✗ 已有构建持有锁 $d —— 跳过本次构建"
    return 2
  fi
  echo "✔ 已获取构建锁 $d (pid=$$, mkdir)"
  echo $$ > "$d/pid" 2>/dev/null || true
  # 退出时释放锁目录。注意：trap 里的变量必须在 trap 触发时仍可见，
  # local 变量在函数返回后即销毁，因此这里必须用全局变量 GUARD_LOCK_DIR。
  # 用 rm -rf 而非 rmdir：锁目录内含 pid 文件，rmdir 对非空目录会失败。
  GUARD_LOCK_DIR="$d"
  trap 'rm -rf "${GUARD_LOCK_DIR:-}" 2>/dev/null || true' EXIT INT TERM
  return 0
}

# ---------- 3. 构建后现场报告 ----------
do_report() {
  {
    echo "===== 构建守卫现场报告 [$(date '+%F %T')] ====="
    echo "--- 负载 ---"; uptime
    echo "--- 内存 ---"; free -m
    echo "--- OOM 证据（dmesg 末 40 行内检索） ---"
    dmesg 2>/dev/null | tail -40 | grep -iE "out of memory|oom-kill|killed process" || echo "（无 OOM 记录）"
    echo "--- 磁盘 ---"; df -h "${1:-/root/7zi-project}"
    echo "--- 构建产物时间戳 ---"
    stat -c '%y %n' "${1:-/root/7zi-project}/.next/BUILD_ID" 2>/dev/null || echo "（无 BUILD_ID）"
    echo "===== 报告结束 ====="
  } >> "$REPORT_FILE" 2>&1
  echo "✔ 现场报告已追加：$REPORT_FILE"
}

case "${1:-}" in
  precheck) do_precheck "${2:-}" ;;
  lock)     do_lock ;;
  report)   do_report "${2:-}" ;;
  *)
    echo "用法：bash $0 {precheck [dir]|lock|report [dir]}"
    exit 2
    ;;
esac
