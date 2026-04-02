'use client'

import { useState, useEffect } from 'react'
import { getReactCompilerConfig, type ReactCompilerConfig } from '../config/compiler.config'

/**
 * React Compiler Toggle Component
 *
 * Dashboard component for managing React Compiler settings
 */
export function ReactCompilerToggle() {
  const [config, setConfig] = useState<ReactCompilerConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load current config
    const currentConfig = getReactCompilerConfig()
    setConfig(currentConfig)
    setLoading(false)
  }, [])

  const toggleCompiler = async () => {
    if (!config) return

    // In a real implementation, this would call an API to persist the setting
    const newConfig = { ...config, enabled: !config.enabled }
    setConfig(newConfig)

    // Show toast notification
    if (typeof window !== 'undefined') {
      const message = newConfig.enabled
        ? 'React Compiler enabled. Please rebuild the application.'
        : 'React Compiler disabled. Please rebuild the application.'

      // Simple alert for now, can be replaced with a proper toast
      alert(message)
    }
  }

  const changeMode = async (mode: 'opt-in' | 'opt-out') => {
    if (!config) return
    setConfig({ ...config, mode })
  }

  if (loading) {
    return <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">React Compiler</h3>
          <p className="text-sm text-gray-500">
            {config?.enabled
              ? 'Enabled - Reduces unnecessary re-renders by 20-40%'
              : 'Disabled - Using standard React compilation'}
          </p>
        </div>
        <button
          onClick={toggleCompiler}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config?.enabled ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config?.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {config?.enabled && (
        <div className="mt-4 border-t pt-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">Compilation Mode</label>
          <select
            value={config.mode}
            onChange={e => changeMode(e.target.value as 'opt-in' | 'opt-out')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="opt-out">Opt-out (compile all except excluded)</option>
            <option value="opt-in">Opt-in (only compile included)</option>
          </select>
        </div>
      )}

      {config?.enabled && (
        <div className="mt-4 rounded-md bg-green-50 p-3">
          <p className="text-sm text-green-700">
            ✓ React Compiler is active and optimizing your components.
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Component Scanner Dashboard
 */
export function ComponentScannerDashboard() {
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<{
    total: number
    compatible: number
    incompatible: number
  } | null>(null)

  const runScan = async () => {
    setScanning(true)

    // In a real implementation, this would call the scanner API
    // For now, simulate a scan
    await new Promise(resolve => setTimeout(resolve, 2000))

    setResults({
      total: 150,
      compatible: 135,
      incompatible: 15,
    })

    setScanning(false)
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Component Compatibility</h3>
        <button
          onClick={runScan}
          disabled={scanning}
          className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {scanning ? 'Scanning...' : 'Run Scan'}
        </button>
      </div>

      {results && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <div className="text-2xl font-bold">{results.total}</div>
            <div className="text-sm text-gray-500">Total Components</div>
          </div>
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{results.compatible}</div>
            <div className="text-sm text-gray-500">Compatible</div>
          </div>
          <div className="rounded-lg bg-red-50 p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{results.incompatible}</div>
            <div className="text-sm text-gray-500">Needs Updates</div>
          </div>
        </div>
      )}
    </div>
  )
}
