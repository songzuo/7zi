# good.7zi.com.service 故障修复报告

**修复时间**: 2026-03-30 11:40 CST (05:40 GMT+2)  
**服务器**: 165.99.43.61 (7zi.com)  
**执行者**: 🛡️ 系统管理员子代理

---

## 故障现象

```
Failed at step EXEC spawning /web/good/app-7yjgrzlwtatd/node_modules/.bin/taro: No such file or directory
```

服务每10秒重启一次，处于死循环状态。

---

## 问题根因

| 检查项            | 状态    | 说明                       |
| ----------------- | ------- | -------------------------- |
| Service 配置      | ✅ 正确 | ExecStart 路径配置正确     |
| WorkingDirectory  | ✅ 正确 | /web/good/app-7yjgrzlwtatd |
| node_modules 目录 | ❌ 缺失 | 目录不存在                 |
| taro 可执行文件   | ❌ 缺失 | 因 node_modules 不存在     |
| pnpm              | ✅ 可用 | v10.33.0                   |

**结论**: `node_modules` 目录被删除或从未正确安装，导致 `taro` 命令无法找到。

---

## 修复步骤

1. **SSH 连接到服务器**

   ```bash
   ssh root@165.99.43.61
   ```

2. **检查服务状态**

   ```bash
   systemctl status good.7zi.com.service
   ```

3. **检查应用目录**

   ```bash
   ls -la /web/good/app-7yjgrzlwtatd/
   # 发现 node_modules 目录不存在
   ```

4. **安装依赖**

   ```bash
   cd /web/good/app-7yjgrzlwtatd
   pnpm install
   ```

   - 安装时间: ~13.7秒
   - 状态: ✅ 成功

5. **验证 taro 命令**

   ```bash
   ls -la /web/good/app-7yjgrzlwtatd/node_modules/.bin/taro
   # -rwxr-xr-x 1 root root 1514 Mar 30 11:40 ...
   ```

6. **重启服务**
   ```bash
   systemctl restart good.7zi.com.service
   ```

---

## 修复结果

| 项目           | 状态                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------- |
| 服务状态       | ✅ **active (running)**                                                                             |
| 主进程 PID     | 3697215                                                                                             |
| 进程命令       | `node /web/good/app-7yjgrzlwtatd/node_modules/.bin/../@tarojs/cli/bin/taro build --type h5 --watch` |
| 监听端口       | 10087                                                                                               |
| 服务已稳定运行 | ✅ 17秒+ 无异常                                                                                     |

**服务已成功启动，监听在**: `http://165.99.43.61:10087/`

---

## 日志摘录

```
● good.7zi.com.service - good.7zi.com Website
     Loaded: loaded (/etc/systemd/system/good.7zi.com.service; enabled; vendor preset: enabled)
     Active: active (running) since Mon 2026-03-30 11:40:40 CST; 17s ago
   Main PID: 3697215 (node)
      Tasks: 66 (limit: 9476)
     Memory: 221.7M
        CPU: 7.141s
```

```
👽 Taro v4.1.5
  ➜  Local:   http://localhost:10087/
  ➜  Network: http://165.99.43.61:10087/
```

---

## 后续建议

1. **定期检查 node_modules**: 确保依赖不被意外删除
2. **考虑使用 pnpm workspaces**: 如果有多个项目共享依赖
3. **添加监控**: 监控 `/web/good/app-7yjgrzlwtatd/node_modules` 目录存在性
4. **pnpm approve-builds**: 如需要运行 postinstall 脚本，执行 `pnpm approve-builds` 选择性允许

---

## 结论

✅ **故障已完全修复** - 服务正常运行，无需禁用。
