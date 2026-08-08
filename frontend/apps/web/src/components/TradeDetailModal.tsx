import { useEffect, useState } from 'react'
import type { Trade, AuthorSummary } from '@buffett-diary/shared'
import { tradeImagesApi } from '@/api/trades'
import { formatDate } from '@/lib/date'
import { Badge } from '@/components/ui/badge'
import { TickerLogo } from '@/components/StockLogo'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import TradeCommentSection from '@/components/TradeCommentSection'

interface TradeDetailModalProps {
  trade: Trade
  onClose: () => void
  author?: AuthorSummary
  onAuthorClick?: (id: number) => void
}

export default function TradeDetailModal({ trade, onClose, author, onAuthorClick }: TradeDetailModalProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [currentImage, setCurrentImage] = useState(0)

  useEffect(() => {
    if (!trade.images.length) return
    const urls: string[] = []
    let cancelled = false

    Promise.all(
      trade.images.map((img) =>
        tradeImagesApi.fetchBlob(trade.id, img.id).then(({ data: blob }) => URL.createObjectURL(blob))
      )
    ).then((results) => {
      if (!cancelled) {
        urls.push(...results)
        setImageUrls(results)
      }
    }).catch(() => {})

    return () => {
      cancelled = true
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [trade.id, trade.images])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setCurrentImage((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setCurrentImage((i) => Math.min(imageUrls.length - 1, i + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, imageUrls.length])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="w-full max-w-lg max-h-[85vh] overflow-hidden rounded-xl border bg-background shadow-xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {author ? (
                <>
                  <button
                    onClick={() => onAuthorClick?.(author.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-xs font-bold text-primary-foreground"
                  >
                    {author.nickname.charAt(0).toUpperCase()}
                  </button>
                  <div className="min-w-0">
                    <button
                      className="text-sm font-semibold hover:underline"
                      onClick={() => onAuthorClick?.(author.id)}
                    >
                      {author.nickname}
                    </button>
                    <p className="text-xs text-muted-foreground">{formatDate(trade.tradeDate)}</p>
                  </div>
                </>
              ) : (
                <>
                  <TickerLogo ticker={trade.ticker} stockInfo={trade.stockInfo} className="h-8 w-8 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-semibold">{trade.ticker}</h2>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${trade.position === 'BUY'
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : 'border-blue-300 bg-blue-50 text-blue-700'}`}
                      >
                        {trade.position === 'BUY' ? '매수' : '매도'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(trade.tradeDate)}</p>
                  </div>
                </>
              )}
            </div>
            <button onClick={onClose} className="rounded-md p-1 hover:bg-muted ml-2 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Images */}
            {imageUrls.length > 0 && (
              <div className="relative bg-muted">
                <img src={imageUrls[currentImage]} alt="" className="w-full max-h-80 object-contain" />
                {imageUrls.length > 1 && (
                  <>
                    {currentImage > 0 && (
                      <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                        onClick={() => setCurrentImage((i) => i - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    )}
                    {currentImage < imageUrls.length - 1 && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                        onClick={() => setCurrentImage((i) => i + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {imageUrls.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 w-1.5 rounded-full ${i === currentImage ? 'bg-white' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* Ticker + Position (always shown when author header is used) */}
              {author && (
                <div className="flex items-center gap-2.5">
                  <TickerLogo ticker={trade.ticker} stockInfo={trade.stockInfo} className="h-8 w-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-semibold">{trade.ticker}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${trade.position === 'BUY'
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : 'border-blue-300 bg-blue-50 text-blue-700'}`}
                      >
                        {trade.position === 'BUY' ? '매수' : '매도'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* P&L */}
              {trade.profit != null && (
                <div className="rounded-lg bg-muted/50 px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground">손익</p>
                  <p className={`text-2xl font-bold tabular-nums ${trade.profit > 0 ? 'text-red-600' : trade.profit < 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                    {trade.profit > 0 ? '+' : trade.profit < 0 ? '-' : ''}${Math.abs(trade.profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {/* Trade details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">수량</p>
                  <p className="font-medium">{trade.quantity}주</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">매입가</p>
                  <p className="font-medium tabular-nums">${trade.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                {trade.exitPrice != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">매도가</p>
                    <p className="font-medium tabular-nums">${trade.exitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
              </div>

              {trade.reason && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">매매 메모</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap leading-relaxed">{trade.reason}</p>
                </div>
              )}

              {/* Comments */}
              <TradeCommentSection tradeId={trade.id} canComment />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
