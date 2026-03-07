#!/usr/bin/env python3
"""
checkpoint_manager.py - 断点续传管理器 v2.1 (优化版)
核心理念：每个checkpoint不只记录状态，还记录"恢复指令"
新会话只需读取恢复指令就能无缝接续工作

用法:
  python3 checkpoint_manager.py start <task_id> <description>
  python3 checkpoint_manager.py update <task_id> --step <name> --status <s>
  python3 checkpoint_manager.py resume-info <task_id> <instructions>
  python3 checkpoint_manager.py complete <task_id> [summary]
  python3 checkpoint_manager.py interrupt <task_id> [reason>
  python3 checkpoint_manager.py status
  python3 checkpoint_manager.py pending
  python3 checkpoint_manager.py recover  # 输出恢复指令供心跳使用
  python3 checkpoint_manager.py ping        # 会话心跳
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# === 配置 ===
STATE_DIR = "/root/.openclaw/workspace/state"
CP_FILE = os.path.join(STATE_DIR, "checkpoint.json")
os.makedirs(STATE_DIR, exist_ok=True)

# === 日志配置 ===
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(STATE_DIR, "checkpoint_manager.log")),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# === 类型定义 ===
TaskDict = Dict[str, Any]
CheckpointData = Dict[str, Any]

# === 公共函数 (与task_scheduler共享) ===

def now() -> str:
    """返回当前UTC时间字符串"""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

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

def load() -> CheckpointData:
    """加载checkpoint状态"""
    default = {
        "version": 2,
        "active_task": None,
        "interrupted_tasks": [],
        "completed_tasks": [],
        "last_updated": None
    }
    return load_json(CP_FILE, default)

def save(data: CheckpointData) -> None:
    """保存checkpoint状态"""
    save_json(CP_FILE, data)

# === 辅助函数 ===

def _ensure_task_fields(task: TaskDict) -> None:
    """确保任务对象有必要的字段"""
    task.setdefault("steps", [])
    task.setdefault("progress_log", [])
    task.setdefault("resume_instructions", "")
    task.setdefault("context", {})

def _add_progress_log(task: TaskDict, msg: str) -> None:
    """添加进度日志"""
    task.setdefault("progress_log", [])
    task["progress_log"].append({"time": now(), "msg": msg})
    # 限制日志数量
    task["progress_log"] = task["progress_log"][-20:]

def _update_task_step(task: TaskDict, step_name: str, status: str) -> bool:
    """更新或添加步骤"""
    task.setdefault("steps", [])
    for s in task["steps"]:
        if s["name"] == step_name:
            s["status"] = status
            s["updated_at"] = now()
            return True
    
    # 添加新步骤
    task["steps"].append({
        "name": step_name,
        "status": status,
        "updated_at": now()
    })
    return False

def _validate_status(status: str) -> bool:
    """验证状态值是否有效"""
    valid_statuses = {"done", "running", "pending", "skipped"}
    return status in valid_statuses

# === 命令层 ===

def cmd_start(args: List[str]) -> None:
    """开始任务: start <task_id> <description>"""
    logger.info(f"执行命令: start, 参数: {args}")
    
    if len(args) < 2:
        print("用法: start <task_id> <description>")
        return
    
    tid, desc = args[0], args[1]
    
    try:
        data = load()
        
        # 归档当前活跃任务
        if data.get("active_task"):
            old = data["active_task"]
            old["status"] = "interrupted"
            old["interrupted_at"] = now()
            data["interrupted_tasks"].append(old)
            logger.info(f"归档旧活跃任务: {old['id']}")
        
        task: TaskDict = {
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
        
        logger.info(f"任务启动: {tid}")
        print(f"✅ 任务启动: {tid}")
    except Exception as e:
        logger.error(f"启动任务失败: {e}")
        print(f"❌ 启动任务失败: {e}")

def cmd_update(args: List[str]) -> None:
    """更新步骤状态: update <task_id> --step <name> --status <status>"""
    logger.info(f"执行命令: update, 参数: {args}")
    
    data = load()
    task = data.get("active_task")
    
    if not task:
        logger.warning("无活跃任务")
        print("❌ 无活跃任务")
        return
    
    # 解析参数
    step_name: Optional[str] = None
    status: Optional[str] = None
    i = 0
    while i < len(args):
        if args[i] == "--step" and i + 1 < len(args):
            step_name = args[i + 1]
            i += 2
        elif args[i] == "--status" and i + 1 < len(args):
            status = args[i + 1]
            i += 2
        else:
            i += 1
    
    if not step_name or not status:
        logger.warning("参数不完整")
        print("用法: update <task_id> --step <name> --status <done|running|pending|skipped>")
        return
    
    # 验证status
    if not _validate_status(status):
        logger.warning(f"无效的状态值: {status}")
        print(f"❌ 无效状态: {status}")
        return
    
    try:
        found = _update_task_step(task, step_name, status)
        task["updated_at"] = now()
        save(data)
        
        action = "更新" if found else "添加"
        logger.info(f"步骤{action}: {step_name} -> {status}")
        print(f"✅ 步骤{action}: {step_name} → {status}")
    except Exception as e:
        logger.error(f"更新步骤失败: {e}")
        print(f"❌ 更新步骤失败: {e}")

def cmd_resume_info(args: List[str]) -> None:
    """写入恢复指令: resume-info <task_id> <instructions>"""
    logger.info(f"执行命令: resume-info, 参数: {args}")
    
    if len(args) < 2:
        print("用法: resume-info <task_id> <instructions>")
        return
    
    tid, instructions = args[0], args[1]
    
    try:
        data = load()
        task = data.get("active_task")
        
        # 检查活跃任务
        if task and task["id"] == tid:
            task["resume_instructions"] = instructions
            task["updated_at"] = now()
            save(data)
            logger.info(f"恢复指令已更新(活跃任务): {tid}")
            print(f"📝 恢复指令已更新: {tid}")
            return
        
        # 检查中断任务
        for t in data.get("interrupted_tasks", []):
            if t["id"] == tid:
                t["resume_instructions"] = instructions
                t["updated_at"] = now()
                save(data)
                logger.info(f"恢复指令已更新(中断任务): {tid}")
                print(f"📝 恢复指令已更新(中断任务): {tid}")
                return
        
        logger.warning(f"找不到任务: {tid}")
        print(f"❌ 找不到任务: {tid}")
    except Exception as e:
        logger.error(f"更新恢复指令失败: {e}")
        print(f"❌ 更新恢复指令失败: {e}")

def cmd_progress(args: List[str]) -> None:
    """记录进度日志: progress <task_id> <message>"""
    logger.info(f"执行命令: progress, 参数: {args}")
    
    if len(args) < 2:
        print("用法: progress <task_id> <message>")
        return
    
    tid, msg = args[0], args[1]
    
    try:
        data = load()
        task = data.get("active_task")
        
        if not task or task["id"] != tid:
            logger.warning(f"任务不匹配: {tid}")
            print(f"❌ 任务不匹配")
            return
        
        _add_progress_log(task, msg)
        task["updated_at"] = now()
        save(data)
        
        logger.debug(f"进度已记录: {msg}")
        print(f"📝 {msg}")
    except Exception as e:
        logger.error(f"记录进度失败: {e}")
        print(f"❌ 记录进度失败: {e}")

def cmd_complete(args: List[str]) -> None:
    """完成任务: complete <task_id> [summary]"""
    logger.info(f"执行命令: complete, 参数: {args}")
    
    if not args:
        print("用法: complete <task_id> [summary]")
        return
    
    tid = args[0]
    summary = args[1] if len(args) > 1 else ""
    
    try:
        data = load()
        task = data.get("active_task")
        
        if not task or task["id"] != tid:
            logger.warning(f"任务不匹配: {tid}")
            print(f"❌ 任务不匹配")
            return
        
        task["status"] = "completed"
        task["completed_at"] = now()
        task["summary"] = summary
        task["resume_instructions"] = ""
        
        # 移到已完成列表
        data.setdefault("completed_tasks", []).append(task)
        data["completed_tasks"] = data["completed_tasks"][-50:]
        data["active_task"] = None
        save(data)
        
        logger.info(f"任务已完成: {tid}")
        print(f"✅ 任务完成: {tid}")
    except Exception as e:
        logger.error(f"完成任务失败: {e}")
        print(f"❌ 完成任务失败: {e}")

def cmd_interrupt(args: List[str]) -> None:
    """主动标记中断: interrupt <task_id> [reason]"""
    logger.info(f"执行命令: interrupt, 参数: {args}")
    
    if not args:
        print("用法: interrupt <task_id> [reason]")
        return
    
    tid = args[0]
    reason = args[1] if len(args) > 1 else "session ended"
    
    try:
        data = load()
        task = data.get("active_task")
        
        if not task or task["id"] != tid:
            logger.warning(f"任务不匹配: {tid}")
            print(f"❌ 任务不匹配")
            return
        
        task["status"] = "interrupted"
        task["interrupted_at"] = now()
        task["interrupt_reason"] = reason
        
        data.setdefault("interrupted_tasks", []).append(task)
        data["active_task"] = None
        save(data)
        
        logger.info(f"任务已中断: {tid}, 原因: {reason}")
        print(f"⚠️ 任务已标记中断: {tid}")
    except Exception as e:
        logger.error(f"中断任务失败: {e}")
        print(f"❌ 中断任务失败: {e}")

def cmd_status(args: Optional[List[str]] = None) -> None:
    """显示当前状态"""
    logger.debug("执行命令: status")
    
    try:
        data = load()
        task = data.get("active_task")
        
        if task:
            print(f"🔄 活跃任务: {task['id']}")
            print(f"   描述: {task['description']}")
            print(f"   状态: {task['status']}")
            print(f"   开始: {task['started_at']}")
            print(f"   更新: {task['updated_at']}")
            
            # 显示步骤
            for s in task.get("steps", []):
                icon = {"done": "✅", "running": "🔄", "pending": "⏳",
                        "skipped": "⏭️"}.get(s["status"], "❓")
                print(f"   {icon} {s['name']}: {s['status']}")
            
            # 显示恢复指令
            if task.get("resume_instructions"):
                print(f"   📋 恢复指令: {task['resume_instructions'][:200]}")
        else:
            print("✅ 无活跃任务")
        
        # 显示中断任务
        interrupted = [t for t in data.get("interrupted_tasks", [])
                       if t["status"] == "interrupted"]
        
        if interrupted:
            print(f"\n⚠️ {len(interrupted)}个中断任务:")
            for t in interrupted[-5:]:
                print(f"   - {t['id']}: {t['description'][:60]}")
        
        logger.debug("状态已显示")
    except Exception as e:
        logger.error(f"显示状态失败: {e}")
        print(f"❌ 显示状态失败: {e}")

def cmd_pending(args: Optional[List[str]] = None) -> None:
    """显示待处理任务"""
    logger.debug("执行命令: pending")
    
    try:
        data = load()
        tasks: List[TaskDict] = []
        
        # 收集活跃和中断的任务
        if data.get("active_task") and \
           data["active_task"]["status"] in ("running", "interrupted"):
            tasks.append(data["active_task"])
        
        for t in data.get("interrupted_tasks", []):
            if t["status"] == "interrupted":
                tasks.append(t)
        
        if not tasks:
            logger.debug("无待处理任务")
            print("NONE")
        else:
            logger.info(f"显示{len(tasks)}个待处理任务")
            print(f"PENDING:{len(tasks)}")
            for t in tasks:
                print(json.dumps(t, ensure_ascii=False))
    except Exception as e:
        logger.error(f"显示待处理任务失败: {e}")
        print(f"❌ 显示待处理任务失败: {e}")

def cmd_ping(args: Optional[List[str]] = None) -> None:
    """会话心跳ping"""
    logger.debug("执行命令: ping")
    
    try:
        data = load()
        data["last_ping"] = now()
        data["ping_count"] = data.get("ping_count", 0) + 1
        save(data)
        
        logger.debug(f"PING响应: {data['last_ping']}")
        print(f"PING:{data['last_ping']}")
    except Exception as e:
        logger.error(f"PING失败: {e}")
        print(f"❌ PING失败: {e}")

def cmd_recover(args: Optional[List[str]] = None) -> None:
    """输出恢复指令 - 心跳调用"""
    STALE_SECONDS = 1800  # 30分钟
    logger.debug("执行命令: recover")
    
    try:
        data = load()
        task = data.get("active_task")
        
        # 优先恢复活跃任务
        if task and task["status"] in ("running", "interrupted"):
            # 检查是否是被动中断（running但长时间没更新）
            if task["status"] == "running" and task.get("updated_at"):
                try:
                    updated = datetime.strptime(
                        task["updated_at"], "%Y-%m-%dT%H:%M:%SZ"
                    )
                    updated = updated.replace(tzinfo=timezone.utc)
                    age = (datetime.now(timezone.utc) - updated).total_seconds()
                    
                    if age > STALE_SECONDS:
                        # 自动标记为被动中断
                        task["status"] = "interrupted"
                        task["interrupted_at"] = now()
                        task["interrupt_reason"] = f"被动中断检测: {int(age)}秒未更新"
                        save(data)
                        
                        logger.info(f"检测到被动中断: {task['id']}, {int(age)}秒未更新")
                        print("RECOVER:passive_interrupt")
                        print(json.dumps(task, ensure_ascii=False))
                        return
                except (ValueError, TypeError) as e:
                    logger.warning(f"解析时间失败: {task.get('updated_at')}, {e}")
            
            logger.info(f"恢复活跃任务: {task['id']}")
            print("RECOVER:active")
            print(json.dumps(task, ensure_ascii=False))
            return
        
        # 其次恢复最近的中断任务
        interrupted = [t for t in data.get("interrupted_tasks", [])
                       if t["status"] == "interrupted"]
        
        if interrupted:
            latest = interrupted[-1]
            logger.info(f"恢复中断任务: {latest['id']}")
            print("RECOVER:interrupted")
            print(json.dumps(latest, ensure_ascii=False))
            return
        
        logger.debug("无需要恢复的任务")
        print("RECOVER:none")
    except Exception as e:
        logger.error(f"恢复检查失败: {e}")
        print(f"❌ 恢复检查失败: {e}")

# === Main ===

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)
    
    cmd = sys.argv[1]
    args = sys.argv[2:]
    
    cmds: Dict[str, Any] = {
        "start": cmd_start,
        "update": cmd_update,
        "resume-info": cmd_resume_info,
        "progress": cmd_progress,
        "complete": cmd_complete,
        "interrupt": cmd_interrupt,
        "status": lambda a=None: cmd_status(a),
        "pending": lambda a=None: cmd_pending(a),
        "recover": lambda a=None: cmd_recover(a),
        "ping": lambda a=None: cmd_ping(a),
    }
    
    fn = cmds.get(cmd)
    if fn:
        fn(args) if args else fn()
    else:
        logger.warning(f"未知命令: {cmd}")
        print(f"未知命令: {cmd}")

if __name__ == "__main__":
    main()
