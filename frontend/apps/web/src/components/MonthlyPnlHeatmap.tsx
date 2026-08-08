import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { DailyPnlEntry } from '@buffett-diary/shared'
import { tradesApi } from '@/api/trades'
import { cn } from '@/lib/utils'

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function getColor(profit: number, max: number): string {
  if (profit === 0) return 'bg-muted'
  const intensity = Math.min(Math.abs(profit) / max, 1)
  if (profit > 0) {
    if (intensity > 0.75) return 'bg-green-600'
    if (intensity > 0.5) return 'bg-green-500'
    if (intensity > 0.25) return 'bg-green-400'
    return 'bg-green-300'
  }
  if (intensity > 0.75) return 'bg-red-600'
  if (intensity > 0.5) return 'bg-red-500'
  if (intensity > 0.25) return 'bg-red-400'
  return 'bg-red-300'
}

export default function MonthlyPnlHeatmap() {
  const navigate = useNavigate()
  const [year, setYear] = useState(new Date().getFullYear())

  const { data, isLoading } = useQuery<DailyPnlEntry[]>({
    queryKey: ['dailyPnl', year],
    queryFn: () => tradesApi.dailyPnl(year).then((r) => r.data),
  })

  if (isLoading) return <div className="text-sm text-muted-foreground">불러오는 중...</div>

  const profitMap = new Map<string, number>()
  data?.forEach((d) => profitMap.set(d.date, d.profit))

  const maxAbsProfit = data?.length
    ? Math.max(...data.map((d) => Math.abs(d.profit)), 1)
    : 1

  // Build weeks grid
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year, 11, 31)
  const weeks: { date: Date; profit: number | null }[][] = []
  let currentWeek: { date: Date; profit: number | null }[] = []

  // Pad start
  const startDay = startDate.getDay()
  for (let i = 0; i < startDay; i++) {
    currentWeek.push({ date: new Date(0), profit: null })
  }

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    currentWeek.push({ date: new Date(d), profit: profitMap.get(dateStr) ?? null })
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: new Date(0), profit: null })
    }
    weeks.push(currentWeek)
  }

  // Month labels with approximate positions
  const monthPositions: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, i) => {
    const validDay = week.find((d) => d.profit !== null || d.date.getFullYear() === year)
    if (validDay && validDay.date.getFullYear() === year) {
      const m = validDay.date.getMonth()
      if (m !== lastMonth) {
        monthPositions.push({ label: MONTHS[m], col: i })
        lastMonth = m
      }
    }
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setYear((y) => y - 1)}
          className="rounded border px-2 py-0.5 text-sm hover:bg-accent"
        >
          &lt;
        </button>
        <span className="text-sm font-medium">{year}</span>
        <button
          onClick={() => setYear((y) => y + 1)}
          className="rounded border px-2 py-0.5 text-sm hover:bg-accent"
        >
          &gt;
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-0.5">
          {/* Month labels */}
          <div className="flex gap-0.5 pl-8">
            {monthPositions.map(({ label, col }, i) => {
              const nextCol = monthPositions[i + 1]?.col ?? weeks.length
              const span = nextCol - col
              return (
                <div
                  key={label}
                  className="text-xs text-muted-foreground"
                  style={{ width: `${span * 13}px` }}
                >
                  {label}
                </div>
              )
            })}
          </div>

          {/* Grid */}
          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 pr-1">
              {DAYS.map((day, i) => (
                <div key={i} className="flex h-[11px] w-6 items-center justify-end text-[10px] text-muted-foreground">
                  {i % 2 === 1 ? day : ''}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((cell, di) => {
                  const dateStr = cell.date.getFullYear() === year
                    ? cell.date.toISOString().slice(0, 10)
                    : ''
                  const hasTrade = cell.profit !== null
                  return (
                    <div
                      key={di}
                      title={
                        hasTrade
                          ? `${dateStr}: $${cell.profit!.toFixed(2)}`
                          : dateStr
                      }
                      onClick={hasTrade ? () => navigate(`/trades?date=${dateStr}`) : undefined}
                      className={cn(
                        'h-[11px] w-[11px] rounded-sm',
                        cell.date.getFullYear() !== year
                          ? 'bg-transparent'
                          : hasTrade
                            ? getColor(cell.profit!, maxAbsProfit)
                            : 'bg-muted/50',
                        hasTrade && 'cursor-pointer ring-offset-background hover:ring-1 hover:ring-foreground/30',
                      )}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>손실</span>
            <div className="h-[11px] w-[11px] rounded-sm bg-red-500" />
            <div className="h-[11px] w-[11px] rounded-sm bg-red-300" />
            <div className="h-[11px] w-[11px] rounded-sm bg-muted/50" />
            <div className="h-[11px] w-[11px] rounded-sm bg-green-300" />
            <div className="h-[11px] w-[11px] rounded-sm bg-green-500" />
            <span>수익</span>
          </div>
        </div>
      </div>
    </div>
  )
}
