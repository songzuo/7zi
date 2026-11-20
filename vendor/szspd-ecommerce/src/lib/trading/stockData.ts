/**
 * Stock Data Provider - Binance US Stocks Integration
 * Supports tokenized US stocks on Binance
 */

// Binance US Stock tokens (Tokenized stocks ending with US)
export const US_STOCKS = [
  { symbol: 'TSLAUSDT', name: 'Tesla', code: 'TSLA' },
  { symbol: 'GOOGLUSDT', name: 'Alphabet (Google)', code: 'GOOGL' },
  { symbol: 'AAPLUSDT', name: 'Apple', code: 'AAPL' },
  { symbol: 'AMZNUSDT', name: 'Amazon', code: 'AMZN' },
  { symbol: 'NVDAUSDT', name: 'NVIDIA', code: 'NVDA' },
  { symbol: 'MSFTUSDT', name: 'Microsoft', code: 'MSFT' },
  { symbol: 'METAUSDT', name: 'Meta Platforms', code: 'META' },
  { symbol: 'NFLXUSDT', name: 'Netflix', code: 'NFLX' },
  { symbol: 'AMDUSDT', name: 'AMD', code: 'AMD' },
  { symbol: 'INTCUSDT', name: 'Intel', code: 'INTC' },
]

export interface StockData {
  symbol: string
  code: string
  name: string
  price: number
  change24h: number
  changePercent24h: number
  volume: number
  high24h: number
  low24h: number
}

/**
 * Fetch US stock data from Binance API
 */
export async function fetchUSStockData(): Promise<StockData[]> {
  const results: StockData[] = []

  for (const stock of US_STOCKS) {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${stock.symbol}`
      )
      
      if (!response.ok) continue
      
      const data = await response.json()
      
      results.push({
        symbol: stock.symbol,
        code: stock.code,
        name: stock.name,
        price: parseFloat(data.lastPrice) || 0,
        change24h: parseFloat(data.priceChange) || 0,
        changePercent24h: parseFloat(data.priceChangePercent) || 0,
        volume: parseFloat(data.volume) || 0,
        high24h: parseFloat(data.highPrice) || 0,
        low24h: parseFloat(data.lowPrice) || 0,
      })
    } catch (error) {
      console.error(`Failed to fetch ${stock.symbol}:`, error)
    }
  }

  return results
}

/**
 * Get single stock data
 */
export async function getUSStock(symbol: string): Promise<StockData | null> {
  const stock = US_STOCKS.find(s => s.code === symbol || s.symbol === symbol)
  if (!stock) return null

  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${stock.symbol}`
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    return {
      symbol: stock.symbol,
      code: stock.code,
      name: stock.name,
      price: parseFloat(data.lastPrice) || 0,
      change24h: parseFloat(data.priceChange) || 0,
      changePercent24h: parseFloat(data.priceChangePercent) || 0,
      volume: parseFloat(data.volume) || 0,
      high24h: parseFloat(data.highPrice) || 0,
      low24h: parseFloat(data.lowPrice) || 0,
    }
  } catch (error) {
    console.error(`Failed to fetch ${stock.symbol}:`, error)
    return null
  }
}

export default { US_STOCKS, fetchUSStockData, getUSStock }
