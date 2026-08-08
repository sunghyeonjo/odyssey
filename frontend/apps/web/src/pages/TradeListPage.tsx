import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Trade, TradeFilter } from '@buffett-diary/shared'
import dayjs from 'dayjs'
import { tradesApi, tradeImagesApi, tradeLikeApi } from '@/api/trades'
import { formatDate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, ImageIcon, X, Download, ChevronLeft, ChevronRight, List, MessageSquare, ThumbsUp, Loader2 } from 'lucide-react'
import { TabFilter } from '@/components/ui/tab-filter'
import { TickerCombobox } from '@/components/TickerCombobox'
import TradeFormModal from '@/components/TradeFormModal'
import BulkTradeModal from '@/components/BulkTradeModal'
import TradeForm from '@/components/TradeForm'
import TradeCommentSection from '@/components/TradeCommentSection'
import { TickerLogo } from '@/components/StockLogo'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const INITIAL_FILTER: TradeFilter = {
  size: 20,
}

// --- Image Viewer ---

function ImageViewer({
  images,
  initialIndex,
  onClose,
}: {
  images: { fileName: string; url: string }[]
  initialIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(initialIndex)
  const current = images[index]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex((i) => (i > 0 ? i - 1 : i))
      if (e.key === 'ArrowRight') setIndex((i) => (i < images.length - 1 ? i + 1 : i))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [images.length, onClose])

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = current.url
    a.download = current.fileName
    a.click()
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90" onClick={onClose}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm">
          {current.fileName}
          <span className="ml-2 text-white/60">{index + 1} / {images.length}</span>
        </span>
        <div className="flex items-center gap-1">
          <button onClick={handleDownload} className="rounded-md p-2 hover:bg-white/10" title="다운로드">
            <Download className="h-5 w-5" />
          </button>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-white/10" title="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div className="relative flex flex-1 items-center justify-center px-12" onClick={(e) => e.stopPropagation()}>
        {images.length > 1 && index > 0 && (
          <button
            onClick={() => setIndex((i) => i - 1)}
            className="absolute left-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <img
          src={current.url}
          alt={current.fileName}
          className="max-h-[calc(100vh-8rem)] max-w-full object-contain"
        />

        {images.length > 1 && index < images.length - 1 && (
          <button
            onClick={() => setIndex((i) => i + 1)}
            className="absolute right-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  )
}

// --- Detail Side Panel ---

function TradeDetailPanel({ trade, onClose, onSaved, onTradeUpdated }: { trade: Trade; onClose: () => void; onSaved: () => void; onTradeUpdated: (t: Trade) => void }) {
  const queryClient = useQueryClient()
  const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map())
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const likeMutation = useMutation({
    mutationFn: (liked: boolean | null) => tradeLikeApi.update(trade.id, { liked }),
    onSuccess: ({ data: updated }) => {
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      onTradeUpdated(updated)
    },
  })

  const loadImages = useCallback(async () => {
    if (!trade.images?.length) return
    const urls = new Map<number, string>()
    for (const img of trade.images) {
      try {
        const { data: blob } = await tradeImagesApi.fetchBlob(trade.id, img.id)
        urls.set(img.id, URL.createObjectURL(blob))
      } catch { /* skip */ }
    }
    setImageUrls(urls)
  }, [trade.id, trade.images])

  useEffect(() => {
    loadImages()
    return () => {
      imageUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [loadImages]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape (only when viewer is not open)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewerIndex === null) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, viewerIndex])

  const profitDisplay = () => {
    if (trade.profit == null) return null
    const v = trade.profit
    const formatted = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (v > 0) return <span className="font-semibold text-red-600">+${formatted}</span>
    if (v < 0) return <span className="font-semibold text-blue-600">-${formatted}</span>
    return <span className="text-muted-foreground">$0.00</span>
  }

  const handleLike = (liked: boolean) => {
    likeMutation.mutate(trade.myLike === liked ? null : liked)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-background shadow-xl transition-transform duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <TickerLogo ticker={trade.ticker} stockInfo={trade.stockInfo} className="h-8 w-8" />
            <div>
              <h2 className="text-lg font-semibold font-mono">{trade.ticker}</h2>
              <p className="text-sm text-muted-foreground">{formatDate(trade.tradeDate)}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {editing ? (
          /* Inline Edit Form */
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <TradeForm
              tradeId={trade.id}
              compact
              onCancel={() => setEditing(false)}
              onSaved={onSaved}
            />
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Summary */}
              <div className="divide-y text-sm">
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">구분</span>
                  <Badge
                    variant="outline"
                    className={trade.position === 'BUY'
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-blue-300 bg-blue-50 text-blue-700'}
                  >
                    {trade.position === 'BUY' ? '매수' : '매도'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">수량</span>
                  <span className="font-medium">
                    {Number.isInteger(trade.quantity) ? trade.quantity : trade.quantity.toFixed(6).replace(/\.?0+$/, '')}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">{trade.position === 'SELL' ? '매도가' : '매수가'}</span>
                  <span className="font-medium">${trade.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {trade.profit != null && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">손익</span>
                    <span className="font-medium">{profitDisplay()}</span>
                  </div>
                )}
              </div>

              {/* Memo */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">매매 사유</h3>
                {trade.reason ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{trade.reason}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">작성된 메모가 없습니다</p>
                )}
              </div>

              {/* Image Gallery */}
              {trade.images && trade.images.length > 0 && (() => {
                const selectedImg = trade.images[selectedImageIndex]
                const selectedUrl = selectedImg ? imageUrls.get(selectedImg.id) : undefined
                return (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                      첨부파일 ({trade.images.length})
                    </h3>

                    {/* Main preview */}
                    <div
                      className="cursor-pointer overflow-hidden rounded-lg border bg-muted/30"
                      onClick={() => selectedUrl && setViewerIndex(selectedImageIndex)}
                    >
                      <div className="aspect-[4/3]">
                        {selectedUrl ? (
                          <img src={selectedUrl} alt={selectedImg.fileName} className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="text-xs text-muted-foreground">...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Thumbnail strip */}
                    {trade.images.length > 1 && (
                      <div className="mt-2 flex gap-2">
                        {trade.images.map((img, i) => {
                          const url = imageUrls.get(img.id)
                          return (
                            <button
                              key={img.id}
                              onClick={() => setSelectedImageIndex(i)}
                              className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border transition-all ${
                                i === selectedImageIndex
                                  ? 'ring-2 ring-primary'
                                  : 'opacity-50 hover:opacity-100'
                              }`}
                            >
                              {url ? (
                                <img src={url} alt={img.fileName} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center bg-muted">
                                  <span className="text-[10px] text-muted-foreground">...</span>
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Like / Dislike */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">매매 평가</h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      trade.myLike === true
                        ? 'border-red-300 bg-red-50 text-red-600'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => handleLike(true)}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span className="tabular-nums">{trade.likeCount}</span>
                  </button>
                </div>
              </div>

              {/* Comments */}
              <TradeCommentSection tradeId={trade.id} canComment />
            </div>

            {/* Footer */}
            <div className="border-t px-5 py-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                수정하기
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Image Viewer */}
      {viewerIndex !== null && trade.images && (() => {
        const viewerImages = trade.images
          .map((img) => ({ fileName: img.fileName, url: imageUrls.get(img.id) }))
          .filter((item): item is { fileName: string; url: string } => !!item.url)
        return viewerImages.length > 0 ? (
          <ImageViewer
            images={viewerImages}
            initialIndex={Math.min(viewerIndex, viewerImages.length - 1)}
            onClose={() => setViewerIndex(null)}
          />
        ) : null
      })()}
    </>
  )
}

// --- Main Page ---

interface DateGroup {
  date: string
  label: string
  trades: Trade[]
  dayProfit: number | null
}

export default function TradeListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const dateParam = searchParams.get('date')
  const [filter, setFilter] = useState<TradeFilter>(() =>
    dateParam
      ? { ...INITIAL_FILTER, startDate: dateParam, endDate: dateParam }
      : INITIAL_FILTER,
  )
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [formTradeId, setFormTradeId] = useState<number | 'new' | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  const [ticker, setTicker] = useState('')
  const [position, setPosition] = useState('')

  const updateFilter = (patch: Partial<TradeFilter>) => {
    setFilter((f) => ({ ...f, ...patch }))
  }

  const resetFilters = () => {
    setTicker('')
    setPosition('')
    setFilter(INITIAL_FILTER)
    if (dateParam) setSearchParams({}, { replace: true })
  }

  const hasActiveFilters = ticker || position || dateParam

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['trades', filter],
    queryFn: ({ pageParam = 0 }) => tradesApi.list({ ...filter, page: pageParam }).then((r) => r.data),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages - 1 ? lastPage.page + 1 : undefined,
    initialPageParam: 0,
  })

  const allTrades = data?.pages.flatMap((p) => p.content) ?? []

  const observerRef = useRef<HTMLDivElement>(null)
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  )

  useEffect(() => {
    const el = observerRef.current
    if (!el) return
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleObserver])

  const deleteMutation = useMutation({
    mutationFn: tradesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      setSelectedTrade(null)
    },
  })

  const dateGroups = useMemo<DateGroup[]>(() => {
    const trades = allTrades
    const groupMap = new Map<string, Trade[]>()
    for (const t of trades) {
      const existing = groupMap.get(t.tradeDate)
      if (existing) existing.push(t)
      else groupMap.set(t.tradeDate, [t])
    }
    return Array.from(groupMap.entries()).map(([date, trades]) => {
      const d = dayjs(date)
      let dayProfit: number | null = null
      for (const t of trades) {
        if (t.profit != null) dayProfit = (dayProfit ?? 0) + t.profit
      }
      return {
        date,
        label: `${d.format('M월 D일')} ${WEEKDAYS[d.day()]}요일`,
        trades,
        dayProfit,
      }
    })
  }, [allTrades])

  const formatProfit = (v: number) => {
    const formatted = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (v > 0) return <span className="font-semibold tabular-nums text-red-600">+${formatted}</span>
    if (v < 0) return <span className="font-semibold tabular-nums text-blue-600">-${formatted}</span>
    return <span className="tabular-nums text-muted-foreground">$0.00</span>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">매매 내역</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            <List className="mr-1.5 h-3.5 w-3.5" />
            일괄 등록
          </Button>
          <Button size="sm" onClick={() => setFormTradeId('new')}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            새 매매
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <TabFilter
          options={[
            { value: '', label: '전체' },
            { value: 'BUY', label: '매수' },
            { value: 'SELL', label: '매도' },
          ]}
          value={position}
          onChange={(v) => {
            setPosition(v)
            updateFilter({ position: (v || undefined) as TradeFilter['position'] })
          }}
        />
        <div className="w-40">
          <TickerCombobox
            value={ticker}
            onChange={(v) => {
              setTicker(v)
              updateFilter({ ticker: v || undefined })
            }}
            placeholder="종목 검색"
          />
        </div>
        {dateParam && (
          <Badge variant="secondary" className="gap-1">
            {dateParam}
            <button onClick={resetFilters} className="ml-0.5 hover:opacity-70">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            필터 초기화
          </Button>
        )}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">매매 내역을 불러오는 중...</div>
      ) : dateGroups.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">매매 내역이 없습니다</div>
      ) : (
        <div className="space-y-4">
          {dateGroups.map((group) => (
            <div key={group.date}>
              {/* Date header */}
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-semibold text-muted-foreground">{group.label}</span>
                <span className="text-xs text-muted-foreground">
                  {group.trades.length}건
                  {group.dayProfit != null && (
                    <span className="ml-1.5">{formatProfit(group.dayProfit)}</span>
                  )}
                </span>
              </div>

              {/* Trades */}
              <div className="divide-y rounded-xl border">
                {group.trades.map((trade) => {
                  const hasSocial = trade.likeCount > 0 || trade.commentCount > 0
                  return (
                    <div
                      key={trade.id}
                      className="cursor-pointer px-3 py-2.5 hover:bg-muted/50"
                      onClick={() => setSelectedTrade(trade)}
                    >
                      {/* Row 1: ticker + position + price + profit */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TickerLogo ticker={trade.ticker} stockInfo={trade.stockInfo} className="h-6 w-6" />
                          <span className="font-mono text-sm font-semibold">{trade.ticker}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${trade.position === 'BUY'
                              ? 'border-red-300 bg-red-50 text-red-700'
                              : 'border-blue-300 bg-blue-50 text-blue-700'}`}
                          >
                            {trade.position === 'BUY' ? '매수' : '매도'}
                          </Badge>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            ${trade.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} × {Number.isInteger(trade.quantity) ? trade.quantity : trade.quantity.toFixed(6).replace(/\.?0+$/, '')}주
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {trade.profit != null && formatProfit(trade.profit)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('이 매매를 삭제하시겠습니까?')) deleteMutation.mutate(trade.id)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {/* Row 2: reason + images + social */}
                      {(trade.reason || (trade.images && trade.images.length > 0) || hasSocial) && (
                        <div className="mt-1 flex items-center gap-3 pl-8 text-[11px] text-muted-foreground">
                          {trade.reason && (
                            <span className="max-w-[200px] truncate">{trade.reason}</span>
                          )}
                          {trade.images && trade.images.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <ImageIcon className="h-3 w-3" />
                              {trade.images.length}
                            </span>
                          )}
                          {hasSocial && (
                            <>
                              {trade.likeCount > 0 && (
                                <span className="flex items-center gap-0.5 text-red-500">
                                  <ThumbsUp className="h-3 w-3" />
                                  {trade.likeCount}
                                </span>
                              )}
                              {trade.commentCount > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <MessageSquare className="h-3 w-3" />
                                  {trade.commentCount}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll observer */}
      {dateGroups.length > 0 && (
        <div ref={observerRef} className="py-4 text-center">
          {isFetchingNextPage && (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      {/* Detail Side Panel */}
      {selectedTrade && (
        <TradeDetailPanel
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          onSaved={() => setSelectedTrade(null)}
          onTradeUpdated={(updated) => setSelectedTrade(updated)}
        />
      )}

      {/* Bulk Trade Modal */}
      {bulkOpen && (
        <BulkTradeModal
          onClose={() => setBulkOpen(false)}
          onSaved={() => setBulkOpen(false)}
        />
      )}

      {/* Trade Form Modal */}
      {formTradeId !== null && (
        <TradeFormModal
          tradeId={formTradeId === 'new' ? undefined : formTradeId}
          onClose={() => setFormTradeId(null)}
          onSaved={() => setFormTradeId(null)}
        />
      )}
    </div>
  )
}
