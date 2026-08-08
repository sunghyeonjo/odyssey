import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TradeRequest, Position } from '@buffett-diary/shared'
import { toDateString } from '@/lib/date'
import dayjs from 'dayjs'
import { tradesApi } from '@/api/trades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TickerCombobox } from '@/components/TickerCombobox'
import { X, Plus, Loader2 } from 'lucide-react'

interface RowData {
  id: number
  tradeDate: string
  ticker: string
  position: Position
  quantity: string
  entryPrice: string
  profit: string
  reason: string
}

function createEmptyRow(id: number): RowData {
  return {
    id,
    tradeDate: toDateString(dayjs()),
    ticker: '',
    position: 'BUY',
    quantity: '',
    entryPrice: '',
    profit: '',
    reason: '',
  }
}

interface BulkTradeModalProps {
  onClose: () => void
  onSaved: () => void
}

export default function BulkTradeModal({ onClose, onSaved }: BulkTradeModalProps) {
  const queryClient = useQueryClient()
  const [nextId, setNextId] = useState(2)
  const [rows, setRows] = useState<RowData[]>([createEmptyRow(1)])
  const [errors, setErrors] = useState<Map<number, Set<string>>>(new Map())

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const updateRow = (id: number, field: keyof RowData, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
    // Clear error for this field
    setErrors((prev) => {
      const next = new Map(prev)
      const fieldErrors = next.get(id)
      if (fieldErrors) {
        fieldErrors.delete(field)
        if (fieldErrors.size === 0) next.delete(id)
      }
      return next
    })
  }

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow(nextId)])
    setNextId((n) => n + 1)
  }

  const removeRow = (id: number) => {
    if (rows.length <= 1) return
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const validate = (): boolean => {
    const newErrors = new Map<number, Set<string>>()
    for (const row of rows) {
      const fields = new Set<string>()
      if (!row.tradeDate) fields.add('tradeDate')
      if (!row.ticker.trim()) fields.add('ticker')
      if (!row.quantity || Number(row.quantity) <= 0) fields.add('quantity')
      if (!row.entryPrice || Number(row.entryPrice) <= 0) fields.add('entryPrice')
      if (fields.size > 0) newErrors.set(row.id, fields)
    }
    setErrors(newErrors)
    return newErrors.size === 0
  }

  const mutation = useMutation({
    mutationFn: (data: TradeRequest[]) => tradesApi.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      onSaved()
    },
  })

  const handleSubmit = () => {
    if (!validate()) return
    const requests: TradeRequest[] = rows.map((row) => ({
      tradeDate: row.tradeDate,
      ticker: row.ticker.toUpperCase(),
      position: row.position,
      quantity: Number(row.quantity),
      entryPrice: Number(row.entryPrice),
      profit: row.position === 'SELL' && row.profit ? Number(row.profit) : null,
      reason: row.reason || null,
    }))
    mutation.mutate(requests)
  }

  const hasError = (rowId: number, field: string) => errors.get(rowId)?.has(field)

  const errorClass = (rowId: number, field: string) =>
    hasError(rowId, field) ? 'border-red-500 ring-1 ring-red-500' : ''

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>일괄 매매 등록</CardTitle>
              <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-2 font-medium">날짜</th>
                      <th className="pb-2 pr-2 font-medium">종목</th>
                      <th className="pb-2 pr-2 font-medium">구분</th>
                      <th className="pb-2 pr-2 font-medium">수량</th>
                      <th className="pb-2 pr-2 font-medium">단가($)</th>
                      <th className="pb-2 pr-2 font-medium">손익($)</th>
                      <th className="pb-2 pr-2 font-medium">메모</th>
                      <th className="pb-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-2 pr-2">
                          <Input
                            type="date"
                            value={row.tradeDate}
                            onChange={(e) => updateRow(row.id, 'tradeDate', e.target.value)}
                            className={`h-9 w-36 ${errorClass(row.id, 'tradeDate')}`}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <div className="w-32">
                            <TickerCombobox
                              value={row.ticker}
                              onChange={(v) => updateRow(row.id, 'ticker', v)}
                              placeholder="AAPL"
                              className={`h-9 ${errorClass(row.id, 'ticker')}`}
                            />
                          </div>
                        </td>
                        <td className="py-2 pr-2">
                          <Select
                            value={row.position}
                            onChange={(e) => updateRow(row.id, 'position', e.target.value)}
                            className="h-9 w-20"
                          >
                            <option value="BUY">매수</option>
                            <option value="SELL">매도</option>
                          </Select>
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={row.quantity}
                            onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                            placeholder="0"
                            className={`h-9 w-24 ${errorClass(row.id, 'quantity')}`}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={row.entryPrice}
                            onChange={(e) => updateRow(row.id, 'entryPrice', e.target.value)}
                            placeholder="0.00"
                            className={`h-9 w-28 ${errorClass(row.id, 'entryPrice')}`}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            type="number"
                            step="any"
                            value={row.profit}
                            onChange={(e) => updateRow(row.id, 'profit', e.target.value)}
                            placeholder={row.position === 'SELL' ? '0.00' : '-'}
                            disabled={row.position !== 'SELL'}
                            className="h-9 w-28"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            type="text"
                            value={row.reason}
                            onChange={(e) => updateRow(row.id, 'reason', e.target.value)}
                            placeholder="메모"
                            className="h-9 w-32"
                          />
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length <= 1}
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="mr-1 h-4 w-4" />
                행 추가
              </Button>

              {mutation.isError && (
                <p className="text-sm text-red-600">등록에 실패했습니다. 다시 시도해주세요.</p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  취소
                </Button>
                <Button onClick={handleSubmit} disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  일괄 등록 ({rows.length}건)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
