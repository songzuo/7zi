# SSH 问题诊断报告 - 7zi.com

## 问题
无法通过 SSH 连接到 7zi.com 和 bot5.szspd.cn

## 已尝试方案

| 方法 | 结果 | 备注 |
|------|------|------|
| sshpass + 单引号 | ❌ Permission denied | 密码可能被拒绝 |
| sshpass + 双引号 | ❌ Permission denied | $ 被 shell 解析 |
| SSH 密钥 | ❌ 未配置 | authorized_keys 为空 |
| expect 脚本 | ❌ Permission denied | 密码问题 |

## 诊断结果

1. ✅ 服务器可达 (ping 成功)
2. ✅ SSH 端口 22 开放
3. ✅ sshpass 已安装
4. ✅ expect 已安装
5. ❌ 密码 `ge20993344$ZZ` 被拒绝
6. ❌ authorized_keys 为空 (0 字节)

## 解决方案

### 方案 A: 验证正确密码
请主人提供 7zi.com 的正确 root 密码

### 方案 B: 配置 SSH 密钥
在 7zi.com 服务器上执行：
```bash
mkdir -p ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKUyv7pPHVE5WJ9G7aWgUuXTivNZmJHm7uV9PSgcUpxM root@bot6" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## SSH 公钥
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKUyv7pPHVE5WJ9G7aWgUuXTivNZmJHm7uV9PSgcUpxM root@bot6
```
