# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.10.1] - 2026-04-03

### Added

- **Multi-Agent Orchestrator** - New multi-agent collaboration orchestration module
  - Parallel execution support for agent collaboration
  - Sequential workflow execution with dependency management
  - Dynamic task allocation based on agent capabilities and load
  - Multiple aggregation strategies: first, all, best, vote, custom
- **Performance Monitoring** - Incremental anomaly detection system
  - Welford's Online Algorithm for O(1) mean/variance updates
  - Streaming Isolation Forest for robust anomaly detection
  - Performance target: <10ms detection latency (down from ~50ms)
- **Enhanced Documentation** - Comprehensive module documentation
  - Multi-Agent Orchestrator API reference
  - Performance Monitoring guide
  - Architecture analysis report
  - Multi-tenant architecture analysis

### Changed

- **Lucide Icons** - Upgraded to latest version for improved icon set
- **Multi-Tenant Architecture** - Comprehensive review and improvements
  - Added tenant isolation to permission system
  - Implemented tenant-aware cache key prefixes
  - Enhanced defensive tenant validation in billing service
  - Added composite indexes for common query patterns
- **TypeScript Strict Mode** - Continued strict type enforcement
  - Fixed type issues in tenant middleware and service
  - Separated type definitions into dedicated files
  - Improved type safety across all modules

### Security

- **Dependency Security Fixes** - Resolved 4 moderate vulnerabilities
  - Upgraded vitest from 1.6.1 to 4.1.2
  - Fixed esbuild vulnerability (GHSA-67mh-4wv8-2f99)
  - Updated React type definitions to match React 19.x
  - Applied security patches to vite and vite-node

### Fixed

- **Permission System** - Added tenant_id column to resource_permissions table
- **Cache Isolation** - Implemented tenant-aware cache key prefixes
- **Database Indexes** - Added composite indexes for performance optimization
- **Type Definitions** - Fixed React type version mismatches

### Documentation

- **Synchronized docs/ directory** with latest architecture changes
- **Updated module READMEs** with new features and APIs
- **Added architecture diagrams** for multi-tenant system
- **Created comprehensive testing reports** with coverage analysis

### Performance

- **Optimized permission table initialization** - Reduced database pressure
- **Improved cache hit rates** with tenant-aware key prefixes
- **Enhanced query performance** with composite indexes

### Testing

- **Test Coverage**: 66.16% statements, 67.42% branches, 69.25% functions
- **340 test cases** across 14 test suites
- **Core modules**: AgentRegistry (100%), PerformanceMonitor (98.78%), MultiAgentOrchestrator (95%)
- **Fixed CodeGenerator test compilation errors**
- **Adjusted performance test thresholds** for realistic targets

---

## [1.10.0] - 2026-04-02

### Added

- **Workflow Editor v1.10** - Complete rewrite with enhanced features
  - LoopNode for repetitive task execution
  - SubworkflowNode for nested workflow calls
  - TransformNode for data mapping and transformation
  - NodeSearchPanel for quick node location
  - WorkflowExporter for import/export functionality
  - AutoLayout algorithm for automatic node arrangement
  - EnhancedToolbar with improved UX
  - ExpressionEditor for dynamic expressions
  - KeyboardShortcutsPanel for productivity
- **Authentication System** - Login page and authentication flow
- **Custom Hooks** - useClipboard, useCustomNodes, useWorkflowExport

### Changed

- **React** - Upgraded to 19.2.4
- **Next.js** - Upgraded to 16.2.1
- **TypeScript** - Upgraded to 5.9.3

### Documentation

- **Added v1.10 documentation** with comprehensive guides
- **Created implementation summary** for new features
- **Updated examples** for v1.10 and v1.9.1

---

## [1.9.1] - 2026-04-01

### Added

- **Multi-Agent System** - Initial implementation
  - AgentRegistry for agent management
  - A2A Protocol for agent-to-agent communication
  - WebSocket Manager for real-time communication
- **Performance Monitoring** - Basic performance tracking
- **Resource Management** - AutoCleanMap and ResourceManager utilities

### Changed

- **Code Cleanup** - Removed deprecated modules and unused code
- **Type Safety** - Improved TypeScript strict mode compliance

---

## [1.0.0] - 2026-03-30

### Added

- **Initial Release** - Core multi-agent orchestration system
- **A2A Protocol** - Basic agent-to-agent communication
- **Agent Registry** - Simple agent management
- **Basic Testing** - Initial test suite

---

[Unreleased]: https://github.com/7zi/7zi-multi-agent/compare/v1.10.1...HEAD
[1.10.1]: https://github.com/7zi/7zi-multi-agent/compare/v1.10.0...v1.10.1
[1.10.0]: https://github.com/7zi/7zi-multi-agent/compare/v1.9.1...v1.10.0
[1.9.1]: https://github.com/7zi/7zi-multi-agent/compare/v1.0.0...v1.9.1
[1.0.0]: https://github.com/7zi/7zi-multi-agent/releases/tag/v1.0.0
