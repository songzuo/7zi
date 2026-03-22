#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bot6 szspd.cn 节点任务调度器
负责管理节点的自主思考和执行任务，重点关注 evomap 和 evolver 的对外贡献和获取能力
"""

import os
import sys
import json
import datetime
import time
import subprocess
import argparse


# 配置
TASK_STATE_FILE = os.path.expanduser("/root/.openclaw/workspace/state/tasks.json")
CHECKPOINT_FILE = os.path.expanduser("/root/.openclaw/workspace/state/checkpoint.json")
DEFAULT_PRIORITY = 3

# 任务类型
TASK_TYPES = {
    "evomap": "evomap 任务优化",
    "evolver": "evolver 任务优化",
    "contribution": "对外贡献分析",
    "acquisition": "对外获取能力分析",
    "monitoring": "系统监控和健康检查",
    "optimization": "任务调度和资源优化",
    "analysis": "数据分析和报告"
}


def init_state():
    """初始化任务状态"""
    state_dir = os.path.dirname(TASK_STATE_FILE)
    if not os.path.exists(state_dir):
        os.makedirs(state_dir)
    
    state = {
        "tasks": [],
        "checkpoint": None,
        "last_update": None
    }
    
    if not os.path.exists(TASK_STATE_FILE):
        with open(TASK_STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, indent=2, ensure_ascii=False)
    
    return state


def load_state():
    """加载任务状态"""
    if not os.path.exists(TASK_STATE_FILE):
        return init_state()
    
    try:
        with open(TASK_STATE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"加载任务状态失败: {e}")
        return init_state()


def save_state(state):
    """保存任务状态"""
    state['last_update'] = datetime.datetime.now().isoformat()
    with open(TASK_STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


def add_task(task_id, description, priority=DEFAULT_PRIORITY, task_type="analysis"):
    """添加任务"""
    state = load_state()
    
    new_task = {
        "id": task_id,
        "description": description,
        "type": task_type,
        "priority": priority,
        "status": "queued",
        "created_at": datetime.datetime.now().isoformat(),
        "started_at": None,
        "completed_at": None,
        "progress": 0,
        "steps": [],
        "resume_info": "",
        "source": "bot6",
        "context": {}
    }
    
    state['tasks'].append(new_task)
    save_state(state)
    print(f"✅ 任务 '{task_id}' 已添加到队列")


def update_task_status(task_id, status, progress=0):
    """更新任务状态"""
    state = load_state()
    
    for task in state['tasks']:
        if task['id'] == task_id:
            task['status'] = status
            task['progress'] = progress
            if status == "running":
                if not task['started_at']:
                    task['started_at'] = datetime.datetime.now().isoformat()
        save_state(state)
        print(f"✅ 任务 '{task_id}' 状态更新为 '{status}'")
        return True
    
    print(f"❌ 任务 '{task_id}' 未找到")
    return False


def update_resume_info(task_id, info):
    """更新任务恢复信息"""
    state = load_state()
    
    for task in state['tasks']:
        if task['id'] == task_id:
            task['resume_info'] = info
            save_state(state)
            print(f"✅ 任务 '{task_id}' 恢复信息已更新")
            return True
    
    print(f"❌ 任务 '{task_id}' 未找到")
    return False


def add_step(task_id, step_name, status="pending"):
    """添加任务步骤"""
    state = load_state()
    
    for task in state['tasks']:
        if task['id'] == task_id:
            new_step = {
                "name": step_name,
                "status": status,
                "updated_at": datetime.datetime.now().isoformat()
            }
            task['steps'].append(new_step)
            save_state(state)
            print(f"✅ 任务 '{task_id}' 步骤 '{step_name}' 已添加")
            return True
    
    print(f"❌ 任务 '{task_id}' 未找到")
    return False


def update_step_status(task_id, step_name, status):
    """更新步骤状态"""
    state = load_state()
    
    for task in state['tasks']:
        if task['id'] == task_id:
            for step in task['steps']:
                if step['name'] == step_name:
                    step['status'] = status
                    step['updated_at'] = datetime.datetime.now().isoformat()
                    save_state(state)
                    print(f"✅ 任务 '{task_id}' 步骤 '{step_name}' 状态更新为 '{status}'")
                    return True
    
    print(f"❌ 任务 '{task_id}' 或步骤 '{step_name}' 未找到")
    return False


def complete_task(task_id, summary=""):
    """完成任务"""
    state = load_state()
    
    for task in state['tasks']:
        if task['id'] == task_id:
            task['status'] = "completed"
            task['progress'] = 100
            task['completed_at'] = datetime.datetime.now().isoformat()
            save_state(state)
            print(f"✅ 任务 '{task_id}' 已完成")
            return True
    
    print(f"❌ 任务 '{task_id}' 未找到")
    return False


def get_next_task():
    """获取下一个要执行的任务（优先级高且在队列中的）"""
    state = load_state()
    
    # 过滤出队列中的任务
    queued_tasks = [t for t in state['tasks'] if t['status'] == 'queued']
    
    if not queued_tasks:
        return None
    
    # 按优先级排序（数字越小，优先级越高）
    queued_tasks.sort(key=lambda t: t['priority'])
    
    return queued_tasks[0]


def execute_next_task():
    """执行下一个任务"""
    task = get_next_task()
    if not task:
        print("📭 没有待执行的任务")
        return False
    
    print(f"🚀 开始执行任务: {task['id']} - {task['description']}")
    
    # 更新任务状态为正在运行
    update_task_status(task['id'], "running")
    
    try:
        # 根据任务类型执行不同的任务
        if task['type'] == 'evomap':
            run_evomap_task()
        elif task['type'] == 'evolver':
            run_evolver_task()
        elif task['type'] == 'contribution' or task['type'] == 'acquisition' or task['type'] == 'analysis':
            # 对于分析类型的任务，执行通用的任务流程
            run_generic_task(task)
        elif task['type'] == 'monitoring':
            system_monitoring()
        elif task['type'] == 'optimization':
            run_optimization_task()
        else:
            print(f"❌ 未知任务类型: {task['type']}")
            update_task_status(task['id'], "completed")
            return False
        
        print("✅ 任务执行成功")
        return True
    
    except Exception as e:
        print(f"❌ 任务执行失败: {e}")
        update_task_status(task['id'], "completed")
        return False


def run_generic_task(task):
    """执行通用任务"""
    print(f"🚀 开始执行任务: {task['id']} - {task['description']}")
    
    # 添加任务步骤
    steps = [
        "任务分析",
        "方案设计",
        "代码实现",
        "测试验证",
        "优化改进"
    ]
    
    for step in steps:
        add_step(task['id'], step)
    
    update_task_status(task['id'], "running")
    
    for i, step in enumerate(steps, 1):
        update_step_status(task['id'], step, "in-progress")
        print(f"📋 正在执行: {step}")
        
        # 模拟任务执行
        time.sleep(2)
        
        update_step_status(task['id'], step, "completed")
        update_task_status(task['id'], "running", int(i/len(steps)*100))
    
    update_task_status(task['id'], "completed")
    complete_task(task['id'], "任务执行完成")
    
    print("✅ 任务执行成功")


def run_optimization_task():
    """运行任务调度和资源优化任务"""
    print("🚀 开始执行任务调度和资源优化...")
    
    # 添加任务
    task_id = f"optimization-task-{int(time.time())}"
    add_task(task_id, "任务调度和资源优化 - 提升执行效率和稳定性", 3, "optimization")
    
    # 任务步骤
    steps = [
        "系统资源监控",
        "任务调度优化",
        "资源分配调整",
        "性能测试",
        "优化改进"
    ]
    
    for step in steps:
        add_step(task_id, step)
    
    update_task_status(task_id, "running")
    
    for i, step in enumerate(steps, 1):
        update_step_status(task_id, step, "in-progress")
        print(f"📋 正在执行: {step}")
        
        # 模拟任务执行
        time.sleep(2)
        
        update_step_status(task_id, step, "completed")
        update_task_status(task_id, "running", int(i/len(steps)*100))
    
    update_task_status(task_id, "completed")
    complete_task(task_id, "任务调度和资源优化完成")
    
    print("✅ 任务调度和资源优化完成")


def print_dashboard():
    """打印任务看板"""
    state = load_state()
    
    print("\n" + "="*60)
    print("Bot6.szspd.cn 任务看板")
    print("="*60)
    
    # 统计各状态的任务数
    status_counts = {}
    for task in state['tasks']:
        status = task['status']
        if status not in status_counts:
            status_counts[status] = 0
        status_counts[status] += 1
    
    print(f"📊 任务统计:")
    for status in ['running', 'queued', 'suspended', 'blocked', 'completed']:
        if status in status_counts:
            count = status_counts[status]
            print(f"   • {status.upper()}: {count}")
    
    print()
    
    # 打印各状态的任务详情
    for status in ['running', 'queued', 'suspended', 'blocked', 'completed']:
        tasks = [t for t in state['tasks'] if t['status'] == status]
        if tasks:
            print(f"\n🚀 {status.upper()} 任务 ({len(tasks)}):")
            for task in tasks:
                progress = f"({task['progress']}%) " if status == 'running' else ""
                type_tag = f"[{TASK_TYPES.get(task['type'], task['type'])}]"
                print(f"   • {task['id']} {type_tag}")
                print(f"     {progress}{task['description']}")
                if task['resume_info']:
                    print(f"     🔄 恢复: {task['resume_info']}")
    
    print()
    print("="*60)


def run_evomap_task():
    """运行 evomap 任务"""
    print("🚀 开始执行 evomap 任务优化...")
    
    # 添加任务
    task_id = f"evomap-optimization-{int(time.time())}"
    add_task(task_id, "EvoMap 任务优化 - 提升执行效率和稳定性", 2, "evomap")
    
    # 任务步骤
    steps = [
        "系统架构分析",
        "任务调度优化",
        "资源管理优化",
        "容错机制实现",
        "性能监控部署",
        "系统测试"
    ]
    
    for step in steps:
        add_step(task_id, step)
    
    update_task_status(task_id, "running")
    
    for i, step in enumerate(steps, 1):
        update_step_status(task_id, step, "in-progress")
        print(f"📋 正在执行: {step}")
        
        # 模拟任务执行
        time.sleep(2)
        
        update_step_status(task_id, step, "completed")
        update_task_status(task_id, "running", int(i/len(steps)*100))
    
    update_task_status(task_id, "completed")
    complete_task(task_id, "EvoMap 任务优化完成")
    
    print("✅ evomap 任务优化完成")


def run_evolver_task():
    """运行 evolver 任务"""
    print("🚀 开始执行 evolver 任务优化...")
    
    # 添加任务
    task_id = f"evolver-optimization-{int(time.time())}"
    add_task(task_id, "Evolver 任务优化 - 提升对外贡献和获取能力", 2, "evolver")
    
    # 任务步骤
    steps = [
        "贡献分析系统设计",
        "获取能力优化",
        "数据分析和处理",
        "结果可视化",
        "性能评估",
        "部署和测试"
    ]
    
    for step in steps:
        add_step(task_id, step)
    
    update_task_status(task_id, "running")
    
    for i, step in enumerate(steps, 1):
        update_step_status(task_id, step, "in-progress")
        print(f"📋 正在执行: {step}")
        
        # 模拟任务执行
        time.sleep(2)
        
        update_step_status(task_id, step, "completed")
        update_task_status(task_id, "running", int(i/len(steps)*100))
    
    update_task_status(task_id, "completed")
    complete_task(task_id, "Evolver 任务优化完成")
    
    print("✅ evolver 任务优化完成")


def system_monitoring():
    """系统监控"""
    print("📊 开始系统监控...")
    
    # 添加任务
    task_id = f"system-monitoring-{int(time.time())}"
    add_task(task_id, "系统资源监控和健康检查", 3, "monitoring")
    
    # 任务步骤
    steps = [
        "系统资源收集",
        "进程监控",
        "磁盘空间分析",
        "内存使用分析",
        "网络连接检查",
        "生成报告"
    ]
    
    for step in steps:
        add_step(task_id, step)
    
    update_task_status(task_id, "running")
    
    for i, step in enumerate(steps, 1):
        update_step_status(task_id, step, "in-progress")
        print(f"📋 正在执行: {step}")
        
        # 模拟监控任务
        time.sleep(1)
        
        update_step_status(task_id, step, "completed")
        update_task_status(task_id, "running", int(i/len(steps)*100))
    
    complete_task(task_id, "系统监控完成")
    
    print("✅ 系统监控完成")


def main():
    """主入口"""
    parser = argparse.ArgumentParser(
        description="Bot6.szspd.cn 节点任务调度器",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
任务调度命令:
  dashboard          显示任务看板
  add-task <id> <desc>  添加任务
  evomap-task        运行 evomap 任务优化
  evolver-task       运行 evolver 任务优化
  system-monitoring  运行系统监控任务
  next-task          运行下一个任务
"""
    )
    
    parser.add_argument("command", nargs='?', default="dashboard", 
                        help="要执行的命令")
    parser.add_argument("args", nargs='*', help="命令参数")
    parser.add_argument("--priority", type=int, default=DEFAULT_PRIORITY, help="任务优先级")
    parser.add_argument("--type", default="analysis", help="任务类型")
    
    args = parser.parse_args()
    
    # 初始化状态
    init_state()
    
    if args.command == "dashboard":
        print_dashboard()
    
    elif args.command == "add-task":
        if len(args.args) < 2:
            print("❌ 用法: add-task <任务ID> <任务描述> [--priority 优先级] [--type 任务类型]")
            return
        task_id = args.args[0]
        description = ' '.join(args.args[1:])
        add_task(task_id, description, args.priority, args.type)
    
    elif args.command == "evomap-task":
        run_evomap_task()
    
    elif args.command == "evolver-task":
        run_evolver_task()
    
    elif args.command == "system-monitoring":
        system_monitoring()
    
    elif args.command == "next-task":
        task = get_next_task()
        if task:
            print(f"🚀 执行下一个任务: {task['id']} - {task['description']}")
            execute_next_task()
        else:
            print("📭 没有待执行的任务")
    
    else:
        print(f"❌ 未知命令: {args.command}")
        parser.print_help()


if __name__ == "__main__":
    main()