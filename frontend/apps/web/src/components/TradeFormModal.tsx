import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X } from 'lucide-react'
import TradeForm from '@/components/TradeForm'

interface TradeFormModalProps {
  tradeId?: number
  onClose: () => void
  onSaved: () => void
}

export default function TradeFormModal({ tradeId, onClose, onSaved }: TradeFormModalProps) {
  const isEdit = tradeId != null

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Modal container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{isEdit ? '매매 수정' : '새 매매 기록'}</CardTitle>
              <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <TradeForm tradeId={tradeId} onCancel={onClose} onSaved={onSaved} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
