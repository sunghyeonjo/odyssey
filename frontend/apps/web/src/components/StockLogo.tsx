import { useState } from 'react'
import type { Stock, StockSummary } from '@buffett-diary/shared'
import { cn } from '@/lib/utils'

// Module-level cache: remembers tickers whose logos returned 404.
// Prevents re-requesting broken images across component remounts.
const failedLogos = new Set<string>()

function LogoFallback({ letter, className }: { letter: string; className?: string }) {
  const size = className ?? 'h-6 w-6'
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold', size)}>
      {letter}
    </span>
  )
}

function logoSrc(ticker: string) {
  return `/logos/${ticker.toLowerCase()}.png`
}

/** Render logo from a Stock object directly */
export function StockLogo({ stock, className }: { stock: Stock; className?: string }) {
  const [error, setError] = useState(() => failedLogos.has(stock.ticker))
  const size = className ?? 'h-6 w-6'

  if (error) {
    return <LogoFallback letter={stock.ticker[0]} className={className} />
  }

  return (
    <img
      src={logoSrc(stock.ticker)}
      alt={stock.ticker}
      className={cn('shrink-0 rounded-full', size)}
      onError={() => {
        failedLogos.add(stock.ticker)
        setError(true)
      }}
    />
  )
}

/** Render logo by ticker */
export function TickerLogo({ ticker, stockInfo, className }: { ticker: string; stockInfo?: StockSummary | null; className?: string }) {
  const [error, setError] = useState(() => failedLogos.has(ticker))
  const size = className ?? 'h-6 w-6'

  if (error) {
    return <LogoFallback letter={ticker[0]} className={className} />
  }

  return (
    <img
      src={logoSrc(ticker)}
      alt={ticker}
      className={cn('shrink-0 rounded-full', size)}
      onError={() => {
        failedLogos.add(ticker)
        setError(true)
      }}
    />
  )
}
