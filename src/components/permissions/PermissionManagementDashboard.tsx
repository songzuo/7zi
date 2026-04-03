/**
 * v1.12.0 Permission Management UI Components
 * 权限管理界面组件
 */

'use client'

import React, { useState, useEffect } from 'react'
import {
  EnhancedRoleDefinition,
  FineGrainedPermission,
  PermissionChangeType,
} from '../v2/types'

/**
 * 权限管理主组件
 */
export function PermissionManagementDashboard() {
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'audit'>('roles')
  const [loading, setLoading] = useState(false)

  return (
    <div className="permission-management-dashboard">
      <div className="dashboard-header">
        <h1>权限管理系统 v1.12.0</h1>
        <p>细粒度 RBAC 权限控制</p>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          角色管理
        </button>
        <button
          className={`tab ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          权限管理
        </button>
        <button
          className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          审计日志
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'roles' && <RoleManagement />}
        {activeTab === 'permissions' && <PermissionManagement />}
        {activeTab === 'audit' && <AuditLogViewer />}
      </div>
    </div>
  )
}

/**
 * 角色管理组件
 */
function RoleManagement() {
  const [roles, setRoles] = useState<EnhancedRoleDefinition[]>([])
  const [selectedRole, setSelectedRole] = useState<EnhancedRoleDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/v2/permissions/roles')
      const data = await response.json()
      if (data.success) {
        setRoles(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRole = async (roleData: Partial<EnhancedRoleDefinition>) => {
    try {
      const response = await fetch('/api/v2/permissions/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData),
      })
      const data = await response.json()
      if (data.success) {
        await fetchRoles()
        setShowCreateModal(false)
      }
    } catch (error) {
      console.error('Failed to create role:', error)
    }
  }

  const handleUpdateRole = async (roleId: string, updates: Partial<EnhancedRoleDefinition>) => {
    try {
      const response = await fetch(`/api/v2/permissions/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await response.json()
      if (data.success) {
        await fetchRoles()
      }
    } catch (error) {
      console.error('Failed to update role:', error)
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('确定要删除此角色吗？')) return

    try {
      const response = await fetch(`/api/v2/permissions/roles/${roleId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        await fetchRoles()
        setSelectedRole(null)
      }
    } catch (error) {
      console.error('Failed to delete role:', error)
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="role-management">
      <div className="role-list">
        <div className="list-header">
          <h2>角色列表</h2>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            创建角色
          </button>
        </div>

        <div className="role-items">
          {roles.map(role => (
            <div
              key={role.id}
              className={`role-item ${selectedRole?.id === role.id ? 'selected' : ''}`}
              onClick={() => setSelectedRole(role)}
            >
              <div className="role-info">
                <h3>{role.name}</h3>
                <p>{role.description}</p>
                <div className="role-meta">
                  <span className="badge">级别: {role.level}</span>
                  {role.isSystem && <span className="badge system">系统角色</span>}
                  {role.inheritsFrom && role.inheritsFrom.length > 0 && (
                    <span className="badge inherited">继承: {role.inheritsFrom.length}</span>
                  )}
                </div>
              </div>
              <div className="role-actions">
                {!role.isSystem && (
                  <button
                    className="btn-danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteRole(role.id)
                    }}
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedRole && (
        <div className="role-detail">
          <RoleDetailPanel
            role={selectedRole}
            onUpdate={(updates) => handleUpdateRole(selectedRole.id, updates)}
          />
        </div>
      )}

      {showCreateModal && (
        <CreateRoleModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateRole}
        />
      )}
    </div>
  )
}

/**
 * 角色详情面板
 */
function RoleDetailPanel({
  role,
  onUpdate,
}: {
  role: EnhancedRoleDefinition
  onUpdate: (updates: Partial<EnhancedRoleDefinition>) => void
}) {
  const [name, setName] = useState(role.name)
  const [description, setDescription] = useState(role.description || '')
  const [level, setLevel] = useState(role.level)
  const [inheritsFrom, setInheritsFrom] = useState(role.inheritsFrom || [])

  const handleSave = () => {
    onUpdate({ name, description, level, inheritsFrom })
  }

  return (
    <div className="role-detail-panel">
      <h2>角色详情: {role.name}</h2>

      <div className="form-group">
        <label>角色名称</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={role.isSystem}
        />
      </div>

      <div className="form-group">
        <label>描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>级别</label>
        <input
          type="number"
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          disabled={role.isSystem}
        />
      </div>

      <div className="form-group">
        <label>继承角色</label>
        <input
          type="text"
          value={inheritsFrom.join(', ')}
          onChange={(e) => setInheritsFrom(e.target.value.split(',').map(s => s.trim()))}
          placeholder="role1, role2, role3"
        />
      </div>

      <div className="form-group">
        <label>权限数量</label>
        <div className="permission-count">
          <span>直接权限: {role.permissions.length}</span>
          <span>计算权限: {role.computedPermissions?.length || 0}</span>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-primary" onClick={handleSave}>
          保存
        </button>
      </div>
    </div>
  )
}

/**
 * 创建角色模态框
 */
function CreateRoleModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (role: Partial<EnhancedRoleDefinition>) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState(0)
  const [inheritsFrom, setInheritsFrom] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate({
      name,
      description,
      level,
      inheritsFrom: inheritsFrom.split(',').map(s => s.trim()).filter(Boolean),
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>创建角色</h2>
          <button className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>角色名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>级别</label>
            <input
              type="number"
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>继承角色</label>
            <input
              type="text"
              value={inheritsFrom}
              onChange={(e) => setInheritsFrom(e.target.value)}
              placeholder="role1, role2, role3"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-primary">
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * 权限管理组件
 */
function PermissionManagement() {
  const [permissions, setPermissions] = useState<FineGrainedPermission[]>([])
  const [selectedPermission, setSelectedPermission] = useState<FineGrainedPermission | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{ resourceType?: string; action?: string }>({})

  useEffect(() => {
    fetchPermissions()
  }, [filter])

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/v2/permissions')
      const data = await response.json()
      if (data.success) {
        let filtered = data.data
        if (filter.resourceType) {
          filtered = filtered.filter((p: FineGrainedPermission) =>
            p.resourceType.includes(filter.resourceType!)
          )
        }
        if (filter.action) {
          filtered = filtered.filter((p: FineGrainedPermission) =>
            p.action.includes(filter.action!)
          )
        }
        setPermissions(filtered)
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePermission = async (permissionData: Partial<FineGrainedPermission>) => {
    try {
      const response = await fetch('/api/v2/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissionData),
      })
      const data = await response.json()
      if (data.success) {
        await fetchPermissions()
      }
    } catch (error) {
      console.error('Failed to create permission:', error)
    }
  }

  const handleUpdatePermission = async (
    permissionId: string,
    updates: Partial<FineGrainedPermission>
  ) => {
    try {
      const response = await fetch(`/api/v2/permissions/${permissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await response.json()
      if (data.success) {
        await fetchPermissions()
      }
    } catch (error) {
      console.error('Failed to update permission:', error)
    }
  }

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm('确定要删除此权限吗？')) return

    try {
      const response = await fetch(`/api/v2/permissions/${permissionId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        await fetchPermissions()
        setSelectedPermission(null)
      }
    } catch (error) {
      console.error('Failed to delete permission:', error)
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="permission-management">
      <div className="permission-filters">
        <input
          type="text"
          placeholder="筛选资源类型..."
          value={filter.resourceType || ''}
          onChange={(e) => setFilter({ ...filter, resourceType: e.target.value })}
        />
        <input
          type="text"
          placeholder="筛选操作..."
          value={filter.action || ''}
          onChange={(e) => setFilter({ ...filter, action: e.target.value })}
        />
        <button className="btn-primary" onClick={() => setSelectedPermission({} as any)}>
          创建权限
        </button>
      </div>

      <div className="permission-list">
        {permissions.map(permission => (
          <div
            key={permission.id}
            className={`permission-item ${selectedPermission?.id === permission.id ? 'selected' : ''}`}
            onClick={() => setSelectedPermission(permission)}
          >
            <div className="permission-info">
              <h3>{permission.name}</h3>
              <p>{permission.description}</p>
              <div className="permission-meta">
                <span className="badge">{permission.resourceType}</span>
                <span className="badge">{permission.action}</span>
                {permission.isDeny && <span className="badge deny">拒绝</span>}
                {permission.priority > 0 && <span className="badge priority">优先级: {permission.priority}</span>}
              </div>
            </div>
            <div className="permission-actions">
              <button
                className="btn-danger"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeletePermission(permission.id)
                }}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedPermission && (
        <div className="permission-detail">
          <PermissionDetailPanel
            permission={selectedPermission}
            onUpdate={(updates) => handleUpdatePermission(selectedPermission.id, updates)}
            onCreate={handleCreatePermission}
          />
        </div>
      )}
    </div>
  )
}

/**
 * 权限详情面板
 */
function PermissionDetailPanel({
  permission,
  onUpdate,
  onCreate,
}: {
  permission: FineGrainedPermission
  onUpdate: (updates: Partial<FineGrainedPermission>) => void
  onCreate: (permission: Partial<FineGrainedPermission>) => void
}) {
  const isNew = !permission.id
  const [name, setName] = useState(permission.name || '')
  const [description, setDescription] = useState(permission.description || '')
  const [resourceType, setResourceType] = useState(permission.resourceType || '')
  const [action, setAction] = useState(permission.action || '')
  const [priority, setPriority] = useState(permission.priority || 0)
  const [isDeny, setIsDeny] = useState(permission.isDeny || false)

  const handleSave = () => {
    const data = {
      name,
      description,
      resourceType,
      action,
      priority,
      isDeny,
    }

    if (isNew) {
      onCreate(data)
    } else {
      onUpdate(data)
    }
  }

  return (
    <div className="permission-detail-panel">
      <h2>{isNew ? '创建权限' : '权限详情'}</h2>

      <div className="form-group">
        <label>权限名称 *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="form-group">
        <label>描述</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="form-group">
        <label>资源类型 *</label>
        <input type="text" value={resourceType} onChange={(e) => setResourceType(e.target.value)} required />
      </div>

      <div className="form-group">
        <label>操作 *</label>
        <input type="text" value={action} onChange={(e) => setAction(e.target.value)} required />
      </div>

      <div className="form-group">
        <label>优先级</label>
        <input
          type="number"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={isDeny}
            onChange={(e) => setIsDeny(e.target.checked)}
          />
          拒绝权限
        </label>
      </div>

      <div className="form-actions">
        <button className="btn-primary" onClick={handleSave}>
          {isNew ? '创建' : '保存'}
        </button>
      </div>
    </div>
  )
}

/**
 * 审计日志查看器
 */
function AuditLogViewer() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{
    changeType?: PermissionChangeType
    startDate?: string
    endDate?: string
  }>({})

  useEffect(() => {
    fetchLogs()
  }, [filter])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.changeType) params.append('changeType', filter.changeType)
      if (filter.startDate) params.append('startDate', filter.startDate)
      if (filter.endDate) params.append('endDate', filter.endDate)

      const response = await fetch(`/api/v2/permissions/audit?${params}`)
      const data = await response.json()
      if (data.success) {
        setLogs(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const params = new URLSearchParams()
      if (filter.changeType) params.append('changeType', filter.changeType)
      if (filter.startDate) params.append('startDate', filter.startDate)
      if (filter.endDate) params.append('endDate', filter.endDate)
      params.append('format', format)

      const response = await fetch(`/api/v2/permissions/audit/export?${params}`)
      const data = await response.text()

      const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString()}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export audit logs:', error)
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="audit-log-viewer">
      <div className="audit-filters">
        <select
          value={filter.changeType || ''}
          onChange={(e) => setFilter({ ...filter, changeType: e.target.value as any })}
        >
          <option value="">所有变更类型</option>
          <option value="role_created">角色创建</option>
          <option value="role_updated">角色更新</option>
          <option value="role_deleted">角色删除</option>
          <option value="permission_granted">权限授予</option>
          <option value="permission_revoked">权限撤销</option>
          <option value="role_assigned">角色分配</option>
          <option value="role_removed">角色移除</option>
        </select>

        <input
          type="date"
          value={filter.startDate || ''}
          onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
        />

        <input
          type="date"
          value={filter.endDate || ''}
          onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
        />

        <button className="btn-secondary" onClick={() => handleExport('json')}>
          导出 JSON
        </button>
        <button className="btn-secondary" onClick={() => handleExport('csv')}>
          导出 CSV
        </button>
      </div>

      <div className="audit-log-list">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>变更类型</th>
              <th>操作者</th>
              <th>目标类型</th>
              <th>目标ID</th>
              <th>原因</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
                <td>{log.changeType}</td>
                <td>{log.operatorId}</td>
                <td>{log.targetType}</td>
                <td>{log.targetId}</td>
                <td>{log.reason || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}