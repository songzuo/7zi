/**
 * Alarm Configuration Panel
 * 告警规则配置面板 - 支持阈值设置、告警级别配置
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  RefreshCw,
} from 'lucide-react'
import { monitor } from '@/lib/monitoring'
import type { AlarmThreshold, AlarmEvent, MonitoringConfig } from '@/lib/monitoring/types'

export interface AlarmRule {
  id: string
  name: string
  metric: 'errorRate' | 'responseTime' | 'operationDuration'
  threshold: number
  windowMs: number
  enabled: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  description?: string
}

export function AlarmConfigPanel(): JSX.Element {
  const [rules, setRules] = useState<AlarmRule[]>([])
  const [recentAlarms, setRecentAlarms] = useState<AlarmEvent[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // 加载现有规则
  useEffect(() => {
    loadRules()
    loadRecentAlarms()
  }, [])

  const loadRules = () => {
    // Access config - use type assertion for private property access
    const config = (monitor as { config: MonitoringConfig }).config
    const defaultRules: AlarmRule[] = [
      {
        id: 'error-rate-default',
        name: 'Error Rate Alert',
        metric: 'errorRate',
        threshold: config?.alarms?.errorRate?.threshold || 0.1,
        windowMs: config?.alarms?.errorRate?.windowMs || 5 * 60 * 1000,
        enabled: config?.alarms?.errorRate?.enabled ?? true,
        severity: 'high',
        description: 'Alert when error rate exceeds threshold',
      },
      {
        id: 'response-time-default',
        name: 'Response Time Alert',
        metric: 'responseTime',
        threshold: config?.alarms?.responseTime?.threshold || 5000,
        windowMs: config?.alarms?.responseTime?.windowMs || 5 * 60 * 1000,
        enabled: config?.alarms?.responseTime?.enabled ?? true,
        severity: 'medium',
        description: 'Alert when API response time exceeds threshold',
      },
      {
        id: 'operation-duration-default',
        name: 'Operation Duration Alert',
        metric: 'operationDuration',
        threshold: config?.alarms?.operationDuration?.threshold || 10000,
        windowMs: config?.alarms?.operationDuration?.windowMs || 5 * 60 * 1000,
        enabled: config?.alarms?.operationDuration?.enabled ?? true,
        severity: 'medium',
        description: 'Alert when operation duration exceeds threshold',
      },
    ]
    setRules(defaultRules)
  }

  const loadRecentAlarms = async () => {
    const alarms = await monitor.getAlarms(Date.now() - 24 * 60 * 60 * 1000)
    setRecentAlarms(alarms.slice(-10).reverse())
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // 更新监控配置
      const newConfig = {
        alarms: {
          errorRate: {
            enabled: rules.find(r => r.metric === 'errorRate')?.enabled ?? true,
            threshold: rules.find(r => r.metric === 'errorRate')?.threshold ?? 0.1,
            windowMs: rules.find(r => r.metric === 'errorRate')?.windowMs ?? 5 * 60 * 1000,
          },
          responseTime: {
            enabled: rules.find(r => r.metric === 'responseTime')?.enabled ?? true,
            threshold: rules.find(r => r.metric === 'responseTime')?.threshold ?? 5000,
            windowMs: rules.find(r => r.metric === 'responseTime')?.windowMs ?? 5 * 60 * 1000,
          },
          operationDuration: {
            enabled: rules.find(r => r.metric === 'operationDuration')?.enabled ?? true,
            threshold: rules.find(r => r.metric === 'operationDuration')?.threshold ?? 10000,
            windowMs: rules.find(r => r.metric === 'operationDuration')?.windowMs ?? 5 * 60 * 1000,
          },
        },
      }
      monitor.updateConfig(newConfig)
      setIsSaving(false)
    } catch (error) {
      console.error('Failed to save alarm rules:', error)
      setIsSaving(false)
    }
  }

  const handleToggleRule = (id: string) => {
    setRules(rules.map(rule =>
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ))
  }

  const handleUpdateRule = (id: string, updates: Partial<AlarmRule>) => {
    setRules(rules.map(rule =>
      rule.id === id ? { ...rule, ...updates } : rule
    ))
  }

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id))
  }

  const handleAddRule = () => {
    const newRule: AlarmRule = {
      id: `custom-${Date.now()}`,
      name: 'New Alert Rule',
      metric: 'errorRate',
      threshold: 0.1,
      windowMs: 5 * 60 * 1000,
      enabled: true,
      severity: 'medium',
    }
    setRules([...rules, newRule])
    setShowAddForm(false)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getMetricUnit = (metric: string) => {
    switch (metric) {
      case 'errorRate':
        return '%'
      case 'responseTime':
        return 'ms'
      case 'operationDuration':
        return 'ms'
      default:
        return ''
    }
  }

  const formatWindow = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    return `${hours}h`
  }

  return (
    <div className="space-y-6">
      {/* 告警规则列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alarm Rules
              </CardTitle>
              <CardDescription>
                Configure thresholds and severity levels for performance alerts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadRecentAlarms()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-lg border p-4 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => handleToggleRule(rule.id)}
                      />
                      <Input
                        value={rule.name}
                        onChange={(e) => handleUpdateRule(rule.id, { name: e.target.value })}
                        className="max-w-xs"
                      />
                      <Badge className={getSeverityColor(rule.severity)}>
                        {rule.severity}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Metric</Label>
                        <Select
                          value={rule.metric}
                          onValueChange={(value: string) => handleUpdateRule(rule.id, { metric: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="errorRate">Error Rate</SelectItem>
                            <SelectItem value="responseTime">Response Time</SelectItem>
                            <SelectItem value="operationDuration">Operation Duration</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-500">Threshold</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={rule.threshold}
                            onChange={(e) => handleUpdateRule(rule.id, { threshold: parseFloat(e.target.value) || 0 })}
                            className="w-24"
                          />
                          <span className="text-sm text-gray-500">{getMetricUnit(rule.metric)}</span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-500">Time Window</Label>
                        <Select
                          value={rule.windowMs.toString()}
                          onValueChange={(value) => handleUpdateRule(rule.id, { windowMs: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="60000">1 minute</SelectItem>
                            <SelectItem value="300000">5 minutes</SelectItem>
                            <SelectItem value="900000">15 minutes</SelectItem>
                            <SelectItem value="1800000">30 minutes</SelectItem>
                            <SelectItem value="3600000">1 hour</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500">Severity</Label>
                      <Select
                        value={rule.severity}
                        onValueChange={(value: string) => handleUpdateRule(rule.id, { severity: value })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {rule.description && (
                      <p className="text-sm text-gray-500">{rule.description}</p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 最近告警 */}
      {recentAlarms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Recent Alarms
            </CardTitle>
            <CardDescription>
              Last {recentAlarms.length} alarm events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAlarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className="flex items-start justify-between rounded-lg border p-3 dark:border-gray-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(alarm.severity)}>
                        {alarm.severity}
                      </Badge>
                      <span className="font-medium">{alarm.type}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{alarm.message}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {alarm.currentValue.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Threshold: {alarm.threshold}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(alarm.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}