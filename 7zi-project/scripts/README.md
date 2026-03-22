# Windows 远程管理脚本集

用于从 Linux 远程管理 Windows 服务器，测试 7zi.com 网页界面。

## 脚本列表

| 脚本 | 用途 | 示例 |
|------|------|------|
| `setup-windows-remote.sh` | 配置检查 | `./setup-windows-remote.sh 192.168.1.100 Admin pass` |
| `connect-windows-ssh.sh` | SSH 连接 | `./connect-windows-ssh.sh 192.168.1.100 Admin pass` |
| `connect-windows-rdp.sh` | RDP 连接 | `./connect-windows-rdp.sh 192.168.1.100 Admin pass` |
| `test-web-windows.sh` | 网页测试 | `./test-web-windows.sh 192.168.1.100 Admin pass https://7zi.com` |

## 使用前准备

### Linux 端 (bot6)
```bash
# 安装必要工具
sudo apt install sshpass freerdp2-x11

# 赋予脚本执行权限
chmod +x ~/scripts/*.sh
```

### Windows 端
需要先配置:

1. **启用 OpenSSH Server**
```powershell
# PowerShell (管理员)
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'
```

2. **安装 Node.js**
- 下载: https://nodejs.org/

3. **安装 Playwright**
```cmd
npm install -g playwright
npx playwright install chromium
```

## 快速开始

```bash
# 1. 检查配置
./scripts/setup-windows-remote.sh <WIN_IP> <USER> <PASS>

# 2. SSH 连接
./scripts/connect-windows-ssh.sh <WIN_IP> <USER> <PASS>

# 3. 测试网页
./scripts/test-web-windows.sh <WIN_IP> <USER> <PASS> https://7zi.com
```

## 截图保存位置

- Windows: `C:\temp\screenshots\`
- Linux: `~/screenshots/`
