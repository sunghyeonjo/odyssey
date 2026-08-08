import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { TickerStats } from '@buffett-diary/shared'
import { tradesApi } from '@/api/trades'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TickerLogo } from '@/components/StockLogo'

type SortKey = 'ticker' | 'tradeCount' | 'winRate' | 'totalProfit' | 'avgProfit'

export default function TickerStatsTable() {
  const [sortBy, setSortBy] = useState<SortKey>('totalProfit')
  const [sortAsc, setSortAsc] = useState(false)

  const { data, isLoading } = useQuery<TickerStats[]>({
    queryKey: ['tickerStats'],
    queryFn: () => tradesApi.tickerStats().then((r) => r.data),
  })

  if (isLoading) return <div className="text-sm text-muted-foreground">불러오는 중...</div>
  if (!data?.length) return <div className="text-sm text-muted-foreground">데이터가 없습니다</div>

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(key)
      setSortAsc(false)
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortBy]
    const bv = b[sortBy]
    if (typeof av === 'string') return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  const arrow = (key: SortKey) => (sortBy === key ? (sortAsc ? ' ↑' : ' ↓') : '')

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => handleSort('ticker')}>
              종목{arrow('ticker')}
            </TableHead>
            <TableHead className="cursor-pointer text-right" onClick={() => handleSort('tradeCount')}>
              거래{arrow('tradeCount')}
            </TableHead>
            <TableHead className="cursor-pointer text-right" onClick={() => handleSort('winRate')}>
              승률{arrow('winRate')}
            </TableHead>
            <TableHead className="cursor-pointer text-right" onClick={() => handleSort('totalProfit')}>
              총 손익{arrow('totalProfit')}
            </TableHead>
            <TableHead className="cursor-pointer text-right" onClick={() => handleSort('avgProfit')}>
              평균 손익{arrow('avgProfit')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={row.ticker}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <TickerLogo ticker={row.ticker} className="h-5 w-5" />
                  <div>
                    <span className="font-medium">{row.ticker}</span>
                    {row.stockInfo?.nameKo && (
                      <span className="ml-1.5 text-xs text-muted-foreground">{row.stockInfo.nameKo}</span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {row.tradeCount}건
                <span className="ml-1 text-xs text-muted-foreground">
                  ({row.winCount}승 {row.lossCount}패)
                </span>
              </TableCell>
              <TableCell className="text-right">{row.winRate.toFixed(1)}%</TableCell>
              <TableCell className={`text-right font-medium ${row.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {row.totalProfit >= 0 ? '+' : ''}${row.totalProfit.toFixed(2)}
              </TableCell>
              <TableCell className={`text-right ${row.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {row.avgProfit >= 0 ? '+' : ''}${row.avgProfit.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
