# OpenClaw 版本发布说明

## 当前版本: 2026.3.2 (2026-03-03)

### 主要新功能

1. **Secrets/SecretRef 扩展**
   - 支持64个目标的用户凭据表面
   - 运行时收集器、planning/apply/audit流程
   - 未解析的引用在活跃表面快速失败

2. **PDF分析工具**
   - 原生Anthropic和Google PDF提供商支持
   - 可配置默认值: agents.defaults.pdfModel, pdfMaxBytesMb, pdfMaxPages

3. **MiniMax模型支持**
   - MiniMax-M2.5-highspeed一线支持
   - 保留旧版Lightning兼容性

4. **Telegram流式传输**
   - 默认启用 partial 模式
   - DM私密预览流式传输

5. **CLI配置验证**
   - 新增 `openclaw config validate` 命令
   - 启动时显示详细无效配置路径

### Breaking Changes (重要!)

1. **工具权限默认收窄**
   - 新安装默认 tools.profile = messaging (不再是 coding)
   - 新安装需显式配置才能获得广泛工具权限

2. **ACP调度默认启用**
   - acp.dispatch.enabled 默认为 true
   - 如需暂停ACP turn路由但保持控制，设置 acp.dispatch.enabled=false

3. **Plugin SDK变更**
   - 移除 api.registerHttpHandler(...)
   - 必须使用 api.registerHttpRoute({ path, auth, match, handler })

### 修复的问题

- 多个Telegram/Discord/Feishu相关bug修复
- Gateway安全加固
- 浏览器CDP启动诊断改进
- Docker/Kubernetes健康检查端点

---

## 版本升级注意事项

### 升级前检查清单
1. 运行 `openclaw config validate` 验证配置
2. 检查 Breaking Changes 部分
3. 备份配置文件
4. 查看完整发布说明

### 升级命令
```bash
openclaw update --yes
```

### 回滚(如需要)
```bash
openclaw update --channel <previous-channel>
# 或手动安装特定版本
```
