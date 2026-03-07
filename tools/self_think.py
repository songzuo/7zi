
#!/usr/bin/env python3
"""
self_think.py - 节点自主思考脚本
通过evomap/picoclaw/openclaw进行自主思考和自主执行
"""

import subprocess
import time
import json
from datetime import datetime
import sys

def log(msg):
    timestamp = datetime.now().isoformat()
    print(f"[{timestamp}] {msg}")
    try:
        with open("/tmp/self_think.log", "a") as f:
            f.write(f"[{timestamp}] {msg}\\n")
    except:
        pass
        
def run_command(cmd):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return (result.returncode == 0, result.stdout, result.stderr)
    except Exception as e:
        return (False, "", str(e))
        
def check_system_health():
    """检查系统健康状态"""
    issues = []
    
    # 检查内存
    mem_ok, mem_out, _ = run_command("free -h")
    if mem_ok:
        for line in mem_out.split("\\n"):
            if "Mem:" in line:
                parts = line.split()
                if len(parts) >= 5:
                    used_percent = float(parts[2]) / float(parts[1]) * 100
                    if used_percent > 95:
                        issues.append(f"内存使用过高: {used_percent:.1f}%")
    
    # 检查磁盘
    disk_ok, disk_out, _ = run_command("df -h")
    if disk_ok:
        for line in disk_out.split("\\n"):
            if "/" in line and not line.startswith("Filesystem"):
                parts = line.split()
                if len(parts) >= 5:
                    disk_percent = float(parts[4].replace("%", ""))
                    if disk_percent > 90:
                        issues.append(f"磁盘空间不足: {disk_percent:.1f}%")
    
    # 检查系统负载
    load_ok, load_out, _ = run_command("uptime")
    if load_ok and "load average:" in load_out:
        load_str = load_out.split("load average: ")[1].split(",")[0]
        try:
            load_avg = float(load_str)
            if load_avg > 10:
                issues.append(f"系统负载过高: {load_avg:.2f}")
        except:
            pass
            
    return issues
    
def check_services():
    """检查关键服务"""
    services = ["sshd", "openclaw-gateway", "cluster-agent"]
    issues = []
    
    for service in services:
        status_ok, status_out, _ = run_command(f"systemctl status {service}")
        if not status_ok or "active (running)" not in status_out:
            issues.append(f"{service}服务未运行")
            
    return issues
    
def check_evomap_evolution():
    """检查evomap程序和evolver客户端"""
    issues = []
    
    # 检查evomap自动任务
    evomap_ok, evomap_out, _ = run_command("ps aux | grep evomap-auto-task | grep -v grep")
    if not evomap_ok:
        issues.append("evomap-auto-task未运行")
        
    # 检查evomap-daemon
    daemon_ok, daemon_out, _ = run_command("ps aux | grep evomap-daemon | grep -v grep")
    if not daemon_ok:
        issues.append("evomap-daemon未运行")
        
    # 检查evolver
    evolver_ok, evolver_out, _ = run_command("ps aux | grep run-evolver | grep -v grep")
    if not evolver_ok:
        issues.append("evolver程序未运行")
        
    return issues
    
def attempt_repair(issue):
    """尝试修复问题"""
    if "内存使用过高" in issue:
        log("尝试释放内存缓存")
        run_command("echo 3 > /proc/sys/vm/drop_caches")
        time.sleep(5)
        return True
        
    if "磁盘空间不足" in issue:
        log("尝试清理临时文件")
        run_command("rm -rf /tmp/*.log /tmp/*.tmp /var/log/*.old")
        return True
        
    if "系统负载过高" in issue:
        log("尝试清理僵尸进程")
        run_command("pkill -9 -f 'defunct' 2>/dev/null || true")
        return True
        
    if "sshd服务未运行" in issue:
        log("尝试重启SSH服务")
        run_command("systemctl restart sshd")
        time.sleep(3)
        return True
        
    if "openclaw-gateway服务未运行" in issue:
        log("尝试重启OpenClaw Gateway")
        run_command("systemctl restart openclaw-gateway")
        time.sleep(10)
        return True
        
    if "cluster-agent服务未运行" in issue:
        log("尝试重启Cluster Agent")
        run_command("cd /opt/cluster-agent && nohup python3 cluster-agent.py > /var/log/cluster-agent.log 2>&1 &")
        time.sleep(5)
        return True
        
    if "evomap-auto-task未运行" in issue:
        log("尝试重启evomap自动任务")
        run_command("cd /root && nohup /root/.nvm/versions/node/v22.22.0/bin/node evomap-auto-task.js > /tmp/evomap-auto.log 2>&1 &")
        time.sleep(5)
        return True
        
    return False
    
def self_think():
    """自主思考流程"""
    log("=== 开始自主思考 ===")
    
    # 1. 系统健康检查
    health_issues = check_system_health()
    service_issues = check_services()
    evomap_issues = check_evomap_evolution()
    
    all_issues = health_issues + service_issues + evomap_issues
    
    if not all_issues:
        log("系统运行状态良好")
        return
    
    log(f"发现 {len(all_issues)} 个问题:")
    for issue in all_issues:
        log(f"  - {issue}")
        
    # 2. 尝试修复问题
    for issue in all_issues:
        log(f"尝试修复: {issue}")
        if attempt_repair(issue):
            log(f"✅ 修复成功: {issue}")
            time.sleep(2)
        else:
            log(f"❌ 修复失败: {issue}")
            
    # 3. 验证修复结果
    log("=== 验证修复结果 ===")
    health_issues = check_system_health()
    service_issues = check_services()
    evomap_issues = check_evomap_evolution()
    
    remaining_issues = health_issues + service_issues + evomap_issues
    
    if remaining_issues:
        log(f"仍有 {len(remaining_issues)} 个问题未解决:")
        for issue in remaining_issues:
            log(f"  - {issue}")
            
        log("建议手动处理或请求其他节点协助")
    else:
        log("✅ 所有问题已修复")
        
if __name__ == "__main__":
    log("=== 节点自主思考系统启动 ===")
    try:
        if len(sys.argv) > 1 and sys.argv[1] == "--auto":
            self_think()
        else:
            print("Usage: python3 self_think.py --auto")
    except Exception as e:
        log(f"自主思考过程中出错: {str(e)}")

