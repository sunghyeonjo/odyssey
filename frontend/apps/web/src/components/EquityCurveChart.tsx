import { useQuery } from '@tanstack/react-query'
import type { EquityCurvePoint } from '@buffett-diary/shared'
import { tradesApi } from '@/api/trades'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function EquityCurveChart() {
  const { data, isLoading } = useQuery<EquityCurvePoint[]>({
    queryKey: ['equityCurve'],
    queryFn: () => tradesApi.equityCurve().then((r) => r.data),
  })

  if (isLoading) return <div className="text-sm text-muted-foreground">불러오는 중...</div>
  if (!data?.length) return <div className="text-sm text-muted-foreground">데이터가 없습니다</div>

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          tickFormatter={(v: number) => `$${v}`}
        />
        <Tooltip
          formatter={(value: number) => [`$${value.toFixed(2)}`, '누적 손익']}
          labelFormatter={(label: string) => `날짜: ${label}`}
        />
        <Area
          type="monotone"
          dataKey="cumulativeProfit"
          stroke="#2563eb"
          fill="#2563eb"
          fillOpacity={0.1}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
