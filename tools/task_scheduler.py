#!/usr/bin/env python3
"""
task_scheduler.py - 集群主管多任务调度器 v1
支持：多任务并行、挂起/恢复、优先级、来源追踪、自主思考循环

状态文件: /root/.openclaw/workspace/state/tasks.json
"""

import json, sys, os, time
from datetime import datetime, timezone

STATE_DIR = "/root/.openclaw/workspace/state"
TASKS_FILE = os.path.join(STATE_DIR, "tasks.json")
os.makedirs(STATE_DIR, exist_ok=True)

def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def ts():
    return int(time.time())

# === 数据层 ===

def load():
    if os.path.exists(TASKS_FILE):
        with open(TASKS_FILE) as f:
            return json.load(f)
    return {
        "version": 1,
        "tasks": {},        # id -> task
        "queue": [],         # 按优先级排序的task id列表
        "completed": [],     # 最近完成的task id
        "stats": {"created": 0, "completed": 0, "interrupted": 0},
        "last_updated": None
    }

def save(data):
    data["last_updated"] = now()
    with open(TASKS_FILE, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def new_task(tid, desc, source="manual", priority=5, tags=None,
             steps=None, resume_instructions="", blocked_reason=""):
    return {
        "id": tid,
        "description": desc,
        "source": source,       # webchat/ddingtalk/cron/tui/subagent/self
        "priority": priority,   # 1=最高 10=最低
        "tags": tags or [],
        "status": "queued",     # queued/running/suspended/blocked/completed/failed
        "created_at": now(),
        "updated_at": now(),
        "started_at": None,
        "completed_at": None,
        "steps": steps or [],
        "progress_log": [],
        "resume_instructions": resume_instructions,
        "blocked_reason": blocked_reason,
        "context": {},
        "result": ""
    }

# === 命令层 ===

def cmd_add(args):
    """添加任务: add <id> <desc> [--source s] [--priority n] [--tags t1,t2]"""
    if len(args) < 2:
        print("用法: add <id> <description> [--source s] [--priority n] [--tags t1,t2]")
        return
    tid, desc = args[0], args[1]
    source, priority, tags = "manual", 5, []
    i = 2
    while i < len(args):
        if args[i] == "--source" and i+1 < len(args):
            source = args[i+1]; i += 2
        elif args[i] == "--priority" and i+1 < len(args):
            priority = int(args[i+1]); i += 2
        elif args[i] == "--tags" and i+1 < len(args):
            tags = args[i+1].split(","); i += 2
        else:
            i += 1
    data = load()
    if tid in data["tasks"]:
        print(f"❌ 任务已存在: {tid}"); return
    task = new_task(tid, desc, source, priority, tags)
    data["tasks"][tid] = task
    data["queue"].append(tid)
    _sort_queue(data)
    data["stats"]["created"] += 1
    save(data)
    print(f"✅ 任务已添加: {tid} (优先级{priority}, 来源{source})")

def cmd_start(args):
    """开始执行任务: start <id>"""
    if not args:
        print("用法: start <id>"); return
    tid = args[0]
    data = load()
    task = data["tasks"].get(tid)
    if not task:
        print(f"❌ 任务不存在: {tid}"); return
    task["status"] = "running"
    task["started_at"] = task.get("started_at") or now()
    task["updated_at"] = now()
    save(data)
    print(f"🔄 任务开始: {tid}")

def cmd_suspend(args):
    """挂起任务: suspend <id> [reason]"""
    if not args:
        print("用法: suspend <id> [reason]"); return
    tid = args[0]
    reason = args[1] if len(args) > 1 else "手动挂起"
    data = load()
    task = data["tasks"].get(tid)
    if not task:
        print(f"❌ 任务不存在: {tid}"); return
    task["status"] = "suspended"
    task["blocked_reason"] = reason
    task["updated_at"] = now()
    task["progress_log"].append({"time": now(), "msg": f"挂起: {reason}"})
    save(data)
    print(f"⏸️ 任务挂起: {tid} - {reason}")

def cmd_block(args):
    """标记任务被阻塞: block <id> <reason>"""
    if len(args) < 2:
        print("用法: block <id> <reason>"); return
    tid, reason = args[0], args[1]
    data = load()
    task = data["tasks"].get(tid)
    if not task:
        print(f"❌ 任务不存在: {tid}"); return
    task["status"] = "blocked"
    task["blocked_reason"] = reason
    task["updated_at"] = now()
    task["progress_log"].append({"time": now(), "msg": f"阻塞: {reason}"})
    save(data)
    print(f"🚫 任务阻塞: {tid} - {reason}")

def cmd_resume(args):
    """恢复挂起/阻塞的任务: resume <id>"""
    if not args:
        print("用法: resume <id>"); return
    tid = args[0]
    data = load()
    task = data["tasks"].get(tid)
    if not task:
        print(f"❌ 任务不存在: {tid}"); return
    task["status"] = "queued"
    task["blocked_reason"] = ""
    task["updated_at"] = now()
    task["progress_log"].append({"time": now(), "msg": "恢复到队列"})
    if tid not in data["queue"]:
        data["queue"].append(tid)
        _sort_queue(data)
    save(data)
    print(f"▶️ 任务恢复: {tid}")

def cmd_step(args):
    """更新任务步骤: step <id> <step_name> <status>"""
    if len(args) < 3:
        print("用法: step <id> <step_name> <done|running|pending|skipped>"); return
    tid, step_name, status = args[0], args[1], args[2]
    data = load()
    task = data["tasks"].get(tid)
    if not task:
        print(f"❌ 任务不存在: {tid}"); return
    found = False
    for s in task["steps"]:
        if s["name"] == step_name:
            s["status"] = status
            s["updated_at"] = now()
            found = True; break
    if not found:
        task["steps"].append({"name": step_name, "status": status, "updated_at": now()})
    task["updated_at"] = now()
    save(data)
    print(f"✅ {tid}/{step_name} → {status}")

def cmd_resume_info(args):
    """写入恢复指令: resume-info <id> <instructions>"""
    if len(args) < 2:
        print("用法: resume-info <id> <instructions>"); return
    tid, instructions = args[0], args[1]
    data = load()
    task = data["tasks"].get(tid)
    if not task:
        print(f"❌ 任务不存在: {tid}"); return
    task["resume_instructions"] = instructions
    task["updated_at"] = now()
    save(data)
    print(f"📋 恢复指令已更新: {tid}")

def cmd_complete(args):
    """完成任务: complete <id> [summary]"""
    if not args:
        print("用法: complete <id> [summary]"); return
    tid = args[0]
    summary = args[1] if len(args) > 1 else ""
    data = load()
    task = data["tasks"].get(tid)
    if not task:
        print(f"❌ 任务不存在: {tid}"); return
    task["status"] = "completed"
    task["completed_at"] = now()
    task["result"] = summary
    task["resume_instructions"] = ""
    if tid in data["queue"]:
        data["queue"].remove(tid)
    data["completed"].append(tid)
    data["completed"] = data["completed"][-100:]
    data["stats"]["completed"] += 1
    save(data)
    print(f"✅ 任务完成: {tid}")

def cmd_next(args):
    """智能调度：返回下一个应该执行的任务
    优先级规则：
    1. 正在运行但被中断的任务（有resume_instructions）
    2. 队列中优先级最高且有resume_instructions的任务（如果队列存在）
    3. 队列中优先级最高的任务（如果队列存在）
    4. 挂起的任务（如果阻塞条件可能已解除）
    输出JSON供心跳/子agent使用
    """
    data = load()
    
    # 确保必要字段存在
    if "tasks" not in data:
        data["tasks"] = {}
    if "queue" not in data:
        data["queue"] = []
    tasks = data["tasks"]
    
    # 1. 找被中断的running任务
    interrupted = [t for t in tasks.values()
                   if t["status"] == "running" and t.get("resume_instructions")]
    if interrupted:
        t = sorted(interrupted, key=lambda x: x["priority"])[0]
        print(f"NEXT:resume")
        print(json.dumps(t, ensure_ascii=False))
        return
    
    # 2. 队列中有恢复指令的任务
    if "queue" in data and data["queue"]:
        for tid in data["queue"]:
            t = tasks.get(tid)
            if t and t["status"] == "queued" and t.get("resume_instructions"):
                print(f"NEXT:queued_with_instructions")
                print(json.dumps(t, ensure_ascii=False))
                return
    
    # 3. 队列中优先级最高的任务
    if "queue" in data and data["queue"]:
        for tid in data["queue"]:
            t = tasks.get(tid)
            if t and t["status"] == "queued":
                print(f"NEXT:queued")
                print(json.dumps(t, ensure_ascii=False))
                return
    
    # 4. 挂起的任务（可能阻塞已解除）
    for t in sorted(tasks.values(), key=lambda x: x["priority"]):
        if t["status"] in ("suspended", "blocked"):
            print(f"NEXT:retry")
            print(json.dumps(t, ensure_ascii=False))
            return
    
    print("NEXT:none")

def cmd_dashboard(args):
    """全局任务看板"""
    data = load()
    
    # 确保统计字段存在
    if "stats" not in data:
        data["stats"] = {"created": 0, "completed": 0, "interrupted": 0}
    if "queue" not in data:
        data["queue"] = []
    
    tasks = data["tasks"]
    by_status = {}
    for t in tasks.values():
        by_status.setdefault(t["status"], []).append(t)
    
    # 计算统计数据（如果需要）
    completed_count = len([t for t in tasks.values() if t["status"] == "completed"])
    interrupted_count = len([t for t in tasks.values() if t["status"] in ("suspended", "blocked")])
    
    print("═══ 集群主管任务看板 ═══")
    print(f"总计: {len(tasks)} | 完成: {completed_count} | 中断: {interrupted_count}")
    print()
    
    icons = {"running":"🔄","queued":"📋","suspended":"⏸️",
             "blocked":"🚫","completed":"✅","failed":"❌"}
    order = ["running","queued","suspended","blocked","completed","failed"]
    
    for status in order:
        group = by_status.get(status, [])
        if not group:
            continue
        icon = icons.get(status, "❓")
        print(f"{icon} {status.upper()} ({len(group)})")
        show = group if status != "completed" else group[-3:]
        for t in sorted(show, key=lambda x: x["priority"]):
            pri = f"P{t['priority']}" 
            # 确保 source 字段存在
            src = t.get("source", "unknown")[:8]
            desc = t["description"][:50]
            print(f"  [{pri}][{src}] {t['id']}: {desc}")
            if t.get("resume_instructions") and status != "completed":
                ri = t["resume_instructions"][:80]
                print(f"       📋 恢复: {ri}")
            if t.get("blocked_reason") and status in ("suspended","blocked"):
                print(f"       🚫 原因: {t['blocked_reason'][:60]}")
        print()

def cmd_recover(args):
    """检测需要恢复的任务 - 心跳调用
    情况1: running状态但超过30分钟未更新 → 被动中断
    情况2: blocked/suspended状态但有resume_instructions → 阻塞解除
    情况3: queued状态但有resume_instructions → 需要执行
    输出JSON供恢复使用
    """
    STALE_SECONDS = 1800  # 30分钟
    data = load()
    tasks = data["tasks"]
    candidates = []
    
    # 情况1: running任务被动中断
    for t in tasks.values():
        if t["status"] != "running":
            continue
        updated = t.get("updated_at")
        if not updated:
            continue
        try:
            ut = datetime.strptime(updated, "%Y-%m-%dT%H:%M:%SZ")
            ut = ut.replace(tzinfo=timezone.utc)
            age = (datetime.now(timezone.utc) - ut).total_seconds()
            if age > STALE_SECONDS:
                candidates.append(("stale", t, int(age)))
        except (ValueError, TypeError):
            continue
    
    # 情况2: 有恢复指令的blocked/suspended任务（视为需要恢复）
    for t in tasks.values():
        if t["status"] in ("blocked", "suspended") and t.get("resume_instructions"):
            candidates.append(("blocked_with_instructions", t, 0))
    
    # 情况3: 有恢复指令的queued任务（视为需要执行）
    for t in tasks.values():
        if t["status"] == "queued" and t.get("resume_instructions"):
            candidates.append(("queued_with_instructions", t, 0))
    
    if not candidates:
        print("RECOVER:none")
        return
    
    # 处理stale任务：标记为suspended
    stale_tasks = [c for c in candidates if c[0] == "stale"]
    for _, task, age in stale_tasks:
        task["status"] = "suspended"
        task["blocked_reason"] = f"被动中断: {age}秒未更新"
        task["updated_at"] = now()
        if "progress_log" not in task:
            task["progress_log"] = []
        task["progress_log"].append({"time": now(), "msg": f"被动中断检测: {age}s未更新"})
    if stale_tasks:
        save(data)
    
    # 输出所有待恢复任务（按优先级排序）
    candidates.sort(key=lambda x: x[1]["priority"])
    
    # 统计各类型数量
    counts = {}
    for rtype, _, _ in candidates:
        counts[rtype] = counts.get(rtype, 0) + 1
    
    # 输出摘要行
    parts = []
    for rtype, cnt in counts.items():
        parts.append(f"{rtype}:{cnt}")
    print(f"RECOVER:all:{len(candidates)}|{','.join(parts)}")
    
    # 输出所有任务的JSON数组
    all_tasks = [c[1] for c in candidates]
    print(json.dumps(all_tasks, ensure_ascii=False))

def cmd_migrate(args):
    """从旧checkpoint.json迁移任务到新调度器"""
    old_file = os.path.join(STATE_DIR, "checkpoint.json")
    if not os.path.exists(old_file):
        print("无旧checkpoint文件"); return
    with open(old_file) as f:
        old = json.load(f)
    data = load()
    migrated = 0
    # 迁移活跃任务
    if old.get("active_task"):
        t = old["active_task"]
        tid = t["id"]
        if tid not in data["tasks"]:
            task = new_task(tid, t["description"], "migrated",
                           priority=3, steps=t.get("steps",[]),
                           resume_instructions=t.get("resume_instructions",""))
            task["status"] = "running" if t["status"]=="running" else "queued"
            task["started_at"] = t.get("started_at")
            task["progress_log"] = t.get("progress_log",[])
            data["tasks"][tid] = task
            data["queue"].append(tid)
            migrated += 1
    # 迁移中断任务
    for t in old.get("interrupted_tasks", []):
        tid = t["id"]
        if tid not in data["tasks"]:
            task = new_task(tid, t["description"], "migrated",
                           priority=4, steps=t.get("steps",[]),
                           resume_instructions=t.get("resume_instructions",""))
            task["status"] = "suspended"
            task["blocked_reason"] = t.get("interrupt_reason","中断")
            data["tasks"][tid] = task
            migrated += 1
    _sort_queue(data)
    save(data)
    print(f"✅ 迁移完成: {migrated}个任务")

def cmd_progress(args):
    """记录进度: progress <id> <message>"""
    if len(args) < 2:
        print("用法: progress <id> <message>"); return
    tid, msg = args[0], args[1]
    data = load()
    task = data["tasks"].get(tid)
    if not task:
        print(f"❌ 任务不存在: {tid}"); return
    task["progress_log"].append({"time": now(), "msg": msg})
    task["progress_log"] = task["progress_log"][-20:]
    task["updated_at"] = now()
    save(data)
    print(f"📝 {msg}")

# === 辅助函数 ===

def _sort_queue(data):
    """按优先级排序队列"""
    tasks = data["tasks"]
    data["queue"] = sorted(
        [tid for tid in data["queue"] if tid in tasks],
        key=lambda tid: tasks[tid]["priority"]
    )

# === Main ===

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("""task_scheduler.py - 多任务调度器
命令:
  add <id> <desc> [--source s] [--priority n] [--tags t1,t2]
  start <id>              开始执行
  suspend <id> [reason]   挂起任务
  block <id> <reason>     标记阻塞
  resume <id>             恢复任务
  step <id> <name> <status>  更新步骤
  resume-info <id> <text> 写入恢复指令
  progress <id> <msg>     记录进度
  complete <id> [summary] 完成任务
  next                    获取下一个任务(JSON)
  dashboard               全局看板
  migrate                 从旧checkpoint迁移""")
        sys.exit(0)
    
    cmd = sys.argv[1]
    args = sys.argv[2:]
    
    cmds = {
        "add": cmd_add, "start": cmd_start,
        "suspend": cmd_suspend, "block": cmd_block,
        "resume": cmd_resume, "step": cmd_step,
        "resume-info": cmd_resume_info,
        "progress": cmd_progress,
        "complete": cmd_complete,
        "next": lambda a=None: cmd_next(a or []),
        "dashboard": lambda a=None: cmd_dashboard(a or []),
        "migrate": lambda a=None: cmd_migrate(a or []),
        "recover": lambda a=None: cmd_recover(a or []),
    }
    
    fn = cmds.get(cmd)
    if fn:
        fn(args) if args else fn()
    else:
        print(f"未知命令: {cmd}")
