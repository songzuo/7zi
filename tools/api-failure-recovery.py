#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API端点限流故障响应机制 - 自动切换到其他API端点
当遇到限流时，自动识别故障条件并切换到其他可用的API端点
"""

import subprocess
import json
import time
import re
from datetime import datetime
import os


class APIFailureRecovery:
    """API故障恢复管理器"""
    
    # API端点优先级配置（根据稳定性和可用性排序）
    ENDPOINT_PRIORITIES = [
        "volcengine-2/doubao-seed-code",
        "volcengine/doubao-seed-code",
        "alibaba/qwen3.5-plus",
        "siliconflow/deepseek-ai/DeepSeek-V3.2",
        "newcli-aws/claude-opus-4-6",
        "bailian/qwen3.5-plus",
        "newcli-codex/gpt-5",
        "qiniu/qwen-turbo",
        "grok/grok-beta",
        "coze/glm-4-7",
        "openrouter/openrouter:free"
    ]
    
    # 限流错误模式识别
    RATE_LIMIT_PATTERNS = [
        r"server_busy",
        r"rate.*limit",
        r"quota.*exceeded",
        r"insufficient.*quota",
        r"too.*many.*requests",
        r"429.*too.*many.*requests",
        r"503.*service.*unavailable",
        r"timeout"
    ]
    
    # 配置文件路径
    CONFIG_PATH = "/root/.openclaw/openclaw.json"
    
    def __init__(self):
        self.current_model = None
        self.switch_history = []
        self.last_switch_time = 0
        self.min_switch_interval = 60  # 最小切换间隔（秒）
        
        # 加载当前配置
        self.load_config()
        
    def load_config(self):
        """加载当前模型配置"""
        try:
            with open(self.CONFIG_PATH, 'r', encoding='utf-8') as f:
                config = json.load(f)
            self.current_model = config.get("agents", {}).get("defaults", {}).get("model", {}).get("primary", "")
            print(f"当前主模型: {self.current_model}")
            return config
        except Exception as e:
            print(f"加载配置失败: {e}")
            return None
            
    def is_rate_limit_error(self, error_message):
        """判断是否为限流错误"""
        if not error_message:
            return False
            
        error_str = str(error_message).lower()
        
        for pattern in self.RATE_LIMIT_PATTERNS:
            if re.search(pattern, error_str):
                return True
                
        return False
        
    def get_next_available_endpoint(self):
        """获取下一个可用的API端点"""
        if not self.current_model:
            return self.ENDPOINT_PRIORITIES[0]
            
        current_index = -1
        
        # 查找当前模型的索引
        for i, endpoint in enumerate(self.ENDPOINT_PRIORITIES):
            if endpoint == self.current_model:
                current_index = i
                break
                
        # 获取下一个可用的端点
        if current_index >= 0 and current_index < len(self.ENDPOINT_PRIORITIES) - 1:
            return self.ENDPOINT_PRIORITIES[current_index + 1]
        else:
            return self.ENDPOINT_PRIORITIES[0]  # 循环到第一个
        
    def switch_model(self, target_model):
        """切换到指定的API端点"""
        current_time = time.time()
        
        # 检查最小切换间隔
        if current_time - self.last_switch_time < self.min_switch_interval:
            print(f"切换间隔过短，需要等待 {self.min_switch_interval - (current_time - self.last_switch_time):.1f} 秒")
            return False
            
        try:
            print(f"正在切换到模型: {target_model}")
            
            # 使用 openclaw models set 命令切换模型
            result = subprocess.run(
                ["openclaw", "models", "set", target_model],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                print("模型切换成功")
                self.last_switch_time = current_time
                self.switch_history.append({
                    "time": datetime.now().isoformat(),
                    "from": self.current_model,
                    "to": target_model,
                    "success": True,
                    "output": result.stdout
                })
                self.current_model = target_model
                return True
            else:
                print(f"模型切换失败: {result.stderr}")
                self.switch_history.append({
                    "time": datetime.now().isoformat(),
                    "from": self.current_model,
                    "to": target_model,
                    "success": False,
                    "error": result.stderr
                })
                return False
                
        except Exception as e:
            print(f"切换过程出错: {e}")
            self.switch_history.append({
                "time": datetime.now().isoformat(),
                "from": self.current_model,
                "to": target_model,
                "success": False,
                "error": str(e)
            })
            return False
            
    def handle_failure(self, error_message):
        """处理故障条件，根据错误类型决定是否切换端点"""
        if not self.is_rate_limit_error(error_message):
            print("未识别到限流错误，无需切换API端点")
            return False
            
        print(f"识别到限流错误: {error_message}")
        
        # 获取下一个可用的端点
        next_model = self.get_next_available_endpoint()
        
        if next_model == self.current_model:
            print("已使用最后一个可用的API端点，无法继续切换")
            return False
            
        return self.switch_model(next_model)
        
    def get_switch_history(self, limit=10):
        """获取切换历史记录"""
        return self.switch_history[-limit:]
        
    def get_available_endpoints(self):
        """获取可用的API端点列表"""
        return self.ENDPOINT_PRIORITIES.copy()
        
    def run_health_check(self):
        """运行健康检查，验证当前API端点的可用性"""
        try:
            # 使用简单的openclaw命令检查模型状态
            result = subprocess.run(
                ["openclaw", "models", "status"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            return {
                "success": True,
                "status": result.stdout,
                "current_model": self.current_model
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "current_model": self.current_model
            }
            
    def emergency_recovery(self):
        """紧急恢复机制 - 尝试多种方法恢复API访问"""
        print("启动紧急恢复机制...")
        
        # 尝试按优先级顺序切换到可用的端点
        for endpoint in self.ENDPOINT_PRIORITIES:
            if endpoint != self.current_model:
                print(f"尝试切换到: {endpoint}")
                if self.switch_model(endpoint):
                    print(f"紧急恢复成功，已切换到: {endpoint}")
                    return True
                time.sleep(2)
                
        print("所有API端点都不可用，紧急恢复失败")
        return False
        
    def auto_recovery_loop(self, max_attempts=3):
        """自动恢复循环 - 在限流条件下自动寻找可用的API端点"""
        attempt = 0
        
        while attempt < max_attempts:
            attempt += 1
            print(f"自动恢复尝试 {attempt}/{max_attempts}")
            
            # 检查当前API状态
            health = self.run_health_check()
            
            if health["success"]:
                print("API状态正常，无需恢复")
                return True
                
            # 尝试切换到下一个端点
            if self.handle_failure("API不可用，自动尝试恢复"):
                return True
                
            time.sleep(5)
            
        print("自动恢复失败，建议手动检查")
        return False


def main():
    """主函数 - 支持命令行参数"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="API端点限流故障响应机制"
    )
    
    parser.add_argument(
        "--auto-recovery",
        action="store_true",
        help="自动恢复模式 - 检测到限流时自动切换API端点"
    )
    
    parser.add_argument(
        "--error",
        help="直接指定限流错误信息，用于测试或手动触发"
    )
    
    parser.add_argument(
        "--switch-to",
        help="直接指定要切换的API端点"
    )
    
    parser.add_argument(
        "--health-check",
        action="store_true",
        help="只进行健康检查"
    )
    
    parser.add_argument(
        "--emergency-recovery",
        action="store_true",
        help="执行紧急恢复机制"
    )
    
    parser.add_argument(
        "--list-endpoints",
        action="store_true",
        help="列出所有可用的API端点及其优先级"
    )
    
    args = parser.parse_args()
    
    recovery = APIFailureRecovery()
    
    # 执行相应的操作
    if args.list_endpoints:
        print("=== 可用API端点列表 ===")
        for i, endpoint in enumerate(recovery.ENDPOINT_PRIORITIES, 1):
            is_current = "✓" if endpoint == recovery.current_model else " "
            print(f"{i}. [{is_current}] {endpoint}")
        return
        
    if args.health_check:
        print("=== 健康检查 ===")
        health = recovery.run_health_check()
        print(f"状态: {'✅ 正常' if health['success'] else '❌ 异常'}")
        if health['success']:
            print(f"当前API端点: {health['current_model']}")
            print(f"详细信息:\n{health['status']}")
        else:
            print(f"错误: {health['error']}")
        return
        
    if args.emergency_recovery:
        print("=== 紧急恢复 ===")
        if recovery.emergency_recovery():
            print("✅ 紧急恢复成功")
        else:
            print("❌ 紧急恢复失败")
        return
        
    if args.switch_to:
        print(f"=== 切换到指定API端点 ===")
        if recovery.switch_model(args.switch_to):
            print("✅ 切换成功")
        else:
            print("❌ 切换失败")
        return
        
    if args.auto_recovery or args.error:
        print("=== API端点故障响应 ===")
        
        if args.error:
            error_message = args.error
        else:
            # 自动检测限流错误
            error_message = "自动检测到限流错误"
            
        print(f"检测到错误: {error_message}")
        
        if recovery.handle_failure(error_message):
            print("✅ API端点切换成功")
            # 完成任务调度器状态更新
            if args.auto_recovery:
                try:
                    import subprocess
                    subprocess.run([
                        "python3", "/root/.openclaw/workspace/tools/task_scheduler.py",
                        "complete", "model-failure-recovery", 
                        f"已成功处理 '{error_message}' 错误，API端点已切换"
                    ], check=False)
                except Exception as e:
                    print(f"任务调度器状态更新失败: {e}")
        else:
            print("❌ API端点切换失败")
            # 更新任务调度器状态为阻塞
            if args.auto_recovery:
                try:
                    import subprocess
                    subprocess.run([
                        "python3", "/root/.openclaw/workspace/tools/task_scheduler.py",
                        "suspend", "model-failure-recovery", 
                        f"API端点切换失败，无法处理 '{error_message}' 错误"
                    ], check=False)
                except Exception as e:
                    print(f"任务调度器状态更新失败: {e}")
        return
        
    # 默认操作：显示信息
    print("=== API端点限流故障响应机制 ===")
    print(f"当前API端点: {recovery.current_model}")
    print(f"可用API端点数量: {len(recovery.ENDPOINT_PRIORITIES)}")
    
    # 显示健康状态
    health = recovery.run_health_check()
    print(f"健康状态: {'✅ 正常' if health['success'] else '❌ 异常'}")
    
    # 显示切换历史
    print("\n=== 切换历史 ===")
    history = recovery.get_switch_history()
    if history:
        for entry in history:
            status = "✅" if entry["success"] else "❌"
            print(f"{status} {entry['time']}")
            print(f"   从: {entry['from']}")
            print(f"   到: {entry['to']}")
            if "error" in entry:
                print(f"   错误: {entry['error']}")
    else:
        print("无切换历史")
        
    print("\n=== 故障响应机制已初始化 ===")
    print("当遇到限流错误时，系统会自动切换到下一个可用的API端点")
    

if __name__ == "__main__":
    main()
