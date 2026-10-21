/**
 * NotificationNode 测试 —— 短信（sms）通知类型分支
 *
 * 覆盖 `notificationType: 'sms'` 在工作流编辑器节点上的渲染行为：
 * - 显示"短信"类型标签
 * - 显示收件人数量
 * - 优先级标识与配色
 * - 标题渲染
 *
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from 'reactflow'
import NotificationNode from '../Nodes/NotificationNode'
import type { WorkflowNodeData } from '../types'

const renderNode = (data: Partial<WorkflowNodeData>) => {
  const node = {
    data: {
      id: 'notification-1',
      type: 'notification',
      label: '发送通知',
      config: {},
      ...data,
    } as WorkflowNodeData,
    selected: false,
  }

  return render(
    <ReactFlowProvider>
      <NotificationNode {...(node as any)} />
    </ReactFlowProvider>
  )
}

describe('NotificationNode - 短信通道', () => {
  it('notificationType 为 sms 时应显示"短信"标签', () => {
    renderNode({ config: { notificationType: 'sms' } as any })

    expect(screen.getByText('短信')).toBeInTheDocument()
  })

  it('未指定 notificationType 时默认显示"邮件"', () => {
    renderNode({ config: {} as any })

    expect(screen.getByText('邮件')).toBeInTheDocument()
  })

  it('应显示通知标题', () => {
    renderNode({
      config: { notificationType: 'sms', notificationTitle: 'CPU 告警短信' } as any,
    })

    expect(screen.getByText('CPU 告警短信')).toBeInTheDocument()
  })

  it('应显示收件人数量', () => {
    renderNode({
      config: {
        notificationType: 'sms',
        notificationRecipients: ['+1000000001', '+1000000002', '+1000000003'],
      } as any,
    })

    expect(screen.getByText('3 个')).toBeInTheDocument()
  })

  it('紧急优先级应渲染红色样式标识', () => {
    renderNode({
      config: { notificationType: 'sms', notificationPriority: 'urgent' } as any,
    })

    const badge = screen.getByText('urgent')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('text-red-600')
  })

  it('普通优先级应渲染蓝色样式标识', () => {
    renderNode({
      config: { notificationType: 'sms', notificationPriority: 'normal' } as any,
    })

    const badge = screen.getByText('normal')
    expect(badge.className).toContain('text-blue-600')
  })

  it('未配置优先级时不应渲染优先级标识', () => {
    renderNode({ config: { notificationType: 'sms' } as any })

    expect(screen.queryByText('urgent')).not.toBeInTheDocument()
    expect(screen.queryByText('normal')).not.toBeInTheDocument()
  })

  it('应渲染自定义节点标签', () => {
    renderNode({ label: '发送短信通知', config: { notificationType: 'sms' } as any })

    expect(screen.getByText('发送短信通知')).toBeInTheDocument()
  })
})
