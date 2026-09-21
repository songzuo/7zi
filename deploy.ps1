# ============================================================
# SZSPD 一键部署脚本（Windows 本地）
# 用法：powershell -File deploy.ps1 ["提交信息"]
# 流程：git commit -> git push（触发服务器 post-receive hook 自动
#       解包 -> build -> 冒烟检查 -> pm2 restart，失败保护不重启）
# ============================================================
param([string]$Message = "")

$ErrorActionPreference = "Stop"
Set-Location "E:\hong\szspd-src"

# 1) 提交
if ((git status --short | Measure-Object -Line).Lines -gt 0) {
    $msg = if ($Message) { $Message } else { "auto-deploy: " + (Get-Date -Format "yyyy-MM-dd HH:mm") }
    git add -A | Out-Null
    git commit -m $msg | Out-Null
    Write-Host "[1/3] 已提交: $((git log --oneline -1))"
} else {
    Write-Host "[1/3] 无本地改动，直接推送"
}

# 2) 推送（触发服务器自动部署，等待 hook 完成）
Write-Host "[2/3] 推送中（服务器将自动 build + 冒烟 + restart，约 1-2 分钟）..."
git push deploy master 2>&1 | ForEach-Object { Write-Host $_ }
Write-Host "[3/3] 推送完成。部署结果见上方 remote: 输出（build 成功 + 冒烟全 200 即成功）"
