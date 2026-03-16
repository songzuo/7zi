## 项目工具使用指南

### 1. 测试工具
#### test_imported_tools.py
```bash
python3 /root/.openclaw/workspace/tools/test_imported_tools.py
```
- 测试所有导入工具的语法正确性
- 检查脚本的可执行权限
- 生成详细的测试报告

#### test-shell-syntax.sh
```bash
bash /root/.openclaw/workspace/scripts/test-shell-syntax.sh
```
- 专门测试Shell脚本的语法
- 快速检查脚本错误

### 2. 快速检查工具
#### quick_node_check.py
```bash
python3 /root/.openclaw/workspace/tools/quick_node_check.py
```
- 快速检查节点连通性
- 测试系统主要组件
- 输出简明的检查结果

### 3. 核心工具类

#### 7-node-parallel-executor.py
- 7节点并行执行器
- 支持并行执行和任务分发

#### cloud-api-rebooter.py
- 云API重启工具
- 可以通过云API重启节点

#### cluster-coordinator-api.py
- 集群协调API
- 提供统一的接口管理节点

#### cross-node-task-scheduler.py
- 跨节点任务调度器
- 支持节点间的任务调度

#### fail2ban-configurator.py
- Fail2Ban配置器
- 配置和管理Fail2Ban防护

#### heartbeat-manager.py
- 心跳管理器
- 管理节点间的心跳通信

#### multi-node-developer.py
- 多节点开发者
- 支持多节点同时开发和测试

#### node-watchdog.py
- 节点监控程序
- 持续监控节点健康状态

#### parallel-execution-engine.py
- 并行执行引擎
- 优化并行计算性能

#### security-audit-system.py
- 安全审计系统
- 评估节点安全状态

#### sprint-task-manager.py
- 冲刺任务管理器
- 管理项目开发任务

#### system-optimizer.py
- 系统优化器
- 优化节点资源使用

#### telegram-notifier.py
- Telegram通知器
- 通过Telegram发送通知

#### wireguard-vpn-configurator.py
- WireGuard VPN配置器
- 配置和管理VPN连接

### 4. 核心脚本类

#### cluster-autonomous.py
- 集群自主管理
- 自动管理整个集群的运行

#### node-agent.py
- 节点代理
- 在节点上运行，提供代理服务

#### remote-reboot-manager.py
- 远程重启管理器
- 管理节点的远程重启

#### self-healing.sh
- 自我修复脚本
- 自动检测和修复常见问题

#### self-healing-true-autonomous.sh
- 真正的自主修复脚本
- 更高级的自主修复功能

#### self-driving-system.sh
- 自动驾驶系统
- 完全自主管理节点

#### monitor-tasks.sh
- 任务监控
- 监控后台任务的运行状态

#### health-checker.sh
- 健康检查
- 定期检查节点健康状态

#### cluster-check.sh
- 集群检查
- 整体检查集群状态

#### check-nodes.sh
- 节点检查
- 详细检查每个节点

#### check-nodes-fast.sh
- 节点快速检查
- 快速检查节点连通性

### 注意事项
1. **权限问题**: 所有工具和脚本都需要root权限运行
2. **执行权限**: 确保文件具有可执行权限（chmod +x）
3. **依赖条件**: 某些工具可能需要特定的依赖库或软件包
4. **配置文件**: 某些工具可能需要配置文件或参数

### 工具更新和维护
- 如果工具需要更新，建议先测试后再投入使用
- 定期运行test_imported_tools.py进行语法检查
- 记录工具使用情况，以便优化和改进
