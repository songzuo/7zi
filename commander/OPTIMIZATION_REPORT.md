# 代码优化报告

## 优化日期
2026-03-17

## 概述
本次优化对 commander 目录下的三个核心文件进行了功能增强和改进，主要围绕端口检查、SSH 工具和健康检查辅助函数进行了升级。

---

## 1. check_ports_unified.js 改进

### 新增功能

#### 1.1 JSON 输出模式 (--json / -j)
- 添加了 `--json` 命令行选项，支持机器可读的结构化 JSON 输出
- JSON 输出包含以下字段：
  - `timestamp`: 检查时间戳
  - `ports`: 端口监听信息数组
  - `processes`: Node.js 进程详细信息
  - `devProcesses`: 开发模式进程信息
  - `httpResponses`: HTTP 响应状态码
  - `titles`: 各端口网站标题
  - `errors`: 错误信息数组

#### 1.2 扩展端口检查范围
新增检查的端口：
- **5175, 5176, 5177, 5178, 5179**: Vite 开发服务器端口范围扩展
- **8080**: 常用 HTTP 备用端口
- **8888**: Jupyter 和其他服务常用端口
- **3004-3009**: 补充 3000 系列端口

#### 1.3 进程 CPU/内存占用显示
在检查 Node.js 和开发模式进程时，现在会解析并显示：
- `cpuPercent`: CPU 使用百分比
- `memoryPercent`: 内存使用百分比
- `vsz`: 虚拟内存大小（KB）
- `rss`: 常驻集大小（KB）
- `pid`: 进程 ID
- `user`: 进程所属用户
- `stat`: 进程状态
- `start`: 进程启动时间
- `command`: 完整命令行

#### 1.4 端口占用进程详细信息
在端口监听检查中，解析并记录：
- 端口号
- 占用该端口的进程 PID
- 进程名称（如 node、nginx、httpd 等）

#### 1.5 HTTP 响应测试扩展
HTTP 响应测试现在覆盖更多端口：
- 原: 3000, 3001, 3002, 3003, 3010, 5000
- 新增: 5173, 5174, 8080, 8888

#### 1.6 网站标题提取增强
标题提取现在支持更多端口：
- 原: 3000, 3002, 3003, 5000, 3010
- 新增: 3001, 5173, 5174, 8080

### 使用示例

```bash
# 快速端口检查（默认）
node check_ports_unified.js

# 完整检查（包括 HTTP 测试和标题）
node check_ports_unified.js --full

# 仅检查开发模式进程
node check_ports_unified.js --dev

# JSON 输出模式（机器可读）
node check_ports_unified.js --json
node check_ports_unified.js --full --json
```

---

## 2. utils/ssh_util.js 改进

### 新增功能

#### 2.1 颜色输出控制系统
- **setColorOutput(enabled)**: 启用或禁用彩色输出
- **isColorOutputEnabled()**: 检查颜色输出是否启用
- **colorize(text, colorName)**: 应用颜色到文本

支持的颜色：
- `reset`: 重置
- `bright`: 高亮
- `dim`: 暗色
- `red`: 红色（错误）
- `green`: 绿色（成功）
- `yellow`: 黄色（警告）
- `blue`: 蓝色（信息）
- `magenta`: 品红
- `cyan`: 青色
- `white`: 白色

颜色输出会自动检测 TTY 环境，在非 TTY 环境（如文件重定向）中自动禁用。

#### 2.2 增强的错误信息
错误信息现在包含：
- **基本错误**: 错误消息、错误代码、错误级别
- **连接详情**: 主机、端口、用户名
- **时间戳**: 错误发生时间
- **阶段信息**: 错误发生的阶段（connection、command execution）
- **建议信息**: 针对不同错误类型的解决建议

错误级别和对应建议：
- `client-authentication`: 检查 SSH 凭证（用户名、密码或私钥）
- `client-timeout`: 连接超时，检查网络连接和防火墙设置
- `ECONNREFUSED`: 连接被拒绝，验证服务器 SSH 服务是否运行
- `ENOTFOUND`: 主机未找到，检查主机名和 DNS 解析

#### 2.3 命令执行结果增强
`execCommand` 回调现在返回更详细的结果对象：
```javascript
{
  output: "标准输出",
  errorOutput: "标准错误输出",
  exitCode: 0,
  signal: null,
  command: "执行的命令",
  timestamp: "ISO 8601 时间戳",
  error: {
    message: "错误描述",
    exitCode: 非零退出码,
    signal: 终止信号,
    stderr: "错误输出内容"
  }
}
```

#### 2.4 新增 printInfo 函数
添加了信息级输出函数，用于显示一般信息，使用蓝色标识。

### 使用示例

```javascript
const { setColorOutput, printError, printSuccess, printInfo } = require('./utils/ssh_util');

// 禁用彩色输出（用于脚本或 CI/CD）
setColorOutput(false);

// 使用增强的打印函数
printHeader('系统检查');
printInfo('开始检查...');
printSuccess('检查完成');
printError('检查失败', new Error('连接超时'));
```

---

## 3. utils/check_helpers.js 改进

### 新增功能

#### 3.1 增强的 checkPorts 函数
新增参数和功能：
- **mode**: 检测模式
  - `quick`: 快速检查，只验证端口是否存在
  - `detailed`: 详细检查，包括进程信息
  - `process`: 仅进程信息
- **detailed**: 返回详细信息的布尔开关（等同于 mode='detailed'）
- **parsePortOutput**: 新增的端口输出解析函数

返回结构化数据：
```javascript
{
  raw: "原始命令输出",
  parsed: [
    {
      port: 3000,
      pid: 12345,
      processName: "node",
      fullLine: "完整的 ss/netstat 输出行"
    }
  ],
  ports: [3000, 5173],
  mode: "detailed",
  protocol: "tcp",
  timestamp: "ISO 8601 时间戳"
}
```

#### 3.2 增强的 checkProcess 函数
新增参数和功能：
- **detailed**: 返回详细信息，包括状态标志和资源使用情况
- **limit**: 限制返回结果数量（默认 30）
- **sortBy**: 排序字段
  - `cpu`: 按 CPU 使用率降序
  - `memory`: 按内存使用率降序
  - `pid`: 按 PID 升序

详细模式返回额外信息：
- **status**: 进程状态标志（running、sleeping、stopped、zombie 等）
- **resources**: 资源使用情况
  - `cpuPercent`: CPU 百分比
  - `memoryPercent`: 内存百分比
  - `memoryMB`: 内存使用量（MB）

#### 3.3 新增 healthCheck 函数
综合健康检查，支持多种检查模式和自定义检查项。

可用检查项：
- `ports`: 关键端口监听检查
- `processes`: Node.js 进程检查
- `disk`: 磁盘使用率检查
- `load`: 系统负载检查
- `pm2`: PM2 进程状态检查
- `memory`: 内存使用率检查

检查模式：
- `quick`: 快速检查（processes + load）
- `standard`: 标准检查（ports + processes + disk + load）
- `comprehensive`: 全面检查（所有检查项）

返回结构化数据：
```javascript
{
  overall: "healthy",  // overall: healthy | warning | critical | error
  timestamp: "ISO 8601 时间戳",
  mode: "standard",
  checks: [...],
  summary: {
    total: 4,
    healthy: 3,
    warning: 1,
    critical: 0,
    error: 0
  }
}
```

#### 3.4 新增 checkEndpoints 函数
检查多个服务端点的可达性。

参数：
- `endpoints`: 端点数组
  ```javascript
  [
    { port: 80, protocol: 'tcp' },
    { port: 443, protocol: 'tcp' },
    { port: 5173, protocol: 'tcp' }
  ]
  ```

返回结果：
```javascript
{
  endpoints: [
    {
      port: 80,
      protocol: "tcp",
      listening: true,
      status: "reachable",
      timestamp: "ISO 8601 时间戳"
    }
  ],
  summary: {
    total: 3,
    reachable: 2,
    unreachable: 1
  }
}
```

#### 3.5 新增 monitorCheck 函数
实时监控检查，支持多次采样和平均值计算。

参数：
- `interval`: 检查间隔（秒，默认 5）
- `count`: 检查次数（默认 5）

返回结果：
```javascript
{
  interval: 5,
  count: 5,
  samples: [
    {
      index: 1,
      timestamp: "ISO 8601 时间戳",
      load: { "1min": 0.5, "5min": 0.6, "15min": 0.7 }
    },
    ...
  ],
  average: {
    "1min": 0.52,
    "5min": 0.58,
    "15min": 0.65
  }
}
```

#### 3.6 新增 parsePortOutput 和 parseProcessOutput 函数
提供灵活的输出解析能力，支持不同的解析模式和详细程度。

### 使用示例

```javascript
const {
  checkPorts,
  checkProcess,
  healthCheck,
  checkEndpoints,
  monitorCheck,
  createConnection
} = require('./utils/check_helpers');

// 创建 SSH 连接
const { conn } = createConnection();

// 端口检查（详细模式）
const portResult = await checkPorts(conn, [80, 443, 3000, 5173], {
  mode: 'detailed',
  protocol: 'tcp'
});

// 进程检查（按内存排序，详细模式）
const processResult = await checkProcess(conn, 'node', {
  sortBy: 'memory',
  limit: 10,
  detailed: true
});

// 综合健康检查（标准模式）
const healthResult = await healthCheck(conn, { mode: 'standard' });

// 检查端点可达性
const endpointResult = await checkEndpoints(conn, [
  { port: 80, protocol: 'tcp' },
  { port: 443, protocol: 'tcp' },
  { port: 5173, protocol: 'tcp' }
]);

// 实时监控（每 5 秒检查一次，共 10 次）
const monitorResult = await monitorCheck(conn, {
  interval: 5,
  count: 10
});
```

---

## 总结

### 主要改进点

1. **更好的可读性**: 颜色输出和格式化信息提升用户体验
2. **更强的可维护性**: 结构化的返回数据便于后续处理
3. **更丰富的功能**: 新增多种检测模式和健康检查功能
4. **更好的错误处理**: 详细的错误信息和建议帮助快速定位问题
5. **更高的灵活性**: JSON 输出模式支持机器解析和自动化集成
6. **更全面的信息**: CPU/内存占用、进程状态、端点可达性等详细信息

### 向后兼容性

所有改进都保持了向后兼容性：
- 旧的 API 调用方式仍然有效
- 新增功能都是可选的，通过参数控制
- 默认行为与之前保持一致

### 性能影响

- JSON 模式会增加少量内存开销（用于存储结构化数据）
- 颜色输出在非 TTY 环境中自动禁用，不影响性能
- 详细模式会增加解析时间，但提供了更多信息

---

## 建议的后续改进

1. 添加性能基准测试，确保新增功能不会显著影响性能
2. 考虑添加日志记录功能，便于调试和审计
3. 可以添加配置文件支持，允许用户自定义默认值
4. 考虑添加缓存机制，减少重复检查的开销
