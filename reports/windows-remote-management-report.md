# Windows 远程管理方案研究报告

## 📋 概述

本报告研究从 Linux (bot6.szspd.cn) 远程管理 Windows 服务器的方案，用于测试 7zi.com 网页界面。

---

## 1️⃣ 远程连接方案对比

### 方案 A: RDP (Remote Desktop Protocol) ⭐ 推荐

**优点:**

- Windows 原生支持，无需额外安装
- 图形界面完整，操作直观
- 性能优秀，延迟低
- 支持剪贴板共享、文件传输

**缺点:**

- 需要图形环境 (或使用 headless 截图)
- Windows 需开启远程桌面

**Linux 客户端:**

```bash
# FreeRDP (推荐)
sudo apt install freerdp2-x11  # 或 freerdp3-x11

# 连接命令
xfreerdp /v:WINDOWS_IP /u:USERNAME /p:PASSWORD

# 常用参数
xfreerdp /v:192.168.1.100 /u:Admin /p:password123 \
  /w:1920 /h:1080 \
  +clipboard \
  /drive:share,/home/user/share  # 文件共享
```

**Windows 配置:**

```powershell
# PowerShell (管理员)
# 启用 RDP
Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -Name "fDenyTSConnections" -Value 0

# 允许防火墙
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"
```

---

### 方案 B: SSH (Windows OpenSSH Server) ⭐ 推荐

**优点:**

- 命令行操作，资源占用少
- 适合自动化脚本
- 支持端口转发、隧道
- Windows 10/11/Server 2019+ 内置

**缺点:**

- 无图形界面
- 需要熟悉 PowerShell/CMD

**Linux 客户端:**

```bash
# 已安装 sshpass，可直接使用
sshpass -p 'PASSWORD' ssh USERNAME@WINDOWS_IP

# 或配置密钥登录
ssh-keygen -t ed25519
ssh-copy-id USERNAME@WINDOWS_IP
```

**Windows 配置:**

```powershell
# PowerShell (管理员)
# 安装 OpenSSH Server
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

# 启动服务
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'

# 确认防火墙
New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

---

### 方案 C: VNC

**优点:**

- 跨平台通用
- 可远程查看桌面

**缺点:**

- 需要在 Windows 上安装 VNC Server
- 性能不如 RDP
- 安全性需要额外配置

**方案:**

```bash
# Linux 客户端
sudo apt install tigervnc-viewer
vncviewer WINDOWS_IP:5900

# Windows 需要安装: TightVNC, UltraVNC, RealVNC
```

---

### 方案 D: WinRM (Windows Remote Management)

**优点:**

- 原生 PowerShell 远程
- 适合批量管理
- 支持脚本自动化

**Linux 客户端:**

```bash
# 使用 pywinrm
pip install pywinrm

# Python 示例
import winrm
session = winrm.Session('WINDOWS_IP', auth=('user', 'pass'))
result = session.run_ps('Get-Process')
print(result.std_out)
```

---

## 2️⃣ 网页测试方案

### 方案 A: Playwright (Node.js) ⭐ 推荐

**优点:**

- 跨浏览器支持 (Chromium, Firefox, WebKit)
- 自动截图、录屏
- 支持无头模式
- API 简洁

**安装:**

```bash
# 安装 Playwright
npm install -g playwright
npx playwright install chromium

# 或项目内安装
npm init -y
npm install playwright
npx playwright install
```

**测试脚本示例:**

```javascript
const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({
    headless: true, // 无头模式
  })
  const page = await browser.newPage()

  // 访问网站
  await page.goto('https://7zi.com')

  // 截图
  await page.screenshot({ path: '7zi-homepage.png', fullPage: true })

  // 获取页面信息
  const title = await page.title()
  console.log('Page title:', title)

  // 测试登录 (如果有)
  // await page.fill('#username', 'user');
  // await page.fill('#password', 'pass');
  // await page.click('#login-button');

  await browser.close()
})()
```

---

### 方案 B: Puppeteer

**优点:**

- Google 官方维护
- 专注于 Chrome/Chromium
- 文档丰富

**安装:**

```bash
npm install puppeteer
```

---

### 方案 C: Selenium + WebDriver

**优点:**

- 成熟稳定
- 多语言支持
- 可远程执行

**缺点:**

- 配置复杂
- 需要 WebDriver

---

### 方案 D: 远程桌面截图

通过 RDP 连接后自动截图:

```bash
# 使用 FreeRDP 截图
xfreerdp /v:WINDOWS_IP /u:Admin /p:PASSWORD /clipboard

# 或在 Windows 上通过 SSH 执行截图命令
ssh Admin@WINDOWS_IP "powershell -c \"Add-Type -AssemblyName System.Windows.Forms; [Windows.Forms.SendKeys]::SendWait('{PRTSC}')\""
```

---

## 3️⃣ 推荐实施方案

### 🎯 最佳方案: SSH + Playwright (远程执行)

**架构:**

```
Linux (bot6) --SSH--> Windows Server --Playwright--> 7zi.com
                              |
                              v
                         截图/日志
                              |
                              v
                      SCP 回传到 bot6
```

**步骤:**

1. **Windows 配置:**
   - 启用 OpenSSH Server
   - 安装 Node.js + Playwright

2. **Linux 自动化脚本:**

```bash
#!/bin/bash
# test-7zi.sh - 自动化测试脚本

WIN_HOST="WINDOWS_IP"
WIN_USER="Administrator"
WIN_PASS="password"

# 1. 上传测试脚本
sshpass -p "$WIN_PASS" scp test-7zi.js ${WIN_USER}@${WIN_HOST}:C:/temp/

# 2. 执行测试
sshpass -p "$WIN_PASS" ssh ${WIN_USER}@${WIN_HOST} "cd C:/temp && node test-7zi.js"

# 3. 下载截图
sshpass -p "$WIN_PASS" scp ${WIN_USER}@${WIN_HOST}:C:/temp/screenshots/* ./screenshots/
```

---

### 🔄 备选方案: 本地 Playwright (如果 Windows 网络可达)

如果 Windows 只是测试目标，而不是必须从 Windows 执行:

```bash
# 直接在 bot6 上运行 Playwright 测试 7zi.com
npx playwright test --project=chromium
```

---

## 4️⃣ 连接脚本

### 脚本 1: Windows SSH 连接

```bash
#!/bin/bash
# ~/scripts/connect-windows.sh

WIN_HOST="${1:-165.99.43.61}"  # 默认 7zi.com 或 Windows IP
WIN_USER="${2:-Administrator}"
WIN_PASS="${3:-}"

if [ -z "$WIN_PASS" ]; then
    echo "Usage: $0 <host> <user> <password>"
    exit 1
fi

echo "Connecting to Windows: $WIN_HOST"
sshpass -p "$WIN_PASS" ssh -o StrictHostKeyChecking=no "$WIN_USER@$WIN_HOST"
```

### 脚本 2: RDP 连接

```bash
#!/bin/bash
# ~/scripts/rdp-windows.sh

WIN_HOST="${1:-165.99.43.61}"
WIN_USER="${2:-Administrator}"
WIN_PASS="${3:-}"

if [ -z "$WIN_PASS" ]; then
    echo "Usage: $0 <host> <user> <password>"
    exit 1
fi

echo "Connecting via RDP to: $WIN_HOST"
xfreerdp /v:"$WIN_HOST" /u:"$WIN_USER" /p:"$WIN_PASS" /w:1920 /h:1080 +clipboard
```

### 脚本 3: 自动化网页测试

```bash
#!/bin/bash
# ~/scripts/test-web-windows.sh

WIN_HOST="$1"
WIN_USER="$2"
WIN_PASS="$3"
TEST_URL="${4:-https://7zi.com}"

# 创建临时测试脚本
cat > /tmp/test-web.js << 'EOF'
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(process.env.TEST_URL || 'https://7zi.com');
  await page.screenshot({ path: 'C:/temp/screenshot.png', fullPage: true });

  console.log('Title:', await page.title());
  console.log('URL:', page.url());

  await browser.close();
})();
EOF

# 上传并执行
echo "Testing $TEST_URL on Windows..."
sshpass -p "$WIN_PASS" scp /tmp/test-web.js ${WIN_USER}@${WIN_HOST}:C:/temp/
sshpass -p "$WIN_PASS" ssh ${WIN_USER}@${WIN_HOST} "cd C:/temp && TEST_URL=$TEST_URL node test-web.js"

# 下载截图
mkdir -p ~/screenshots
sshpass -p "$WIN_PASS" scp ${WIN_USER}@${WIN_HOST}:C:/temp/screenshot.png ~/screenshots/$(date +%Y%m%d_%H%M%S).png

echo "Screenshot saved to ~/screenshots/"
```

---

## 5️⃣ Windows 准备清单

主人提供 Windows 服务器后，需要确认:

### ✅ 必需配置

- [ ] **启用 OpenSSH Server**

  ```powershell
  Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
  Start-Service sshd
  Set-Service -Name sshd -StartupType 'Automatic'
  ```

- [ ] **安装 Node.js**
  - 下载: https://nodejs.org/
  - 或使用 Chocolatey: `choco install nodejs`

- [ ] **安装 Playwright**
  ```cmd
  npm install -g playwright
  npx playwright install chromium
  ```

### 📋 可选配置

- [ ] **启用 RDP** (如需图形界面)
- [ ] **配置防火墙规则** (开放 22/3389)
- [ ] **创建测试目录** `mkdir C:\temp`

---

## 6️⃣ 快速测试命令

```bash
# 测试 SSH 连接
sshpass -p 'PASSWORD' ssh Administrator@WINDOWS_IP "echo Connected!"

# 测试 Node.js
sshpass -p 'PASSWORD' ssh Administrator@WINDOWS_IP "node --version"

# 测试 Playwright
sshpass -p 'PASSWORD' ssh Administrator@WINDOWS_IP "npx playwright --version"

# 一键测试网页
sshpass -p 'PASSWORD' ssh Administrator@WINDOWS_IP "cd C:/temp && node test-7zi.js"
```

---

## 📊 方案总结

| 方案                      | 用途       | 复杂度 | 推荐度     |
| ------------------------- | ---------- | ------ | ---------- |
| **SSH**                   | 命令行管理 | ⭐     | ⭐⭐⭐⭐⭐ |
| **RDP**                   | 图形界面   | ⭐⭐   | ⭐⭐⭐⭐   |
| **Playwright on Windows** | 网页自动化 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **VNC**                   | 备用图形   | ⭐⭐⭐ | ⭐⭐       |

**最终推荐: SSH + Playwright 组合**

- 最轻量、最高效
- 适合自动化测试
- 易于脚本化

---

_报告生成时间: 2026-03-07_
_作者: 系统管理员子代理_
