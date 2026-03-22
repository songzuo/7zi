# SSH 配置指南 - 7zi.com

## 问题
密码认证失败，需要配置 SSH 密钥。

## 本地 SSH 公钥
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKUyv7pPHVE5WJ9G7aWgUuXTivNZmJHm7uV9PSgcUpxM root@bot6
```

## 在 7zi.com 服务器上执行

```bash
# 1. 登录服务器（用密码）
ssh root@7zi.com
# 输入密码：ge20993344$ZZ

# 2. 创建 .ssh 目录
mkdir -p ~/.ssh

# 3. 添加公钥
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKUyv7pPHVE5WJ9G7aWgUuXTivNZmJHm7uV9PSgcUpxM root@bot6" >> ~/.ssh/authorized_keys

# 4. 设置权限
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# 5. 测试
exit
```

## 验证
```bash
ssh -i ~/.ssh/id_ed25519 root@7zi.com
```
应该免密登录成功！
