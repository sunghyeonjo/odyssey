import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Journal, JournalFilter, Trade } from '@buffett-diary/shared'
import dayjs from 'dayjs'
import { journalsApi, journalImagesApi, journalLikeApi } from '@/api/journals'
import { tradesApi } from '@/api/trades'
import { formatDate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Pencil, X, Download, ChevronLeft, ChevronRight, ThumbsUp, MessageSquare, Loader2 } from 'lucide-react'
import JournalFormModal from '@/components/JournalFormModal'
import JournalCommentSection from '@/components/JournalCommentSection'

const INITIAL_FILTER: JournalFilter = { size: 20 }

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
      <div className="flex items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
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
      <div className="relative flex flex-1 items-center justify-center px-12" onClick={(e) => e.stopPropagation()}>
        {images.length > 1 && index > 0 && (
          <button onClick={() => setIndex((i) => i - 1)} className="absolute left-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <img src={current.url} alt={current.fileName} className="max-h-[calc(100vh-8rem)] max-w-full object-contain" />
        {images.length > 1 && index < images.length - 1 && (
          <button onClick={() => setIndex((i) => i + 1)} className="absolute right-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  )
}

// --- Blog-style Journal List Item ---
function JournalListItem({
  journal,
  onClick,
}: {
  journal: Journal
  onClick: () => void
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!journal.images.length) return
    let revoked = false
    const firstImg = journal.images[0]
    journalImagesApi.fetchBlob(journal.id, firstImg.id).then(({ data: blob }) => {
      if (!revoked) setThumbnailUrl(URL.createObjectURL(blob))
    }).catch(() => {})
    return () => {
      revoked = true
      if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl)
    }
  }, [journal.id, journal.images]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="flex cursor-pointer gap-4 border-b py-5 transition-colors hover:bg-muted/30"
      onClick={onClick}
    >
      {/* Text content */}
      <div className="min-w-0 flex-1">
        <h3 className="text-xl font-bold">{journal.title}</h3>
        <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
          {journal.content}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {dayjs(journal.journalDate).format('YYYY.MM.DD')}
        </p>
      </div>

      {/* Thumbnail */}
      {thumbnailUrl && (
        <div className="shrink-0">
          <img
            src={thumbnailUrl}
            alt=""
            className="h-[140px] w-[140px] rounded-lg object-cover"
          />
        </div>
      )}
    </div>
  )
}

// --- Related Trades Section ---
function RelatedTrades({ journalDate }: { journalDate: string }) {
  const { data: tradesData } = useQuery({
    queryKey: ['trades', 'journal-related', journalDate],
    queryFn: () => tradesApi.list({ startDate: journalDate, endDate: journalDate, size: 50 }).then((r) => r.data),
  })

  const trades = tradesData?.content
  if (!trades?.length) return null

  const formatPrice = (n: number) => n.toLocaleString()

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">이 날의 매매</h3>
      <div className="space-y-2">
        {trades.map((trade: Trade) => (
          <div key={trade.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                  trade.position === 'BUY'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {trade.position === 'BUY' ? '매수' : '매도'}
              </span>
              <span className="font-medium">{trade.ticker}</span>
              <span className="text-muted-foreground">{trade.quantity}주</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">{formatPrice(trade.entryPrice)}원</span>
              {trade.profit != null && (
                <span className={`ml-2 font-medium ${trade.profit > 0 ? 'text-red-600' : trade.profit < 0 ? 'text-blue-600' : ''}`}>
                  {trade.profit > 0 ? '+' : ''}{formatPrice(trade.profit)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Journal Detail Panel ---
function JournalDetailPanel({
  journal,
  onClose,
  onEdit,
  onJournalUpdated,
}: {
  journal: Journal
  onClose: () => void
  onEdit: () => void
  onJournalUpdated: (updated: Journal) => void
}) {
  const queryClient = useQueryClient()
  const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map())
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const deleteMutation = useMutation({
    mutationFn: () => journalsApi.delete(journal.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
      onClose()
    },
  })

  const likeMutation = useMutation({
    mutationFn: (liked: boolean | null) => journalLikeApi.update(journal.id, { liked }),
    onSuccess: ({ data: updated }) => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
      onJournalUpdated(updated)
    },
  })

  const handleLike = (liked: boolean) => {
    likeMutation.mutate(journal.myLike === liked ? null : liked)
  }

  const loadImages = useCallback(async () => {
    if (!journal.images?.length) return
    const urls = new Map<number, string>()
    for (const img of journal.images) {
      try {
        const { data: blob } = await journalImagesApi.fetchBlob(journal.id, img.id)
        urls.set(img.id, URL.createObjectURL(blob))
      } catch { /* skip */ }
    }
    setImageUrls(urls)
  }, [journal.id, journal.images])

  useEffect(() => {
    loadImages()
    return () => {
      imageUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [loadImages]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewerIndex === null) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, viewerIndex])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{journal.title}</h2>
            <p className="text-sm text-muted-foreground">{formatDate(journal.journalDate)}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{journal.content}</p>
          </div>

          {/* Like / Dislike */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">일지 평가</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  journal.myLike === true
                    ? 'border-red-300 bg-red-50 text-red-600'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => handleLike(true)}
              >
                <ThumbsUp className="h-4 w-4" />
                <span className="tabular-nums">{journal.likeCount}</span>
              </button>
            </div>
          </div>

          {/* Image Gallery */}
          {journal.images && journal.images.length > 0 && (() => {
            const selectedImg = journal.images[selectedImageIndex]
            const selectedUrl = selectedImg ? imageUrls.get(selectedImg.id) : undefined
            return (
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  첨부파일 ({journal.images.length})
                </h3>
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
                {journal.images.length > 1 && (
                  <div className="mt-2 flex gap-2">
                    {journal.images.map((img, i) => {
                      const url = imageUrls.get(img.id)
                      return (
                        <button
                          key={img.id}
                          onClick={() => setSelectedImageIndex(i)}
                          className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border transition-all ${
                            i === selectedImageIndex ? 'ring-2 ring-primary' : 'opacity-50 hover:opacity-100'
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

          {/* Related Trades */}
          <RelatedTrades journalDate={journal.journalDate} />

          {/* Comments */}
          <JournalCommentSection journalId={journal.id} canComment />
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t px-5 py-3">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            수정하기
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm('이 일지를 삭제하시겠습니까?')) deleteMutation.mutate()
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewerIndex !== null && journal.images && (() => {
        const viewerImages = journal.images
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
export default function JournalListPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<JournalFilter>(INITIAL_FILTER)
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null)
  const [formJournalId, setFormJournalId] = useState<number | 'new' | null>(null)

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['journals', filter],
    queryFn: ({ pageParam = 0 }) => journalsApi.list({ ...filter, page: pageParam }).then((r) => r.data),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages - 1 ? lastPage.page + 1 : undefined,
    initialPageParam: 0,
  })

  const journals = data?.pages.flatMap((p) => p.content) ?? []

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

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">투자일지</h1>
        <Button size="sm" onClick={() => setFormJournalId('new')}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          새 일지
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">일지를 불러오는 중...</div>
      ) : !journals.length ? (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-lg">작성된 투자일지가 없습니다</p>
          <p className="mt-1 text-sm">오늘의 시장 뷰와 투자 생각을 기록해보세요</p>
        </div>
      ) : (
        <>
          <div>
            {journals.map((journal) => (
              <JournalListItem
                key={journal.id}
                journal={journal}
                onClick={() => setSelectedJournal(journal)}
              />
            ))}
          </div>

          <div ref={observerRef} className="py-4 text-center">
            {isFetchingNextPage && (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </div>
        </>
      )}

      {/* Detail Panel */}
      {selectedJournal && (
        <JournalDetailPanel
          journal={selectedJournal}
          onClose={() => setSelectedJournal(null)}
          onEdit={() => {
            setFormJournalId(selectedJournal.id)
            setSelectedJournal(null)
          }}
          onJournalUpdated={(updated) => setSelectedJournal(updated)}
        />
      )}

      {/* Form Modal */}
      {formJournalId !== null && (
        <JournalFormModal
          journalId={formJournalId === 'new' ? undefined : formJournalId}
          onClose={() => setFormJournalId(null)}
          onSaved={() => {
            setFormJournalId(null)
            queryClient.invalidateQueries({ queryKey: ['journals'] })
          }}
        />
      )}
    </div>
  )
}
