#!/usr/bin/env python3
"""
task_scheduler.py - 集群主管多任务调度器 v1.1 (优化版)
支持：多任务并行、挂起/恢复、优先级、来源追踪、自主思考循环

状态文件: /root/.openclaw/workspace/state/tasks.json
"""

import json
import logging
import sys
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from functools import wraps

# === 配置 ===
STATE_DIR = "/root/.openclaw/workspace/state"
TASKS_FILE = os.path.join(STATE_DIR, "tasks.json")
os.makedirs(STATE_DIR, exist_ok=True)

# === 日志配置 ===
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(STATE_DIR, "task_scheduler.log")),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# === 类型定义 ===
TaskDict = Dict[str, Any]
StateData = Dict[str, Any]

# === 公共函数 (与checkpoint_manager共享) ===

def now() -> str:
    """返回当前UTC时间字符串"""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def ts() -> int:
    """返回当前时间戳"""
    return int(time.time())

def load_json(file_path: str, default: Dict[str, Any]) -> Dict[str, Any]:
    """通用JSON加载函数，带错误处理"""
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                logger.debug(f"成功加载文件: {file_path}")
                return data
        logger.debug(f"文件不存在，使用默认: {file_path}")
        return default
    except json.JSONDecodeError as e:
        logger.error(f"JSON解析错误 {file_path}: {e}")
        return default
    except PermissionError as e:
        logger.error(f"权限错误 {file_path}: {e}")
        raise
    except IOError as e:
        logger.error(f"IO错误 {file_path}: {e}")
        raise

def save_json(file_path: str, data: Dict[str, Any]) -> None:
    """通用JSON保存函数，带错误处理"""
    try:
        data["last_updated"] = now()
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.debug(f"成功保存文件: {file_path}")
    except PermissionError as e:
        logger.error(f"权限错误 {file_path}: {e}")
        raise
    except IOError as e:
        logger.error(f"IO错误 {file_path}: {e}")
        raise
    except TypeError as e:
        logger.error(f"JSON序列化错误 {file_path}: {e}")
        raise

# === 数据层 ===

def load() -> StateData:
    """加载任务状态"""
    default = {
        "version": 1,
        "tasks": {},
        "queue": [],
        "completed": [],
        "stats": {"created": 0, "completed": 0, "interrupted": 0},
        "last_updated": None
    }
    return load_json(TASKS_FILE, default)

def save(data: StateData) -> None:
    """保存任务状态"""
    save_json(TASKS_FILE, data)

def new_task(
    tid: str,
    desc: str,
    source: str = "manual",
    priority: int = 5,
    tags: Optional[List[str]] = None,
    steps: Optional[List[Dict[str, Any]]] = None,
    resume_instructions: str = "",
    blocked_reason: str = ""
) -> TaskDict:
    """创建新任务对象"""
    return {
        "id": tid,
        "description": desc,
        "source": source,
        "priority": priority,
        "tags": tags or [],
        "status": "queued",
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

# === 辅助函数 ===

def _find_task(data: StateData, tid: str) -> Tuple[bool, Optional[TaskDict], str]:
    """
    通用任务查找函数
    返回: (是否找到, 任务对象, 错误消息)
    """
    task = data["tasks"].get(tid)
    if not task:
        return False, None, f"任务不存在: {tid}"
    return True, task, ""

def _ensure_fields(data: StateData) -> None:
    """确保必要字段存在"""
    if "tasks" not in data:
        data["tasks"] = {}
    # 兼容旧格式: tasks 是列表而不是字典
    elif isinstance(data["tasks"], list):
        logger.info("检测到旧格式数据(tasks是列表)，转换为字典格式")
        tasks_dict = {}
        for task in data["tasks"]:
            if isinstance(task, dict) and "id" in task:
                tasks_dict[task["id"]] = task
        data["tasks"] = tasks_dict
    if "queue" not in data:
        data["queue"] = []
    if "stats" not in data:
        data["stats"] = {"created": 0, "completed": 0, "interrupted": 0}

def _sort_queue(data: StateData) -> None:
    """按优先级排序队列"""
    tasks = data["tasks"]
    data["queue"] = sorted(
        [tid for tid in data["queue"] if tid in tasks],
        key=lambda tid: tasks[tid]["priority"]
    )

def _parse_common_args(args: List[str]) -> Dict[str, Any]:
    """解析通用参数: --source, --priority, --tags"""
    source, priority, tags = "manual", 5, []
    i = 0
    while i < len(args):
        if args[i] == "--source" and i + 1 < len(args):
            source = args[i + 1]
            i += 2
        elif args[i] == "--priority" and i + 1 < len(args):
            try:
                priority = int(args[i + 1])
            except ValueError:
                logger.warning(f"无效的优先级值: {args[i + 1]}, 使用默认值5")
            i += 2
        elif args[i] == "--tags" and i + 1 < len(args):
            tags = args[i + 1].split(",")
            i += 2
        else:
            i += 1
    return {"source": source, "priority": priority, "tags": tags}

def _add_progress_log(task: TaskDict, msg: str) -> None:
    """添加进度日志"""
    task.setdefault("progress_log", [])
    task["progress_log"].append({"time": now(), "msg": msg})
    # 限制日志数量
    task["progress_log"] = task["progress_log"][-20:]

# === 命令层 ===

def cmd_add(args: List[str]) -> None:
    """添加任务: add <id> <desc> [--source s] [--priority n] [--tags t1,t2]"""
    logger.info(f"执行命令: add, 参数: {args}")
    if len(args) < 2:
        print("用法: add <id> <description> [--source s] [--priority n] [--tags t1,t2]")
        return
    
    tid, desc = args[0], args[1]
    parsed = _parse_common_args(args[2:])
    
    try:
        data = load()
        if tid in data["tasks"]:
            logger.warning(f"尝试添加已存在的任务: {tid}")
            print(f"❌ 任务已存在: {tid}")
            return
        
        task = new_task(
            tid, desc,
            source=parsed["source"],
            priority=parsed["priority"],
            tags=parsed["tags"]
        )
        data["tasks"][tid] = task
        data["queue"].append(tid)
        _sort_queue(data)
        data["stats"]["created"] += 1
        save(data)
        
        logger.info(f"任务添加成功: {tid}, 优先级={parsed['priority']}, 来源={parsed['source']}")
        print(f"✅ 任务已添加: {tid} (优先级{parsed['priority']}, 来源{parsed['source']})")
    except Exception as e:
        logger.error(f"添加任务失败: {e}")
        print(f"❌ 添加任务失败: {e}")

def cmd_start(args: List[str]) -> None:
    """开始执行任务: start <id>"""
    logger.info(f"执行命令: start, 参数: {args}")
    if not args:
        print("用法: start <id>")
        return
    
    tid = args[0]
    try:
        data = load()
        found, task, err_msg = _find_task(data, tid)
        if not found:
            logger.warning(f"尝试启动不存在的任务: {tid}")
            print(f"❌ {err_msg}")
            return
        
        task["status"] = "running"
        task["started_at"] = task.get("started_at") or now()
        task["updated_at"] = now()
        save(data)
        
        logger.info(f"任务开始执行: {tid}")
        print(f"🔄 任务开始: {tid}")
    except Exception as e:
        logger.error(f"启动任务失败: {e}")
        print(f"❌ 启动任务失败: {e}")

def cmd_suspend(args: List[str]) -> None:
    """挂起任务: suspend <id> [reason]"""
    logger.info(f"执行命令: suspend, 参数: {args}")
    if not args:
        print("用法: suspend <id> [reason]")
        return
    
    tid = args[0]
    reason = args[1] if len(args) > 1 else "手动挂起"
    
    try:
        data = load()
        found, task, err_msg = _find_task(data, tid)
        if not found:
            logger.warning(f"尝试挂起不存在的任务: {tid}")
            print(f"❌ {err_msg}")
            return
        
        task["status"] = "suspended"
        task["blocked_reason"] = reason
        task["updated_at"] = now()
        _add_progress_log(task, f"挂起: {reason}")
        save(data)
        
        logger.info(f"任务已挂起: {tid}, 原因: {reason}")
        print(f"⏸️ 任务挂起: {tid} - {reason}")
    except Exception as e:
        logger.error(f"挂起任务失败: {e}")
        print(f"❌ 挂起任务失败: {e}")

def cmd_block(args: List[str]) -> None:
    """标记任务被阻塞: block <id> <reason>"""
    logger.info(f"执行命令: block, 参数: {args}")
    if len(args) < 2:
        print("用法: block <id> <reason>")
        return
    
    tid, reason = args[0], args[1]
    
    try:
        data = load()
        found, task, err_msg = _find_task(data, tid)
        if not found:
            logger.warning(f"尝试阻塞不存在的任务: {tid}")
            print(f"❌ {err_msg}")
            return
        
        task["status"] = "blocked"
        task["blocked_reason"] = reason
        task["updated_at"] = now()
        _add_progress_log(task, f"阻塞: {reason}")
        save(data)
        
        logger.info(f"任务已阻塞: {tid}, 原因: {reason}")
        print(f"🚫 任务阻塞: {tid} - {reason}")
    except Exception as e:
        logger.error(f"阻塞任务失败: {e}")
        print(f"❌ 阻塞任务失败: {e}")

def cmd_resume(args: List[str]) -> None:
    """恢复挂起/阻塞的任务: resume <id>"""
    logger.info(f"执行命令: resume, 参数: {args}")
    if not args:
        print("用法: resume <id>")
        return
    
    tid = args[0]
    
    try:
        data = load()
        found, task, err_msg = _find_task(data, tid)
        if not found:
            logger.warning(f"尝试恢复不存在的任务: {tid}")
            print(f"❌ {err_msg}")
            return
        
        task["status"] = "queued"
        task["blocked_reason"] = ""
        task["updated_at"] = now()
        _add_progress_log(task, "恢复到队列")
        
        if tid not in data["queue"]:
            data["queue"].append(tid)
            _sort_queue(data)
        
        save(data)
        logger.info(f"任务已恢复: {tid}")
        print(f"▶️ 任务恢复: {tid}")
    except Exception as e:
        logger.error(f"恢复任务失败: {e}")
        print(f"❌ 恢复任务失败: {e}")

def cmd_step(args: List[str]) -> None:
    """更新任务步骤: step <id> <step_name> <status>"""
    logger.info(f"执行命令: step, 参数: {args}")
    if len(args) < 3:
        print("用法: step <id> <step_name> <done|running|pending|skipped>")
        return
    
    tid, step_name, status = args[0], args[1], args[2]
    
    # 验证status值
    valid_statuses = {"done", "running", "pending", "skipped"}
    if status not in valid_statuses:
        logger.warning(f"无效的步骤状态: {status}")
        print(f"❌ 无效状态: {status}, 必须是: {', '.join(valid_statuses)}")
        return
    
    try:
        data = load()
        found, task, err_msg = _find_task(data, tid)
        if not found:
            logger.warning(f"尝试更新不存在的任务步骤: {tid}")
            print(f"❌ {err_msg}")
            return
        
        # 更新或添加步骤
        task.setdefault("steps", [])
        found_step = False
        for s in task["steps"]:
            if s["name"] == step_name:
                s["status"] = status
                s["updated_at"] = now()
                found_step = True
                break
        
        if not found_step:
            task["steps"].append({
                "name": step_name,
                "status": status,
                "updated_at": now()
            })
        
        task["updated_at"] = now()
        save(data)
        
        logger.info(f"步骤已更新: {tid}/{step_name} -> {status}")
        print(f"✅ {tid}/{step_name} → {status}")
    except Exception as e:
        logger.error(f"更新步骤失败: {e}")
        print(f"❌ 更新步骤失败: {e}")

def cmd_resume_info(args: List[str]) -> None:
    """写入恢复指令: resume-info <id> <instructions>"""
    logger.info(f"执行命令: resume-info, 参数: {args}")
    if len(args) < 2:
        print("用法: resume-info <id> <instructions>")
        return
    
    tid, instructions = args[0], args[1]
    
    try:
        data = load()
        found, task, err_msg = _find_task(data, tid)
        if not found:
            logger.warning(f"尝试更新不存在的任务的恢复指令: {tid}")
            print(f"❌ {err_msg}")
            return
        
        task["resume_instructions"] = instructions
        task["updated_at"] = now()
        save(data)
        
        logger.info(f"恢复指令已更新: {tid}")
        print(f"📋 恢复指令已更新: {tid}")
    except Exception as e:
        logger.error(f"更新恢复指令失败: {e}")
        print(f"❌ 更新恢复指令失败: {e}")

def cmd_complete(args: List[str]) -> None:
    """完成任务: complete <id> [summary]"""
    logger.info(f"执行命令: complete, 参数: {args}")
    if not args:
        print("用法: complete <id> [summary]")
        return
    
    tid = args[0]
    summary = args[1] if len(args) > 1 else ""
    
    try:
        data = load()
        found, task, err_msg = _find_task(data, tid)
        if not found:
            logger.warning(f"尝试完成不存在的任务: {tid}")
            print(f"❌ {err_msg}")
            return
        
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
        
        logger.info(f"任务已完成: {tid}")
        print(f"✅ 任务完成: {tid}")
    except Exception as e:
        logger.error(f"完成任务失败: {e}")
        print(f"❌ 完成任务失败: {e}")

def cmd_next(args: Optional[List[str]] = None) -> None:
    """智能调度：返回下一个应该执行的任务"""
    logger.debug("执行命令: next")
    try:
        data = load()
        _ensure_fields(data)
        tasks = data["tasks"]
        
        # 1. 找被中断的running任务
        interrupted = [t for t in tasks.values()
                       if t["status"] == "running" and t.get("resume_instructions")]
        if interrupted:
            t = sorted(interrupted, key=lambda x: x["priority"])[0]
            logger.info(f"选择恢复任务(有恢复指令): {t['id']}")
            print(f"NEXT:resume")
            print(json.dumps(t, ensure_ascii=False))
            return
        
        # 2. 队列中有恢复指令的任务
        if data["queue"]:
            for tid in data["queue"]:
                t = tasks.get(tid)
                if t and t["status"] == "queued" and t.get("resume_instructions"):
                    logger.info(f"选择队列任务(有恢复指令): {t['id']}")
                    print(f"NEXT:queued_with_instructions")
                    print(json.dumps(t, ensure_ascii=False))
                    return
        
        # 3. 队列中优先级最高的任务
        if data["queue"]:
            for tid in data["queue"]:
                t = tasks.get(tid)
                if t and t["status"] == "queued":
                    logger.info(f"选择队列任务(优先级): {t['id']}")
                    print(f"NEXT:queued")
                    print(json.dumps(t, ensure_ascii=False))
                    return
        
        # 4. 挂起的任务（可能阻塞已解除）
        for t in sorted(tasks.values(), key=lambda x: x["priority"]):
            if t["status"] in ("suspended", "blocked"):
                logger.info(f"选择重试任务: {t['id']}")
                print(f"NEXT:retry")
                print(json.dumps(t, ensure_ascii=False))
                return
        
        logger.debug("无下一个任务")
        print("NEXT:none")
    except Exception as e:
        logger.error(f"获取下一个任务失败: {e}")
        print(f"❌ 获取下一个任务失败: {e}")

def cmd_dashboard(args: Optional[List[str]] = None) -> None:
    """全局任务看板"""
    logger.debug("执行命令: dashboard")
    try:
        data = load()
        _ensure_fields(data)
        
        tasks = data["tasks"]
        by_status: Dict[str, List[TaskDict]] = {}
        for t in tasks.values():
            by_status.setdefault(t["status"], []).append(t)
        
        # 计算统计数据
        completed_count = len([t for t in tasks.values() if t["status"] == "completed"])
        interrupted_count = len([t for t in tasks.values() if t["status"] in ("suspended", "blocked")])
        
        print("═══ 集群主管任务看板 ═══")
        print(f"总计: {len(tasks)} | 完成: {completed_count} | 中断: {interrupted_count}")
        print()
        
        icons = {"running": "🔄", "queued": "📋", "suspended": "⏸️",
                 "blocked": "🚫", "completed": "✅", "failed": "❌"}
        order = ["running", "queued", "suspended", "blocked", "completed", "failed"]
        
        for status in order:
            group = by_status.get(status, [])
            if not group:
                continue
            icon = icons.get(status, "❓")
            print(f"{icon} {status.upper()} ({len(group)})")
            show = group if status != "completed" else group[-3:]
            for t in sorted(show, key=lambda x: x["priority"]):
                pri = f"P{t['priority']}"
                src = t.get("source", "unknown")[:8]
                desc = t["description"][:50]
                print(f"  [{pri}][{src}] {t['id']}: {desc}")
                if t.get("resume_instructions") and status != "completed":
                    ri = t["resume_instructions"][:80]
                    print(f"       📋 恢复: {ri}")
                if t.get("blocked_reason") and status in ("suspended", "blocked"):
                    print(f"       🚫 原因: {t['blocked_reason'][:60]}")
            print()
        
        logger.info("看板已显示")
    except Exception as e:
        logger.error(f"显示看板失败: {e}")
        print(f"❌ 显示看板失败: {e}")

def cmd_recover(args: Optional[List[str]] = None) -> None:
    """检测需要恢复的任务 - 心跳调用"""
    STALE_SECONDS = 1800  # 30分钟
    logger.debug("执行命令: recover")
    
    try:
        data = load()
        tasks = data["tasks"]
        candidates: List[Tuple[str, TaskDict, int]] = []
        
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
                    logger.info(f"检测到被动中断任务: {t['id']}, 未更新{int(age)}秒")
            except (ValueError, TypeError) as e:
                logger.warning(f"解析时间失败: {updated}, {e}")
                continue
        
        # 情况2: 有恢复指令的blocked/suspended任务
        for t in tasks.values():
            if t["status"] in ("blocked", "suspended") and t.get("resume_instructions"):
                candidates.append(("blocked_with_instructions", t, 0))
        
        # 情况3: 有恢复指令的queued任务
        for t in tasks.values():
            if t["status"] == "queued" and t.get("resume_instructions"):
                candidates.append(("queued_with_instructions", t, 0))
        
        if not candidates:
            logger.debug("无需要恢复的任务")
            print("RECOVER:none")
            return
        
        # 处理stale任务：标记为suspended
        stale_tasks = [c for c in candidates if c[0] == "stale"]
        for _, task, age in stale_tasks:
            task["status"] = "suspended"
            task["blocked_reason"] = f"被动中断: {age}秒未更新"
            task["updated_at"] = now()
            _add_progress_log(task, f"被动中断检测: {age}s未更新")
        
        if stale_tasks:
            save(data)
            logger.info(f"已处理{len(stale_tasks)}个被动中断任务")
        
        # 输出所有待恢复任务（按优先级排序）
        candidates.sort(key=lambda x: x[1]["priority"])
        
        # 统计各类型数量
        counts: Dict[str, int] = {}
        for rtype, _, _ in candidates:
            counts[rtype] = counts.get(rtype, 0) + 1
        
        # 输出摘要行
        parts = [f"{rtype}:{cnt}" for rtype, cnt in counts.items()]
        print(f"RECOVER:all:{len(candidates)}|{','.join(parts)}")
        
        # 输出所有任务的JSON数组
        all_tasks = [c[1] for c in candidates]
        print(json.dumps(all_tasks, ensure_ascii=False))
        
        logger.info(f"恢复检查完成: {len(candidates)}个任务待恢复")
    except Exception as e:
        logger.error(f"恢复检查失败: {e}")
        print(f"❌ 恢复检查失败: {e}")

def cmd_migrate(args: Optional[List[str]] = None) -> None:
    """从旧checkpoint.json迁移任务到新调度器"""
    logger.info("执行命令: migrate")
    old_file = os.path.join(STATE_DIR, "checkpoint.json")
    
    if not os.path.exists(old_file):
        logger.warning("无旧checkpoint文件")
        print("无旧checkpoint文件")
        return
    
    try:
        with open(old_file, 'r', encoding='utf-8') as f:
            old = json.load(f)
        
        data = load()
        migrated = 0
        
        # 迁移活跃任务
        if old.get("active_task"):
            t = old["active_task"]
            tid = t["id"]
            if tid not in data["tasks"]:
                task = new_task(
                    tid, t["description"], "migrated",
                    priority=3, steps=t.get("steps", []),
                    resume_instructions=t.get("resume_instructions", "")
                )
                task["status"] = "running" if t["status"] == "running" else "queued"
                task["started_at"] = t.get("started_at")
                task["progress_log"] = t.get("progress_log", [])
                data["tasks"][tid] = task
                data["queue"].append(tid)
                migrated += 1
                logger.info(f"迁移活跃任务: {tid}")
        
        # 迁移中断任务
        for t in old.get("interrupted_tasks", []):
            tid = t["id"]
            if tid not in data["tasks"]:
                task = new_task(
                    tid, t["description"], "migrated",
                    priority=4, steps=t.get("steps", []),
                    resume_instructions=t.get("resume_instructions", "")
                )
                task["status"] = "suspended"
                task["blocked_reason"] = t.get("interrupt_reason", "中断")
                data["tasks"][tid] = task
                migrated += 1
                logger.info(f"迁移中断任务: {tid}")
        
        _sort_queue(data)
        save(data)
        
        logger.info(f"迁移完成: {migrated}个任务")
        print(f"✅ 迁移完成: {migrated}个任务")
    except Exception as e:
        logger.error(f"迁移失败: {e}")
        print(f"❌ 迁移失败: {e}")

def cmd_progress(args: List[str]) -> None:
    """记录进度: progress <id> <message>"""
    logger.info(f"执行命令: progress, 参数: {args}")
    if len(args) < 2:
        print("用法: progress <id> <message>")
        return
    
    tid, msg = args[0], args[1]
    
    try:
        data = load()
        found, task, err_msg = _find_task(data, tid)
        if not found:
            logger.warning(f"尝试记录不存在的任务进度: {tid}")
            print(f"❌ {err_msg}")
            return
        
        _add_progress_log(task, msg)
        task["updated_at"] = now()
        save(data)
        
        logger.debug(f"进度已记录: {tid} - {msg}")
        print(f"📝 {msg}")
    except Exception as e:
        logger.error(f"记录进度失败: {e}")
        print(f"❌ 记录进度失败: {e}")

# === Main ===

def main():
    if len(sys.argv) < 2:
        print("""task_scheduler.py - 多任务调度器 v1.1
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
  migrate                 从旧checkpoint迁移
  recover                 检测需要恢复的任务""")
        sys.exit(0)
    
    cmd = sys.argv[1]
    args = sys.argv[2:]
    
    cmds: Dict[str, Any] = {
        "add": cmd_add,
        "start": cmd_start,
        "suspend": cmd_suspend,
        "block": cmd_block,
        "resume": cmd_resume,
        "step": cmd_step,
        "resume-info": cmd_resume_info,
        "progress": cmd_progress,
        "complete": cmd_complete,
        "next": lambda a=None: cmd_next(a),
        "dashboard": lambda a=None: cmd_dashboard(a),
        "migrate": lambda a=None: cmd_migrate(a),
        "recover": lambda a=None: cmd_recover(a),
    }
    
    fn = cmds.get(cmd)
    if fn:
        fn(args) if args else fn()
    else:
        print(f"未知命令: {cmd}")

if __name__ == "__main__":
    main()
