use client

import React from "react"

export interface USStock {
  symbol: string
  code: string
  name: string
  price: number
  change24h: number
  changePercent24h: number
  volume: number
}

interface USStocksPanelProps {
  stocks: USStock[]
  locale?: string
  onStockClick?: (stock: USStock) => void
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return price.toFixed(2)
}

function formatVolume(volume: number): string {
  if (volume >= 1e9) return (volume / 1e9).toFixed(2) + "B"
  if (volume >= 1e6) return (volume / 1e6).toFixed(2) + "M"
  if (volume >= 1e3) return (volume / 1e3).toFixed(2) + "K"
  return volume.toFixed(0)
}

export function USStocksPanel({ stocks, locale = "zh", onStockClick }: USStocksPanelProps) {
  if (!stocks || stocks.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
        {locale === "zh" ? "暂无美股数据" : "No US stock data available"}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700">
            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-500">Code</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-500">Name</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-500">Price</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-500">24h Change</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-500">Volume</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => {
            const isPositive = stock.changePercent24h >= 0
            return (
              <tr 
                key={stock.symbol}
                className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                onClick={() => onStockClick?.(stock)}
              >
                <td className="py-3 px-4">
                  <span className="font-medium text-blue-600 dark:text-blue-400">{stock.code}</span>
                </td>
                <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">{stock.name}</td>
                <td className="py-3 px-4 text-right font-medium">${formatPrice(stock.price)}</td>
                <td className={"py-3 px-4 text-right font-medium " + (isPositive ? "text-green-600" : "text-red-600")}>
                  {isPositive ? "+" : ""}{stock.changePercent24h.toFixed(2)}%
                </td>
                <td className="py-3 px-4 text-right text-zinc-500">{formatVolume(stock.volume)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default USStocksPanel
