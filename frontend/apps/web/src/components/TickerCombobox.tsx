import { useCallback, useEffect, useRef, useState } from 'react'
import type { Stock } from '@buffett-diary/shared'
import { stocksApi } from '@/api/stocks'
import { cn } from '@/lib/utils'
import { StockLogo } from '@/components/StockLogo'

interface TickerComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function TickerCombobox({ value, onChange, placeholder = 'AAPL 또는 삼성전자', className }: TickerComboboxProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<Stock[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const composingRef = useRef(false)

  // Sync external value changes
  useEffect(() => {
    setQuery(value)
  }, [value])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    try {
      const { data } = await stocksApi.search(q.trim())
      setResults(data)
      setOpen(data.length > 0)
      setActiveIndex(-1)
    } catch {
      setResults([])
      setOpen(false)
    }
  }, [])

  const scheduleSearch = useCallback((v: string) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 300)
  }, [search])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    // 영문만이면 대문자 변환, 한글 포함이면 원본 유지
    const normalized = /^[a-zA-Z0-9.\-\s]*$/.test(v) ? v.toUpperCase() : v
    setQuery(normalized)
    onChange(normalized)
    // IME 조합 중에는 검색 보류
    if (!composingRef.current) {
      scheduleSearch(normalized)
    }
  }

  // IME composition handlers — 한글 입력 시 마지막 글자 중복 방지
  const handleCompositionStart = () => {
    composingRef.current = true
  }

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false
    // 조합 완료 시점에 검색 실행
    const v = e.currentTarget.value
    const normalized = /^[a-zA-Z0-9.\-\s]*$/.test(v) ? v.toUpperCase() : v
    scheduleSearch(normalized)
  }

  const selectItem = (stock: Stock) => {
    setQuery(stock.ticker)
    onChange(stock.ticker)
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i < results.length - 1 ? i + 1 : i))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i > 0 ? i - 1 : -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectItem(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true) }}
        placeholder={placeholder}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/40 placeholder:normal-case focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {results.map((stock, i) => (
            <li
              key={stock.ticker}
              onMouseDown={() => selectItem(stock)}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                i === activeIndex && 'bg-accent text-accent-foreground',
              )}
            >
              <StockLogo stock={stock} />
              <span className="font-mono font-semibold">{stock.ticker}</span>
              {stock.nameKo && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="truncate text-muted-foreground">{stock.nameKo}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
