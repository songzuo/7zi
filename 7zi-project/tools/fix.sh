
#!/usr/bin/env python3
import subprocess
import time
import datetime

def log(msg):
    print(f"[{datetime.datetime.now().isoformat()}] {msg}")

def run(cmd):
    try:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return (res.returncode == 0, res.stdout, res.stderr)
    except Exception as e:
        return (False, '', str(e))

def repair():
    log("=== 快速修复 ===")
    
    # 重启SSH
    ssh_ok, _, _ = run("systemctl status sshd")
    if "active (running)" not in ssh_ok:
        log("重启SSH服务")
        run("systemctl restart sshd")
        time.sleep(2)
    
    log("=== 完成 ===")

if __name__ == "__main__":
    repair()

