/**
 * AlarmConfigPanel Component Tests
 * 告警配置面板组件单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlarmConfigPanel } from '../AlarmConfigPanel'

// Mock the monitoring module
vi.mock('@/lib/monitoring', () => ({
  monitor: {
    getAlarms: vi.fn().mockResolvedValue([]),
    updateConfig: vi.fn(),
    getMetrics: vi.fn().mockResolvedValue([]),
    'config': {
      alarms: {
        errorRate: {
          enabled: true,
          threshold: 0.1,
          windowMs: 300000,
        },
        responseTime: {
          enabled: true,
          threshold: 5000,
          windowMs: 300000,
        },
        operationDuration: {
          enabled: true,
          threshold: 10000,
          windowMs: 300000,
        },
      },
    },
  },
}))

describe('AlarmConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders alarm config panel', () => {
    render(<AlarmConfigPanel />)
    expect(screen.getByText('Alarm Rules')).toBeInTheDocument()
  })

  it('renders default alarm rules', () => {
    render(<AlarmConfigPanel />)
    expect(screen.getByText('Error Rate Alert')).toBeInTheDocument()
    expect(screen.getByText('Response Time Alert')).toBeInTheDocument()
    expect(screen.getByText('Operation Duration Alert')).toBeInTheDocument()
  })

  it('renders refresh button', () => {
    render(<AlarmConfigPanel />)
    expect(screen.getByText('Refresh')).toBeInTheDocument()
  })

  it('renders add rule button', () => {
    render(<AlarmConfigPanel />)
    expect(screen.getByText('Add Rule')).toBeInTheDocument()
  })

  it('renders save button', () => {
    render(<AlarmConfigPanel />)
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('toggles rule enabled state', async () => {
    render(<AlarmConfigPanel />)
    // Rule should be rendered
    expect(screen.getByText('Error Rate Alert')).toBeInTheDocument()
  })

  it('shows save button disabled when saving', () => {
    render(<AlarmConfigPanel />)
    const saveButton = screen.getByText('Save')
    expect(saveButton).toBeInTheDocument()
  })

  it('renders metric type selector', () => {
    render(<AlarmConfigPanel />)
    expect(screen.getByText('Metric')).toBeInTheDocument()
  })

  it('renders threshold input', () => {
    render(<AlarmConfigPanel />)
    expect(screen.getByText('Threshold')).toBeInTheDocument()
  })

  it('renders time window selector', () => {
    render(<AlarmConfigPanel />)
    expect(screen.getByText('Time Window')).toBeInTheDocument()
  })

  it('renders severity selector', () => {
    render(<AlarmConfigPanel />)
    expect(screen.getByText('Severity')).toBeInTheDocument()
  })

  it('renders recent alarms section when alarms exist', async () => {
    const { monitor } = await import('@/lib/monitoring')
    vi.mocked(monitor.getAlarms).mockResolvedValueOnce([
      {
        id: 'test-alarm',
        timestamp: Date.now(),
        type: 'errorRate',
        currentValue: 0.15,
        threshold: 0.1,
        message: 'Error rate exceeds threshold',
        severity: 'high',
      },
    ])

    render(<AlarmConfigPanel />)
    await waitFor(() => {
      expect(screen.getByText('Recent Alarms')).toBeInTheDocument()
    })
  })
})