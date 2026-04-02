/**
 * @fileoverview Bug report component
 * @description Quick-submit form for bug reports
 */

'use client'

import React, { useState, useCallback } from 'react'

interface BugReportProps {
  onSubmit: (bug: BugReportData) => Promise<void> | void
  isLoading?: boolean
  showTitle?: boolean
}

export interface BugReportData {
  summary: string
  steps: string
  expected: string
  actual: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  browser?: string
  url?: string
}

const PRIORITIES = [
  {
    value: 'low',
    label: '低',
    color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
  },
  {
    value: 'medium',
    label: '中',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    value: 'high',
    label: '高',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  },
  {
    value: 'critical',
    label: '紧急',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
]

export function BugReportForm({ onSubmit, isLoading = false, showTitle = true }: BugReportProps) {
  const [summary, setSummary] = useState('')
  const [steps, setSteps] = useState('')
  const [expected, setExpected] = useState('')
  const [actual, setActual] = useState('')
  const [priority, setPriority] = useState<BugReportData['priority']>('medium')
  const [url, setUrl] = useState('')

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!summary.trim() || !steps.trim()) {
        return
      }

      const bug: BugReportData = {
        summary: summary.trim(),
        steps: steps.trim(),
        expected: expected.trim(),
        actual: actual.trim(),
        priority,
        url: url.trim() || undefined,
        browser: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }

      await onSubmit(bug)

      // Reset form
      setSummary('')
      setSteps('')
      setExpected('')
      setActual('')
      setUrl('')
      setPriority('medium')
    },
    [onSubmit, summary, steps, expected, actual, priority, url]
  )

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      {showTitle && (
        <div className="flex items-center gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <span className="text-xl">🐛</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">问题报告</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">快速提交您遇到的问题</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        {/* Summary */}
        <div>
          <label
            htmlFor="bug-summary"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            问题摘要 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="bug-summary"
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="简要描述问题，例如：登录后无法访问仪表盘"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            required
            maxLength={200}
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{summary.length}/200</p>
        </div>

        {/* Priority */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            优先级
          </label>
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value as BugReportData['priority'])}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${priority === p.value ? p.color + ' ring- ring-2 ring-offset-2' + p.value : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'} `}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* URL (Optional) */}
        <div>
          <label
            htmlFor="bug-url"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            问题页面链接（可选）
          </label>
          <input
            type="url"
            id="bug-url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/page"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          />
        </div>

        {/* Steps to Reproduce */}
        <div>
          <label
            htmlFor="bug-steps"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            复现步骤 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="bug-steps"
            value={steps}
            onChange={e => setSteps(e.target.value)}
            placeholder="1. 访问登录页面&#10;2. 输入用户名和密码&#10;3. 点击登录按钮&#10;4. 观察到错误..."
            rows={4}
            className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            required
            maxLength={1000}
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{steps.length}/1000</p>
        </div>

        {/* Expected Behavior */}
        <div>
          <label
            htmlFor="bug-expected"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            期望行为
          </label>
          <textarea
            id="bug-expected"
            value={expected}
            onChange={e => setExpected(e.target.value)}
            placeholder="您期望发生什么？"
            rows={2}
            className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            maxLength={500}
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{expected.length}/500</p>
        </div>

        {/* Actual Behavior */}
        <div>
          <label
            htmlFor="bug-actual"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            实际行为
          </label>
          <textarea
            id="bug-actual"
            value={actual}
            onChange={e => setActual(e.target.value)}
            placeholder="实际发生了什么？"
            rows={2}
            className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            maxLength={500}
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{actual.length}/500</p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !summary.trim() || !steps.trim()}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                提交中...
              </>
            ) : (
              <>
                <span>📤</span>
                提交报告
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default BugReportForm
