/**
 * @fileoverview Settings Page 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import SettingsPage from '@/app/[locale]/settings/page'

// Mock child components that make API calls
vi.mock('@/components/DataExportPanel', () => ({
  DataExportPanel: () => (
    <div data-testid="data-export-panel">
      <h3>Data Export & Backup</h3>
      <p>Export your data or create a full database backup for safekeeping.</p>
    </div>
  ),
}))

vi.mock('@/components/BackupList', () => ({
  BackupList: ({ refreshTrigger }: { refreshTrigger?: number }) => (
    <div data-testid="backup-list" data-refresh-trigger={refreshTrigger}>
      <h3>Available Backups</h3>
      <p>0 backups available</p>
    </div>
  ),
}))

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该显示正确的标题 "Settings"', () => {
      render(<SettingsPage />)

      const heading = screen.getByRole('heading', { name: /settings/i, level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('Settings')
    })

    it('应该显示页面描述文本', () => {
      render(<SettingsPage />)

      expect(
        screen.getByText('Manage your data exports, backups, and platform settings')
      ).toBeInTheDocument()
    })

    it('应该渲染 DataExportPanel 组件', () => {
      render(<SettingsPage />)

      const dataExportPanel = screen.getByTestId('data-export-panel')
      expect(dataExportPanel).toBeInTheDocument()
    })

    it('应该渲染 BackupList 组件', () => {
      render(<SettingsPage />)

      const backupList = screen.getByTestId('backup-list')
      expect(backupList).toBeInTheDocument()
    })

    it('应该渲染 Export Tips 部分', () => {
      render(<SettingsPage />)

      expect(screen.getByText('💡 Export Tips')).toBeInTheDocument()
      expect(screen.getByText(/JSON format preserves all data and structure/)).toBeInTheDocument()
      expect(screen.getByText(/CSV format is ideal for spreadsheets/)).toBeInTheDocument()
      expect(screen.getByText(/Use filters to export specific data subsets/)).toBeInTheDocument()
      expect(screen.getByText(/Backups include all tables and metadata/)).toBeInTheDocument()
      expect(screen.getByText(/Regular backups ensure data safety/)).toBeInTheDocument()
    })

    it('应该渲染 Important Notes 部分', () => {
      render(<SettingsPage />)

      expect(screen.getByText('⚠️ Important Notes')).toBeInTheDocument()
      expect(screen.getByText(/Backups are stored on the server/)).toBeInTheDocument()
      expect(screen.getByText(/Download backups for safe local storage/)).toBeInTheDocument()
      expect(screen.getByText(/Delete old backups to free up space/)).toBeInTheDocument()
      expect(screen.getByText(/Verify backup integrity before deletion/)).toBeInTheDocument()
    })
  })

  describe('布局', () => {
    it('应该使用两列网格布局', () => {
      const { container } = render(<SettingsPage />)

      // Check for grid layout class
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toBeInTheDocument()
    })

    it('应该有正确的容器类名', () => {
      const { container } = render(<SettingsPage />)

      const mainContainer = container.querySelector('.container')
      expect(mainContainer).toBeInTheDocument()
    })
  })

  describe('组件集成', () => {
    it('应该将 refreshTrigger 传递给 BackupList', () => {
      render(<SettingsPage />)

      const backupList = screen.getByTestId('backup-list')
      expect(backupList).toHaveAttribute('data-refresh-trigger', '0')
    })

    it('应该在左侧列显示 DataExportPanel 和 Export Tips', () => {
      render(<SettingsPage />)

      const dataExportPanel = screen.getByTestId('data-export-panel')
      const exportTips = screen.getByText('💡 Export Tips')

      expect(dataExportPanel).toBeInTheDocument()
      expect(exportTips).toBeInTheDocument()
    })

    it('应该在右侧列显示 BackupList 和 Important Notes', () => {
      render(<SettingsPage />)

      const backupList = screen.getByTestId('backup-list')
      const importantNotes = screen.getByText('⚠️ Important Notes')

      expect(backupList).toBeInTheDocument()
      expect(importantNotes).toBeInTheDocument()
    })
  })

  describe('无错误渲染', () => {
    it('应该在渲染时不产生 console 错误', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')

      render(<SettingsPage />)

      expect(consoleErrorSpy).not.toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('应该在渲染时不产生 console 警告', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn')

      render(<SettingsPage />)

      expect(consoleWarnSpy).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('应该成功渲染完整页面结构', () => {
      const { container } = render(<SettingsPage />)

      // Main container
      expect(container.querySelector('.container')).toBeInTheDocument()

      // Heading section
      expect(container.querySelector('h1')).toBeInTheDocument()

      // Grid layout
      expect(container.querySelector('.grid')).toBeInTheDocument()

      // Both panels
      expect(screen.getByTestId('data-export-panel')).toBeInTheDocument()
      expect(screen.getByTestId('backup-list')).toBeInTheDocument()

      // Tips sections
      expect(screen.getByText('💡 Export Tips')).toBeInTheDocument()
      expect(screen.getByText('⚠️ Important Notes')).toBeInTheDocument()
    })
  })

  describe('响应式设计', () => {
    it('应该有正确的响应式类名', () => {
      const { container } = render(<SettingsPage />)

      // Check for responsive grid classes
      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-1')
      expect(grid).toHaveClass('lg:grid-cols-2')
    })
  })

  describe('无障碍性', () => {
    it('应该有正确的标题层级', () => {
      render(<SettingsPage />)

      // Main heading (h1)
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('Settings')

      // Subheadings (h3)
      const subheadings = screen.getAllByRole('heading', { level: 3 })
      expect(subheadings.length).toBeGreaterThanOrEqual(4) // At least 4 h3 elements
    })

    it('应该为提示部分提供清晰的文本内容', () => {
      render(<SettingsPage />)

      // Check that tips have descriptive text
      const tipsSection = screen.getByText('💡 Export Tips').parentElement
      expect(tipsSection).toHaveTextContent('JSON format')
      expect(tipsSection).toHaveTextContent('CSV format')
    })
  })
})
