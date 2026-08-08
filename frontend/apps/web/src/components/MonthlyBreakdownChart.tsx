import { useQuery } from '@tanstack/react-query'
import type { MonthlyPnl } from '@buffett-diary/shared'
import { tradesApi } from '@/api/trades'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function formatCompact(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1000) return `$${(v / 1000).toFixed(1)}K`
  return `$${v}`
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const item = payload[0].payload as MonthlyPnl
  const isPositive = item.totalProfit >= 0
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-xs font-medium text-muted-foreground">{item.month}</p>
      <p className={`mt-1 text-base font-bold tabular-nums ${isPositive ? 'text-red-600' : 'text-blue-600'}`}>
        {isPositive ? '+' : '-'}${Math.abs(item.totalProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <div className="mt-1.5 flex gap-3 text-[11px] text-muted-foreground">
        <span>{item.tradeCount}건</span>
        <span>승률 {item.winRate.toFixed(1)}%</span>
      </div>
    </div>
  )
}

export default function MonthlyBreakdownChart() {
  const { data, isLoading } = useQuery<MonthlyPnl[]>({
    queryKey: ['monthlyPnl'],
    queryFn: () => tradesApi.monthlyPnl().then((r) => r.data),
  })

  if (isLoading) return <div className="text-sm text-muted-foreground">불러오는 중...</div>
  if (!data?.length) return <div className="text-sm text-muted-foreground">데이터가 없습니다</div>

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          tickFormatter={(v: string) => {
            const parts = v.split('-')
            return parts.length === 2 ? `${parseInt(parts[1])}월` : v
          }}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          tickFormatter={formatCompact}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
        <Bar dataKey="totalProfit" radius={[4, 4, 0, 0]} className="transition-opacity">
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.totalProfit >= 0 ? '#16a34a' : '#dc2626'}
              className="hover:opacity-80"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
