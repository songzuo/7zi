
#!/usr/bin/env python3
import subprocess
import time
import json
import datetime
import socket
import psutil

def log(msg):
    timestamp = datetime.datetime.now().isoformat()
    print(f"[{timestamp}] {msg}")
    try:
        with open("/tmp/self-repair.log", "a") as f:
            f.write(f"[{timestamp}] {msg}\n")
    except Exception as e:
        print(f"写入日志失败: {e}")

def run_command(cmd):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return (result.returncode == 0, result.stdout.strip(), result.stderr.strip())
    except Exception as e:
        return (False, "", str(e))

def check_health():
    log("=== 开始健康检查 ===")
    
    issues = []
    
    # 检查SSH服务
    ssh_ok, ssh_output, _ = run_command("systemctl status sshd")
    if "active (running)" not in ssh_output:
        issues.append("SSH服务未运行")
    
    # 检查内存使用
    try:
        mem_percent = psutil.virtual_memory().percent
        if mem_percent > 95:
            issues.append(f"内存使用过高: {mem_percent:.1f}%")
    except Exception as e:
        issues.append(f"内存检查失败: {e}")
    
    # 检查磁盘空间
    try:
        disk_percent = psutil.disk_usage("/").percent
        if disk_percent > 90:
            issues.append(f"磁盘空间不足: {disk_percent:.1f}%")
    except Exception as e:
        issues.append(f"磁盘检查失败: {e}")
    
    log(f"检查完成，发现 {len(issues)} 个问题")
    return issues

def repair_issues(issues):
    log("=== 开始自动修复 ===")
    
    repairs = []
    
    for issue in issues:
        log(f"尝试修复: {issue}")
        
        if "SSH服务未运行" in issue:
            success, _, _ = run_command("systemctl restart sshd")
            if success:
                repairs.append("SSH服务已重启")
                time.sleep(3)
        
        elif "内存使用过高" in issue:
            success, _, _ = run_command("echo 3 > /proc/sys/vm/drop_caches")
            if success:
                repairs.append("内存缓存已清理")
                time.sleep(2)
        
        elif "磁盘空间不足" in issue:
            success, _, _ = run_command("rm -rf /tmp/*.log /tmp/*.tmp /var/log/*.old")
            if success:
                repairs.append("临时文件已清理")
    
    log(f"修复完成，已修复 {len(repairs)} 个问题")
    return repairs

def verify_repair():
    log("=== 验证修复结果 ===")
    time.sleep(10)
    return check_health()

def report_status():
    status = {
        "timestamp": datetime.datetime.now().isoformat(),
        "hostname": socket.gethostname(),
        "status": "success",
        "issues": check_health(),
        "node_type": socket.gethostname()
    }
    
    report_file = "/tmp/health-report.json"
    try:
        with open(report_file, "w") as f:
            json.dump(status, f, indent=2)
    except Exception as e:
        log(f"写入报告失败: {e}")
    
    log("健康报告已保存到 /tmp/health-report.json")

def main():
    log("=== 节点自主修复系统启动 ===")
    
    issues = check_health()
    
    if issues:
        repairs = repair_issues(issues)
        remaining_issues = verify_repair()
        
        if remaining_issues:
            log("修复未完全成功，仍有问题:")
            for issue in remaining_issues:
                log(f"  - {issue}")
        else:
            log("所有问题已成功修复")
    else:
        log("系统状态良好，无需修复")
    
    report_status()

if __name__ == "__main__":
    main()

