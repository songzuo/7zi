# OpenClaw 命令行参考

## 常用命令

### 版本和状态
```bash
openclaw --version          # 查看版本
openclaw status             # 查看运行状态
openclaw config schema     # 获取配置Schema
```

### 配置管理
```bash
openclaw config get                 # 获取当前配置
openclaw config get agents.defaults # 获取特定配置
openclaw config validate            # 验证配置文件
openclaw config validate --json    # JSON格式验证
openclaw config file                # 显示配置文件路径
```

### 更新管理
```bash
openclaw update status              # 检查更新状态
openclaw update --yes               # 执行更新
openclaw update --channel stable   # 切换更新频道
```

### Gateway管理
```bash
openclaw gateway start      # 启动
openclaw gateway stop      # 停止
openclaw gateway restart   # 重启
openclaw gateway status   # 状态
```

### 通道管理
```bash
openclaw channels list     # 列出通道
openclaw channels login   # 登录通道
```

## 重要: 更新频道

- **stable**: 稳定版 (默认)
- **beta**: 测试版
- **dev**: 开发版

## 配置文件校验

**重要**: 在执行任何配置修改前，务必运行:
```bash
openclaw config validate
```

这可以提前发现配置错误，避免Gateway启动失败。
