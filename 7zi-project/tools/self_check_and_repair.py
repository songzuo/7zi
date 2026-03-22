#!/usr/bin/env python3
"""
节点自我检查和修复脚本
用于在无法SSH连接的节点上进行自我诊断和自动修复
"""

import os
import sys
import subprocess
import json
import time
import datetime
import socket
import psutil


def log(msg):
    """简单日志记录"""
    timestamp = datetime.datetime.now().isoformat()
    log_entry = f"[{timestamp}] {msg}"
    print(log_entry)
    
    # 写入临时日志文件
    try:
        with open("/tmp/self-recovery.log", "a") as f:
            f.write(log_entry + "\n")
    except Exception as e:
        print(f"写入日志失败: {e}")


def run_command(cmd):
    """执行命令"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return (
            result.returncode == 0,
            result.stdout.strip(),
            result.stderr.strip()
        )
    except Exception as e:
        return (False, "", str(e))


def check_network_configuration():
    """检查网络配置"""
    log("检查网络配置")
    
    checks = []
    
    # 检查网络接口
    iface_ok, iface_output, _ = run_command("ip addr show")
    checks.append({
        "name": "网络接口",
        "ok": iface_ok,
        "details": iface_output.splitlines()[:3] if iface_ok else []
    })
    
    # 检查默认网关
    gw_ok, gw_output, _ = run_command("ip route show default")
    checks.append({
        "name": "默认网关",
        "ok": gw_ok and "default" in gw_output,
        "details": gw_output.split() if gw_ok else []
    })
    
    # 检查DNS配置
    dns_ok = os.path.exists("/etc/resolv.conf") and len(open("/etc/resolv.conf").read()) > 10
    checks.append({
        "name": "DNS配置",
        "ok": dns_ok,
        "details": []
    })
    
    return checks


def check_system_resources():
    """检查系统资源"""
    log("检查系统资源")
    
    checks = []
    
    # 检查内存使用
    try:
        mem_percent = psutil.virtual_memory().percent
        checks.append({
            "name": "内存使用",
            "ok": mem_percent < 95,
            "details": f"{mem_percent:.1f}%"
        })
    except Exception as e:
        checks.append({
            "name": "内存使用",
            "ok": False,
            "details": str(e)
        })
    
    # 检查磁盘空间
    try:
        disk_percent = psutil.disk_usage("/").percent
        checks.append({
            "name": "磁盘空间",
            "ok": disk_percent < 90,
            "details": f"{disk_percent:.1f}%"
        })
    except Exception as e:
        checks.append({
            "name": "磁盘空间",
            "ok": False,
            "details": str(e)
        })
    
    # 检查CPU负载
    try:
        load_avg = os.getloadavg()[0]
        cpu_count = psutil.cpu_count()
        load_per_core = load_avg / cpu_count
        checks.append({
            "name": "CPU负载",
            "ok": load_per_core < 10,
            "details": f"{load_avg:.2f}"
        })
    except Exception as e:
        checks.append({
            "name": "CPU负载",
            "ok": False,
            "details": str(e)
        })
    
    return checks


def check_system_services():
    """检查系统服务"""
    log("检查系统服务")
    
    checks = []
    
    # 检查SSH服务
    ssh_ok, ssh_output, _ = run_command("systemctl status sshd")
    ssh_running = "active (running)" in ssh_output if ssh_ok else False
    
    checks.append({
        "name": "SSH服务",
        "ok": ssh_ok and ssh_running,
        "details": "running" if ssh_running else "stopped"
    })
    
    # 检查网络服务
    network_ok, network_output, _ = run_command("systemctl status network || systemctl status NetworkManager")
    network_running = "active (running)" in network_output if network_ok else False
    
    checks.append({
        "name": "网络服务",
        "ok": network_ok and network_running,
        "details": "running" if network_running else "stopped"
    })
    
    return checks


def perform_self_check():
    """执行完整的自我检查"""
    log("=== 开始自我检查 ===")
    
    checks = {
        "network": check_network_configuration(),
        "resources": check_system_resources(),
        "services": check_system_services()
    }
    
    issues = []
    
    # 收集所有问题
    for category, items in checks.items():
        for item in items:
            if not item["ok"]:
                issues.append(f"[{category}] {item['name']}: {item['details']}")
    
    log(f"检查完成，发现 {len(issues)} 个问题")
    
    return issues


def attempt_repair(issues):
    """尝试修复问题"""
    log("=== 开始自动修复 ===")
    
    repairs = []
    
    for issue in issues:
        log(f"尝试修复问题: {issue}")
        
        # 修复SSH服务问题
        if "SSH服务" in issue:
            log("重启SSH服务")
            ssh_ok, _, _ = run_command("systemctl restart sshd")
            time.sleep(3)
            
            if ssh_ok:
                repairs.append("SSH服务已重启")
            else:
                repairs.append("SSH服务重启失败")
        
        # 修复网络服务问题
        elif "网络服务" in issue:
            log("重启网络服务")
            network_ok, _, _ = run_command("systemctl restart network || systemctl restart NetworkManager")
            time.sleep(5)
            
            if network_ok:
                repairs.append("网络服务已重启")
            else:
                repairs.append("网络服务重启失败")
        
        # 修复内存问题
        elif "内存使用" in issue and float(issue.split()[-1].rstrip('%')) > 95:
            log("清理内存缓存")
            mem_ok, _, _ = run_command("echo 3 > /proc/sys/vm/drop_caches")
            time.sleep(2)
            
            if mem_ok:
                repairs.append("内存缓存已清理")
            else:
                repairs.append("内存缓存清理失败")
        
        # 修复磁盘空间问题
        elif "磁盘空间" in issue and float(issue.split()[-1].rstrip('%')) > 90:
            log("清理临时文件")
            disk_ok, _, _ = run_command("rm -rf /tmp/*.log /tmp/*.tmp /var/log/*.old")
            time.sleep(2)
            
            if disk_ok:
                repairs.append("临时文件已清理")
            else:
                repairs.append("临时文件清理失败")
        
        # 修复网络配置问题
        elif "网络配置" in issue:
            log("检查网络接口")
            network_ok, _, _ = run_command("systemctl restart network || true")
            time.sleep(3)
            
            if network_ok:
                repairs.append("网络配置已重置")
            else:
                repairs.append("网络配置重置失败")
    
    log(f"修复完成，已修复 {len(repairs)} 个问题")
    
    return repairs


def verify_recovery():
    """验证修复结果"""
    log("=== 验证修复结果 ===")
    
    # 等待服务启动
    time.sleep(10)
    
    # 重新检查
    issues = perform_self_check()
    
    if len(issues) == 0:
        log("修复验证通过")
        return True
    else:
        log(f"修复验证失败，仍有 {len(issues)} 个问题")
        for issue in issues:
            log(f"  - {issue}")
        
        return False


def report_recovery_status():
    """报告恢复状态"""
    status = {
        "timestamp": datetime.datetime.now().isoformat(),
        "hostname": socket.gethostname(),
        "status": "success",
        "issues": perform_self_check()
    }
    
    # 写入本地报告
    report_file = "/tmp/recovery-report.json"
    try:
        with open(report_file, "w") as f:
            json.dump(status, f, indent=2)
    except Exception as e:
        log(f"写入报告失败: {e}")
    
    # 发送到集群管理器（如果可用）
    try:
        import requests
        response = requests.post("http://bot3.szspd.cn:18789/api/recovery", 
                               json=status, timeout=10)
        
        if response.status_code == 200:
            log("恢复报告已发送到集群管理器")
    except Exception as e:
        log(f"发送报告失败: {e}")


def self_recovery():
    """完整的自我恢复过程"""
    log("=== 启动节点自我恢复 ===")
    
    # 1. 执行自我检查
    issues = perform_self_check()
    
    if len(issues) == 0:
        log("系统状态良好，无需修复")
        report_recovery_status()
        return True
    
    # 2. 尝试修复
    repairs = attempt_repair(issues)
    
    # 3. 验证修复结果
    recovery_success = verify_recovery()
    
    # 4. 报告恢复状态
    report_recovery_status()
    
    return recovery_success


if __name__ == "__main__":
    log("=== 节点自我恢复系统启动 ===")
    
    # 检查是否应该执行自我检查
    should_recover = "--auto-repair" in sys.argv or "--repair" in sys.argv
    
    if should_recover:
        success = self_recovery()
        
        if success:
            log("自我恢复成功")
            sys.exit(0)
        else:
            log("自我恢复失败")
            sys.exit(1)
    else:
        log("未指定 --auto-repair 或 --repair，只执行检查")
        issues = perform_self_check()
        
        for issue in issues:
            log(f"❌ {issue}")
        
        if issues:
            log("系统存在问题，需要修复")
            sys.exit(1)
        else:
            log("系统状态良好")
            sys.exit(0)
