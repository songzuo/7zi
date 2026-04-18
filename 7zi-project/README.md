# 7zi Multi-Agent System

[![Version](https://img.shields.io/badge/version-1.12.2-blue.svg)](https://github.com/7zi/7zi-multi-agent)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.9.3-blue.svg)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Test Coverage](https://img.shields.io/badge/coverage-66.16%25-orange.svg)](https://github.com/7zi/7zi-multi-agent)
[![Tests](https://img.shields.io/badge/tests-340%20passing-brightgreen.svg)](https://github.com/7zi/7zi-multi-agent)

A powerful multi-agent orchestration system for building intelligent, collaborative AI applications.

## ✨ Features

### 🤖 Multi-Agent Orchestration

- **Parallel Execution** - Run multiple agents simultaneously for faster results
- **Sequential Workflows** - Chain agents with dependency management
- **Dynamic Allocation** - Automatically assign tasks based on agent capabilities and load
- **Multiple Aggregation Strategies** - first, all, best, vote, or custom aggregation

### 📡 Agent-to-Agent Communication

- **A2A Protocol** - Robust message passing with request/response/notification/error types
- **Correlation Tracking** - Automatic request-response matching
- **Heartbeat & Timeout** - Built-in health monitoring
- **Transport Abstraction** - Support for in-memory, WebSocket, and future transports

### 🎯 Performance Monitoring

- **Incremental Anomaly Detection** - Welford's algorithm for O(1) updates
- **Streaming Isolation Forest** - Robust anomaly detection in real-time
- **Performance Metrics** - Success rate, latency, percentiles
- **Smart Alerting** - Slack-enhanced notifications

### 🔐 Multi-Tenant Architecture

- **Tenant Isolation** - Complete data and permission isolation per tenant
- **Tenant-Aware Caching** - Cache keys with tenant prefixes
- **Enhanced Permissions** - Role-based access control with tenant scoping
- **Audit Logging** - Complete audit trail for all operations

### ⚡ Workflow Engine v1.12

- **Visual Workflow Editor** - Drag-and-drop workflow design with enhanced node types
- **LoopNode** - Repetitive task execution with configurable iteration
- **SubworkflowNode** - Nested workflow calls for modular design
- **TransformNode** - Data mapping and transformation between nodes
- **NodeSearchPanel** - Quick node location and navigation
- **WorkflowExporter** - Import/export workflow definitions
- **AutoLayout Algorithm** - Automatic node arrangement
- **ExpressionEditor** - Dynamic expression support for workflows

### 📧 Email Alerting

- **SMTP Integration** - Send alerts via email with customizable templates
- **Alert Filtering** - Configure alert thresholds and conditions
- **Multiple Recipients** - Support for multiple notification recipients
- **Alert History** - Track and review sent alerts

### 🛠️ Developer Tools

- **TypeScript** - Full type safety and IntelliSense support
- **Comprehensive Testing** - 340+ test cases with 66%+ coverage
- **Resource Management** - Automatic cleanup and memory leak prevention
- **Plugin System** - Extensible architecture for custom agents

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/7zi/7zi-multi-agent.git
cd 7zi-multi-agent

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Basic Usage

```typescript
import { MultiAgentOrchestrator } from './src/lib/multi-agent'
import { AgentRegistry } from './src/lib/agents'

// Create an orchestrator
const orchestrator = new MultiAgentOrchestrator()

// Register agents
const registry = orchestrator.getRegistry()
registry.register({
  id: 'agent-1',
  name: 'Code Reviewer',
  capabilities: ['code-review', 'static-analysis'],
  status: 'active',
})

// Execute a task
const result = await orchestrator.executeParallel(
  ['agent-1'],
  {
    id: 'task-1',
    type: 'code-review',
    payload: { code: 'function example() {}' },
  },
  { aggregationStrategy: 'first' }
)

console.log(result)
```

## 📚 Documentation

### Core Modules

| Module                       | Description                                | Documentation                                                        |
| ---------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| **Multi-Agent Orchestrator** | Task orchestration and agent coordination  | [docs/multi-agent-orchestrator.md](docs/multi-agent-orchestrator.md) |
| **A2A Protocol**             | Agent-to-agent communication protocol      | [src/lib/a2a/README.md](src/lib/a2a/README.md)                       |
| **Performance Monitoring**   | Performance tracking and anomaly detection | [docs/performance-monitoring.md](docs/performance-monitoring.md)     |
| **Agent Registry**           | Agent registration and management          | [src/lib/agents/README.md](src/lib/agents/README.md)                 |
| **Workflow Engine v1.12**    | Visual workflow editor and automation      | [docs/workflow-engine.md](docs/workflow-engine.md)                   |
| **Email Alerting**           | SMTP-based alert notifications             | [src/lib/alerting/README.md](src/lib/alerting/README.md)             |

### Architecture

- [Architecture Report](ARCHITECTURE-REPORT.md) - System architecture and design decisions
- [Multi-Tenant Architecture](MULTI_TENANT_ARCHITECTURE_ANALYSIS.md) - Tenant isolation and security
- [A2A Protocol Architecture](src/lib/a2a/ARCHITECTURE.md) - Communication protocol details

### Reports

- [Test Report](TEST-REPORT.md) - Test coverage and results
- [Dependency Security Report](DEPENDENCY_SECURITY_REPORT.md) - Security audit and fixes
- [Delivery Report](DELIVERY-REPORT.md) - Version release notes

## 🏗️ Project Structure

```
src/
├── lib/
│   ├── agents/              # Agent registry and management
│   ├── a2a/                 # Agent-to-Agent protocol
│   ├── multi-agent/         # Multi-agent orchestration
│   ├── performance/         # Performance monitoring
│   ├── monitoring/          # Basic monitoring
│   └── utils/               # Utility functions
├── index.ts                 # Main entry point
└── __tests__/               # Integration tests

docs/                        # Documentation
├── multi-agent-orchestrator.md
├── performance-monitoring.md
└── README.md

tests/                       # Additional tests
coverage/                    # Test coverage reports
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- AgentRegistry.test.ts
```

### Test Coverage

- **Statements**: 66.16%
- **Branches**: 67.42%
- **Functions**: 69.25%
- **Lines**: 66.99%

### Key Test Results

- ✅ AgentRegistry: 100% coverage (32 tests)
- ✅ PerformanceMonitor: 98.78% coverage (28 tests)
- ✅ MultiAgentOrchestrator: 95% coverage (18 tests)
- ✅ AutoCleanMap: 97% coverage (30 tests)
- ✅ ResourceManager: 91% coverage (22 tests)

## 🔧 Configuration

### Environment Variables

```bash
# Node.js version
NODE_VERSION=18.0.0

# Test configuration
JEST_ENVIRONMENT=node
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## 📊 Performance

### Benchmarks

| Metric                    | Target | Current            |
| ------------------------- | ------ | ------------------ |
| Anomaly Detection Latency | <10ms  | ~50ms (optimizing) |
| Agent Registration        | <1ms   | <1ms ✅            |
| Task Allocation           | <5ms   | <5ms ✅            |
| Cache Hit Rate            | >90%   | >90% ✅            |

### Optimization Goals

- Reduce anomaly detection latency from ~50ms to <10ms
- Improve cache hit rates with tenant-aware keys
- Optimize database queries with composite indexes

## 🔒 Security

### Security Features

- ✅ Tenant isolation at all layers
- ✅ Role-based access control
- ✅ Audit logging for all operations
- ✅ Input validation and sanitization
- ✅ Dependency security scanning

### Recent Security Fixes

- Upgraded vitest to 4.1.2 (fixes GHSA-67mh-4wv8-2f99)
- Fixed esbuild vulnerability
- Updated React type definitions
- Applied security patches to vite and vite-node

See [Dependency Security Report](DEPENDENCY_SECURITY_REPORT.md) for details.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Ensure all tests pass before submitting
- Follow the existing code style
- Update documentation as needed

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with TypeScript and Node.js
- Inspired by modern multi-agent systems
- Powered by the amazing open-source community

## 📞 Support

- 📧 Email: support@7zi.com
- 📖 Documentation: [docs/](docs/)
- 🐛 Issues: [GitHub Issues](https://github.com/7zi/7zi-multi-agent/issues)

---

**Version**: 1.12.2 | **Last Updated**: 2026-04-04
