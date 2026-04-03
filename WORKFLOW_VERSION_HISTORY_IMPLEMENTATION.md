# 工作流版本历史管理功能实现报告

## 任务概述

为 v1.9.1 版本实现工作流历史版本管理功能，包括：
1. 保存工作流每次修改的快照
2. 支持版本对比（diff）
3. 支持版本回滚
4. 清理过期版本（保留最近 N 个）

## 技术要求

- 前端：React + TypeScript
- 后端：Node.js API
- 存储：版本快照存储
- 数据库添加 versions 表

## 交付物清单

### ✅ 1. 数据库迁移脚本

**文件**: `src/lib/db/migrations/v191_workflow_versions.ts`

创建了 3 个新表：

#### workflow_versions 表
存储工作流版本快照
- `id`: 版本唯一标识
- `workflow_id`: 工作流 ID
- `version_number`: 版本号（自增）
- `name`: 工作流名称
- `description`: 工作流描述
- `status`: 工作流状态
- `nodes`: 节点列表（JSON）
- `edges`: 边列表（JSON）
- `config`: 配置（JSON）
- `change_summary`: 变更说明
- `change_type`: 变更类型（create/update/rollback/restore）
- `parent_version_id`: 父版本 ID
- `created_by`: 创建者
- `created_at`: 创建时间

#### workflow_version_diffs 表
存储版本对比结果（缓存）
- `id`: 对比 ID
- `workflow_id`: 工作流 ID
- `from_version_id`: 源版本 ID
- `to_version_id`: 目标版本 ID
- `nodes_added`: 新增节点（JSON）
- `nodes_removed`: 删除节点（JSON）
- `nodes_modified`: 修改节点（JSON）
- `edges_added`: 新增边（JSON）
- `edges_removed`: 删除边（JSON）
- `edges_modified`: 修改边（JSON）
- `config_changed`: 配置变更（JSON）
- `total_changes`: 总变更数
- `computed_at`: 计算时间

#### workflow_version_settings 表
存储版本设置
- `id`: 设置 ID
- `workflow_id`: 工作流 ID
- `max_versions`: 最大版本数（默认 50）
- `auto_version_on_update`: 更新时自动创建版本（默认 true）
- `retention_days`: 保留天数（默认 90）

**索引**: 共 11 个索引，优化查询性能

### ✅ 2. API 接口

#### 版本管理 API
**文件**: `src/app/api/workflow/[id]/versions/route.ts`

- `GET /api/workflow/[id]/versions` - 获取版本列表
  - 支持分页（limit, offset）
  - 返回版本总数和版本列表

- `POST /api/workflow/[id]/versions` - 创建新版本
  - 验证必需字段
  - 自动分配版本号
  - 支持变更说明和类型

#### 版本详情 API
**文件**: `src/app/api/workflow/[id]/versions/[versionId]/route.ts`

- `GET /api/workflow/[id]/versions/[versionId]` - 获取特定版本
  - 返回完整版本快照

- `DELETE /api/workflow/[id]/versions/[versionId]` - 删除版本
  - 受限操作（需要管理员权限）

#### 版本对比 API
**文件**: `src/app/api/workflow/[id]/versions/compare/route.ts`

- `GET /api/workflow/[id]/versions/compare` - 对比两个版本
  - 查询参数：fromVersionId, toVersionId
  - 返回详细的变更信息
  - 使用缓存优化性能

#### 版本回滚 API
**文件**: `src/app/api/workflow/[id]/versions/[versionId]/rollback/route.ts`

- `POST /api/workflow/[id]/versions/[versionId]/rollback` - 回滚到指定版本
  - 创建新版本作为回滚快照
  - 保留历史记录
  - 返回恢复的数据

#### 版本设置 API
**文件**: `src/app/api/workflow/[id]/versions/settings/route.ts`

- `GET /api/workflow/[id]/versions/settings` - 获取版本设置
  - 返回当前版本配置

- `PUT /api/workflow/[id]/versions/settings` - 更新版本设置
  - 验证参数范围
  - 支持动态调整

#### 工作流 API 集成
**文件**: `src/app/api/workflow/[id]/route.ts`

- 更新工作流时自动创建版本快照（可配置）
- 删除工作流时自动清理版本历史

### ✅ 3. 前端版本历史组件

**文件**: `src/components/workflow/WorkflowVersionHistory.tsx`

#### 功能特性

1. **版本列表展示**
   - 显示所有版本，按时间倒序
   - 显示版本号、变更类型、变更说明
   - 相对时间显示（刚刚、X 分钟前等）
   - 创建者信息
   - 节点/边数量统计

2. **版本选择**
   - 支持选择两个版本进行对比
   - 最多选择 2 个版本
   - 自动替换最早的选择

3. **版本对比视图**
   - 显示节点变更（新增、删除、修改）
   - 显示边变更（新增、删除、修改）
   - 显示配置变更
   - 总变更数统计
   - 详细的变更说明

4. **版本回滚**
   - 一键回滚到历史版本
   - 确认对话框防止误操作
   - 回滚后自动刷新列表
   - 回滚创建新版本（保留历史）

5. **版本设置面板**
   - 最大版本数配置（1-1000）
   - 保留天数配置（1-365）
   - 自动创建版本开关
   - 实时保存设置

6. **UI/UX**
   - 加载状态处理
   - 错误处理和重试
   - 响应式设计
   - 暗色模式支持
   - 变更类型标签颜色区分

#### Props 接口

```typescript
interface WorkflowVersionHistoryProps {
  workflowId: string
  onRollback?: (version: WorkflowVersion) => void
  onCreateVersion?: () => void
}
```

### ✅ 4. 单元测试

#### 版本服务测试
**文件**: `src/lib/workflow/__tests__/version-service.test.ts`

测试覆盖：
- ✅ 创建版本（正确数据、版本号递增、完整快照、父版本引用）
- ✅ 获取版本列表（空列表、所有版本、倒序、分页）
- ✅ 获取特定版本（不存在、存在）
- ✅ 版本对比（新增节点、删除节点、修改节点、边变更、缓存）
- ✅ 版本回滚（创建新版本、无效版本、不同工作流）
- ✅ 版本清理（未超限、超限清理）
- ✅ 版本设置（默认设置、更新设置）
- ✅ 删除所有版本

#### API 测试
**文件**: `src/app/api/workflow/[id]/versions/__tests__/api.test.ts`

测试覆盖：
- ✅ GET /versions（空列表、分页参数）
- ✅ POST /versions（创建版本、验证字段）
- ✅ GET /versions/[versionId]（不存在版本）
- ✅ GET /versions/compare（缺少参数）
- ✅ POST /versions/[versionId]/rollback（不存在版本）
- ✅ GET/PUT /versions/settings（默认设置、更新设置、参数验证）

## 核心功能实现

### 版本快照存储

每次工作流更新时，自动创建版本快照：
- 保存完整的节点和边数据
- 保存配置信息
- 记录变更说明和类型
- 自动分配递增的版本号

### 版本对比算法

实现智能版本对比：
- 节点级别对比（新增、删除、修改）
- 边级别对比（新增、删除、修改）
- 配置级别对比
- 变更详情生成
- 结果缓存优化

### 版本回滚机制

安全的版本回滚：
- 创建新版本作为回滚快照
- 保留完整历史记录
- 支持回滚到任意历史版本
- 记录回滚操作

### 自动清理策略

智能版本清理：
- 根据最大版本数限制自动清理
- 保留最新的 N 个版本
- 清理时同时删除相关对比缓存
- 可配置保留策略

## 技术亮点

1. **零停机迁移**
   - 新表不影响现有数据
   - 向后兼容

2. **性能优化**
   - 11 个索引优化查询
   - 版本对比结果缓存
   - 分页查询支持

3. **数据完整性**
   - 外键约束
   - 唯一约束（workflow_id + version_number）
   - 事务支持

4. **用户体验**
   - 实时版本对比
   - 一键回滚
   - 可视化变更展示
   - 响应式设计

5. **可扩展性**
   - 支持自定义版本策略
   - 支持多种变更类型
   - 易于集成到现有工作流

## 文件清单

### 数据库
- `src/lib/db/migrations/v191_workflow_versions.ts` - 数据库迁移脚本

### 后端服务
- `src/lib/workflow/version-service.ts` - 版本服务核心逻辑

### API 路由
- `src/app/api/workflow/[id]/versions/route.ts` - 版本列表/创建
- `src/app/api/workflow/[id]/versions/[versionId]/route.ts` - 版本详情/删除
- `src/app/api/workflow/[id]/versions/compare/route.ts` - 版本对比
- `src/app/api/workflow/[id]/versions/[versionId]/rollback/route.ts` - 版本回滚
- `src/app/api/workflow/[id]/versions/settings/route.ts` - 版本设置
- `src/app/api/workflow/[id]/route.ts` - 工作流 API（已集成版本功能）

### 前端组件
- `src/components/workflow/WorkflowVersionHistory.tsx` - 版本历史组件

### 测试
- `src/lib/workflow/__tests__/version-service.test.ts` - 版本服务测试
- `src/app/api/workflow/[id]/versions/__tests__/api.test.ts` - API 测试

### 文档
- `CHANGELOG.md` - 更新日志（已添加 v1.9.1 条目）

## 使用示例

### 创建版本

```typescript
const version = await workflowVersionService.createVersion(workflow, {
  changeSummary: '添加新的审批节点',
  changeType: 'update',
  createdBy: 'user_123',
})
```

### 获取版本列表

```typescript
const { versions, total } = await workflowVersionService.getVersions('workflow_123', {
  limit: 20,
  offset: 0,
})
```

### 对比版本

```typescript
const diff = await workflowVersionService.compareVersions(version1Id, version2Id)
console.log(`总变更数: ${diff.totalChanges}`)
console.log(`新增节点: ${diff.nodesAdded.length}`)
console.log(`删除节点: ${diff.nodesRemoved.length}`)
```

### 回滚版本

```typescript
const newVersion = await workflowVersionService.rollbackToVersion(
  'workflow_123',
  versionId,
  { createdBy: 'user_123' }
)
```

### 前端使用

```tsx
<WorkflowVersionHistory
  workflowId="workflow_123"
  onRollback={(version) => console.log('回滚到', version)}
  onCreateVersion={() => console.log('创建新版本')}
/>
```

## 总结

成功实现了工作流版本历史管理功能，包括：

✅ **数据库层**：3 个新表，11 个索引，完整的迁移脚本
✅ **服务层**：版本服务，支持创建、查询、对比、回滚、清理
✅ **API 层**：6 个 API 端点，完整的 RESTful 接口
✅ **前端层**：React 组件，支持版本列表、对比、回滚、设置
✅ **测试层**：完整的单元测试覆盖

所有交付物已完成，功能完整，代码质量高，符合技术要求。