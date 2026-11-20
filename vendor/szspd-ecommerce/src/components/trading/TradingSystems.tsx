'use client'

import React from 'react'

export interface TradingSystem {
  id: string
  name: string
  markets: string[]
  icon: string
  features: string[]
}

interface TradingSystemsProps {
  systems: TradingSystem[]
  enabledSystems: string[]
  locale?: string
  onSystemToggle?: (systemId: string) => void
}

const SYSTEM_ICONS: Record<string, string> = {
  exchange: '🔄',
  chart: '📊',
  lightning: '⚡',
  cake: '🍰',
  unicorn: '🦄',
  'chart-bar': '📈',
}

export function TradingSystems({ 
  systems, 
  enabledSystems, 
  locale = 'zh',
  onSystemToggle 
}: TradingSystemsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {systems.map((system) => {
        const isEnabled = enabledSystems.includes(system.id)
        return (
          <div
            key={system.id}
            className={
              isEnabled 
                ? 'relative rounded-xl border border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-4 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02]' 
                : 'relative rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 transition-all cursor-pointer opacity-60 hover:shadow-md hover:scale-[1.02]'
            }
            onClick={() => onSystemToggle?.(system.id)}
          >
            <div className="text-3xl mb-2">
              {SYSTEM_ICONS[system.icon] || '📦'}
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
              {system.name}
            </h3>
            <div className="flex flex-wrap gap-1 mb-2">
              {system.markets.map((market) => (
                <span 
                  key={market}
                  className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                >
                  {market}
                </span>
              ))}
            </div>
            <div className="space-y-1">
              {system.features.slice(0, 2).map((feature) => (
                <div 
                  key={feature}
                  className="text-xs text-zinc-500 dark:text-zinc-400"
                >
                  • {feature}
                </div>
              ))}
            </div>
            {isEnabled && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500" />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default TradingSystems
