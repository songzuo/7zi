#!/usr/bin/env python3
"""
checkpoint_manager.py - 断点续传管理器 v2
核心理念：每个checkpoint不只记录状态，还记录"恢复指令"
新会话只需读取恢复指令就能无缝接续工作

用法:
  python3 checkpoint_manager.py start <task_id> <description>
  python3 checkpoint_manager.py update <task_id> --step <name> --status <s>
  python3 checkpoint_manager.py resume-info <task_id> <instructions>
  python3 checkpoint_manager.py complete <task_id> [summary]
  python3 checkpoint_manager.py interrupt <task_id> [reason]
  python3 checkpoint_manager.py status
  python3 checkpoint_manager.py pending
  python3 checkpoint_manager.py recover  # 输出恢复指令供心跳使用
"""

import json, sys, os
from datetime import datetime, timezone

STATE_DIR = "/root/.openclaw/workspace/state"
CP_FILE = os.path.join(STATE_DIR, "checkpoint.json")
os.makedirs(STATE_DIR, exist_ok=True)

def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def load():
    if os.path.exists(CP_FILE):
        with open(CP_FILE) as f:
            return json.load(f)
    return {"version": 2, "active_task": None,
            "interrupted_tasks": [], "completed_tasks": [],
            "last_updated": None}

def save(data):
    data["last_updated"] = now()
    with open(CP_FILE, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def cmd_start(args):
    if len(args) < 2:
        print("用法: start <task_id> <description>")
        return
    tid, desc = args[0], args[1]
    data = load()
    # 归档当前活跃任务
    if data.get("active_task"):
        old = data["active_task"]
        old["status"] = "interrupted"
        old["interrupted_at"] = now()
        data["interrupted_tasks"].append(old)
    task = {
        "id": tid,
        "description": desc,
        "status": "running",
        "started_at": now(),
        "updated_at": now(),
        "steps": [],
        "progress_log": [],
        "resume_instructions": "",
        "context": {}
    }
    data["active_task"] = task
    save(data)
    print(f"✅ 任务启动: {tid}")

def cmd_update(args):
    """更新步骤状态"""
    data = load()
    task = data.get("active_task")
    if not task:
        print("❌ 无活跃任务")
        return
    # 解析 --step name --status status
    step_name = status = None
    i = 0
    while i < len(args):
        if args[i] == "--step" and i+1 < len(args):
            step_name = args[i+1]; i += 2
        elif args[i] == "--status" and i+1 < len(args):
            status = args[i+1]; i += 2
        else:
            i += 1
    if not step_name or not status:
        print("用法: update <task_id> --step <name> --status <done|running|pending|skipped>")
        return
    # 更新或添加步骤
    found = False
    for s in task["steps"]:
        if s["name"] == step_name:
            s["status"] = status
            s["updated_at"] = now()
            found = True
            break
    if not found:
        task["steps"].append({
            "name": step_name,
            "status": status,
            "updated_at": now()
        })
    task["updated_at"] = now()
    save(data)
    print(f"✅ 步骤更新: {step_name} → {status}")

def cmd_resume_info(args):
    """写入恢复指令 - 这是断点续传的核心"""
    if len(args) < 2:
        print("用法: resume-info <task_id> <instructions>")
        return
    tid, instructions = args[0], args[1]
    data = load()
    task = data.get("active_task")
    if not task or task["id"] != tid:
        # 也检查interrupted_tasks
        for t in data.get("interrupted_tasks", []):
            if t["id"] == tid:
                t["resume_instructions"] = instructions
                t["updated_at"] = now()
                save(data)
                print(f"📝 恢复指令已更新(中断任务): {tid}")
                return
        print(f"❌ 找不到任务: {tid}")
        return
    task["resume_instructions"] = instructions
    task["updated_at"] = now()
    save(data)
    print(f"📝 恢复指令已更新: {tid}")

def cmd_progress(args):
    """记录进度日志"""
    if len(args) < 2:
        print("用法: progress <task_id> <message>")
        return
    tid, msg = args[0], args[1]
    data = load()
    task = data.get("active_task")
    if not task or task["id"] != tid:
        print(f"❌ 任务不匹配"); return
    task["progress_log"].append({"time": now(), "msg": msg})
    task["progress_log"] = task["progress_log"][-20:]
    task["updated_at"] = now()
    save(data)
    print(f"📝 {msg}")

def cmd_complete(args):
    if not args:
        print("用法: complete <task_id> [summary]")
        return
    tid = args[0]
    summary = args[1] if len(args) > 1 else ""
    data = load()
    task = data.get("active_task")
    if not task or task["id"] != tid:
        print(f"❌ 任务不匹配"); return
    task["status"] = "completed"
    task["completed_at"] = now()
    task["summary"] = summary
    task["resume_instructions"] = ""
    data["completed_tasks"].append(task)
    data["completed_tasks"] = data["completed_tasks"][-50:]
    data["active_task"] = None
    save(data)
    print(f"✅ 任务完成: {tid}")

def cmd_interrupt(args):
    """主动标记中断（会话即将结束时调用）"""
    if not args:
        print("用法: interrupt <task_id> [reason]")
        return
    tid = args[0]
    reason = args[1] if len(args) > 1 else "session ended"
    data = load()
    task = data.get("active_task")
    if not task or task["id"] != tid:
        print(f"❌ 任务不匹配"); return
    task["status"] = "interrupted"
    task["interrupted_at"] = now()
    task["interrupt_reason"] = reason
    data.setdefault("interrupted_tasks", []).append(task)
    data["active_task"] = None
    save(data)
    print(f"⚠️ 任务已标记中断: {tid}")

def cmd_status():
    data = load()
    task = data.get("active_task")
    if task:
        print(f"🔄 活跃任务: {task['id']}")
        print(f"   描述: {task['description']}")
        print(f"   状态: {task['status']}")
        print(f"   开始: {task['started_at']}")
        print(f"   更新: {task['updated_at']}")
        for s in task.get("steps", []):
            icon = {"done":"✅","running":"🔄","pending":"⏳",
                    "skipped":"⏭️"}.get(s["status"], "❓")
            print(f"   {icon} {s['name']}: {s['status']}")
        if task.get("resume_instructions"):
            print(f"   📋 恢复指令: {task['resume_instructions'][:200]}")
    else:
        print("✅ 无活跃任务")
    interrupted = [t for t in data.get("interrupted_tasks", [])
                   if t["status"] == "interrupted"]
    if interrupted:
        print(f"\n⚠️ {len(interrupted)}个中断任务:")
        for t in interrupted[-5:]:
            print(f"   - {t['id']}: {t['description'][:60]}")

def cmd_pending():
    data = load()
    tasks = []
    if data.get("active_task") and \
       data["active_task"]["status"] in ("running", "interrupted"):
        tasks.append(data["active_task"])
    for t in data.get("interrupted_tasks", []):
        if t["status"] == "interrupted":
            tasks.append(t)
    if not tasks:
        print("NONE")
    else:
        print(f"PENDING:{len(tasks)}")
        for t in tasks:
            print(json.dumps(t, ensure_ascii=False))

def cmd_ping(args):
    """会话心跳ping - 每次心跳调用，记录活跃时间戳"""
    data = load()
    data["last_ping"] = now()
    data["ping_count"] = data.get("ping_count", 0) + 1
    save(data)
    print(f"PING:{data['last_ping']}")

def cmd_recover():
    """输出恢复指令 - 心跳调用此命令获取需要恢复的任务
    
    检测逻辑（三层）：
    1. active_task 状态为 running/interrupted → 直接恢复
    2. active_task 为 running 但 updated_at 超过30分钟 → 被动中断
    3. interrupted_tasks 中有未恢复的 → 恢复最近一个
    """
    data = load()
    STALE_SECONDS = 1800  # 30分钟未更新视为被动中断
    
    # 优先恢复活跃任务
    task = data.get("active_task")
    if task and task["status"] in ("running", "interrupted"):
        # 检查是否是被动中断（running但长时间没更新）
        if task["status"] == "running" and task.get("updated_at"):
            try:
                updated = datetime.strptime(task["updated_at"], "%Y-%m-%dT%H:%M:%SZ")
                updated = updated.replace(tzinfo=timezone.utc)
                age = (datetime.now(timezone.utc) - updated).total_seconds()
                if age > STALE_SECONDS:
                    # 自动标记为被动中断
                    task["status"] = "interrupted"
                    task["interrupted_at"] = now()
                    task["interrupt_reason"] = f"被动中断检测: {int(age)}秒未更新"
                    save(data)
                    print("RECOVER:passive_interrupt")
                    print(json.dumps(task, ensure_ascii=False))
                    return
            except (ValueError, TypeError):
                pass
        print("RECOVER:active")
        print(json.dumps(task, ensure_ascii=False))
        return
    
    # 其次恢复最近的中断任务
    interrupted = [t for t in data.get("interrupted_tasks", [])
                   if t["status"] == "interrupted"]
    if interrupted:
        latest = interrupted[-1]
        print("RECOVER:interrupted")
        print(json.dumps(latest, ensure_ascii=False))
        return
    print("RECOVER:none")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)
    cmd = sys.argv[1]
    args = sys.argv[2:]
    cmds = {
        "start": cmd_start,
        "update": cmd_update,
        "resume-info": cmd_resume_info,
        "progress": cmd_progress,
        "complete": cmd_complete,
        "interrupt": cmd_interrupt,
        "status": lambda a=None: cmd_status(),
        "pending": lambda a=None: cmd_pending(),
        "recover": lambda a=None: cmd_recover(),
        "ping": lambda a=None: cmd_ping(a or []),
    }
    fn = cmds.get(cmd)
    if fn:
        fn(args) if args else fn()
    else:
        print(f"未知命令: {cmd}")
