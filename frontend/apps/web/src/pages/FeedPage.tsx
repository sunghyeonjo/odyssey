import { useState, useCallback, useEffect, useRef } from 'react'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { FeedItem, AuthorSummary } from '@buffett-diary/shared'
import { feedApi } from '@/api/feed'
import { usersApi } from '@/api/users'
import { followsApi } from '@/api/follows'
import { formatDate } from '@/lib/date'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TickerLogo } from '@/components/StockLogo'
import TradeDetailModal from '@/components/TradeDetailModal'
import JournalCommentSection from '@/components/JournalCommentSection'
import { journalImagesApi } from '@/api/journals'
import { ImageIcon, Search, ThumbsUp, MessageSquare, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react'

function getGreetingSubtitle(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '좋은 아침입니다 ☀️'
  if (hour < 18) return '활기찬 하루 보내고 계신가요? 🌤️'
  return '마음을 편하게 가지고 오늘을 잘 마무리하세요 🌙'
}

export default function FeedPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null)

  // User search state
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['userSearch', searchQuery],
    queryFn: () => usersApi.search(searchQuery).then((r) => r.data),
    enabled: searchQuery.length > 0,
  })

  const followMutation = useMutation({
    mutationFn: (userId: number) => followsApi.follow(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userSearch'] }),
  })

  const unfollowMutation = useMutation({
    mutationFn: (userId: number) => followsApi.unfollow(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userSearch'] }),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput.trim())
  }

  // Feed infinite scroll
  const {
    data: feedData,
    isLoading: feedLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 0 }) => feedApi.list(pageParam).then((r) => r.data),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages - 1 ? lastPage.page + 1 : undefined,
    initialPageParam: 0,
  })

  const feedItems = feedData?.pages.flatMap((p) => p.content) ?? []

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

  const handleAuthorClick = (id: number) => {
    setSelectedFeedItem(null)
    navigate(`/users/${id}`)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-lg font-bold">안녕하세요, {user?.nickname}님</h1>
        <p className="text-sm text-muted-foreground">{getGreetingSubtitle()}</p>
      </div>

      {/* User Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="닉네임으로 투자자 검색"
          className="pl-9 pr-16"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!searchInput.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7"
        >
          검색
        </Button>
      </form>

      {/* Search Results */}
      {searchQuery && (
        <div>
          {searchLoading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">검색 중...</div>
          ) : !searchData?.content.length ? (
            <div className="py-4 text-center text-sm text-muted-foreground">검색 결과가 없습니다</div>
          ) : (
            <div className="divide-y rounded-xl border">
              {searchData.content.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <button
                    className="flex items-center gap-3 min-w-0"
                    onClick={() => navigate(u.id === user?.id ? '/mypage' : `/users/${u.id}`)}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-xs font-bold text-primary-foreground">
                      {u.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-semibold truncate">{u.nickname}</p>
                      {u.bio && <p className="text-xs text-muted-foreground truncate">{u.bio}</p>}
                    </div>
                  </button>
                  {user?.id !== u.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-3 shrink-0 h-8 text-xs"
                      onClick={() => navigate(`/users/${u.id}`)}
                    >
                      프로필 보기
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feed */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground">피드</h2>

        {feedLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</div>
        ) : !feedItems.length ? (
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-dashed px-4 py-3">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium">팔로우한 투자자가 없습니다</p>
                <p className="text-xs text-muted-foreground">위 검색바에서 다른 투자자를 찾아 팔로우해보세요</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-2.5 space-y-3">
              {feedItems.map((item, i) => (
                <FeedCard
                  key={`${item.type}-${i}`}
                  item={item}
                  onAuthorClick={(id) => navigate(`/users/${id}`)}
                  onClick={() => setSelectedFeedItem(item)}
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
      </div>

      {/* Feed Detail Modals */}
      {selectedFeedItem?.type === 'trade' && selectedFeedItem.trade && (
        <TradeDetailModal
          trade={selectedFeedItem.trade}
          author={selectedFeedItem.author}
          onAuthorClick={handleAuthorClick}
          onClose={() => setSelectedFeedItem(null)}
        />
      )}
      {selectedFeedItem?.type === 'journal' && selectedFeedItem.journal && (
        <JournalDetailModal
          journal={selectedFeedItem.journal}
          author={selectedFeedItem.author}
          onAuthorClick={handleAuthorClick}
          onClose={() => setSelectedFeedItem(null)}
        />
      )}
    </div>
  )
}

function FeedCard({
  item,
  onAuthorClick,
  onClick,
}: {
  item: FeedItem
  onAuthorClick: (id: number) => void
  onClick: () => void
}) {
  const authorInitial = item.author.nickname.charAt(0).toUpperCase()

  if (item.type === 'journal' && item.journal) {
    const journal = item.journal
    return (
      <div
        className="cursor-pointer rounded-xl border p-4 transition-colors hover:bg-muted/30"
        onClick={onClick}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={(e) => { e.stopPropagation(); onAuthorClick(item.author.id) }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-xs font-bold text-primary-foreground"
          >
            {authorInitial}
          </button>
          <div className="min-w-0 flex-1">
            <button className="text-sm font-semibold hover:underline" onClick={(e) => { e.stopPropagation(); onAuthorClick(item.author.id) }}>
              {item.author.nickname}
            </button>
            <p className="text-xs text-muted-foreground">{formatDate(journal.journalDate)}</p>
          </div>
          <Badge variant="secondary" className="text-[10px]">투자일지</Badge>
        </div>
        <div className="mt-3">
          <h3 className="font-semibold">{journal.title}</h3>
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground leading-relaxed">{journal.content}</p>
        </div>
        {journal.images.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            사진 {journal.images.length}장
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5" />
            {journal.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {journal.commentCount}
          </span>
        </div>
      </div>
    )
  }

  if (item.type === 'trade' && item.trade) {
    const trade = item.trade
    return (
      <div
        className="cursor-pointer rounded-xl border p-4 transition-colors hover:bg-muted/30"
        onClick={onClick}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={(e) => { e.stopPropagation(); onAuthorClick(item.author.id) }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-xs font-bold text-primary-foreground"
          >
            {authorInitial}
          </button>
          <div className="min-w-0 flex-1">
            <button className="text-sm font-semibold hover:underline" onClick={(e) => { e.stopPropagation(); onAuthorClick(item.author.id) }}>
              {item.author.nickname}
            </button>
            <p className="text-xs text-muted-foreground">{formatDate(trade.tradeDate)}</p>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] ${trade.position === 'BUY'
              ? 'border-red-300 bg-red-50 text-red-700'
              : 'border-blue-300 bg-blue-50 text-blue-700'}`}
          >
            {trade.position === 'BUY' ? '매수' : '매도'}
          </Badge>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <TickerLogo ticker={trade.ticker} stockInfo={trade.stockInfo} className="h-8 w-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-mono text-sm font-semibold">{trade.ticker}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {trade.quantity}주 · ${trade.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {trade.profit != null && (
            <span className={`text-sm font-semibold tabular-nums ${trade.profit > 0 ? 'text-red-600' : trade.profit < 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
              {trade.profit > 0 ? '+' : '-'}${Math.abs(trade.profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {trade.reason && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">{trade.reason}</p>
        )}

        <div className="mt-2.5 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5" />
            {trade.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {trade.commentCount}
          </span>
        </div>
      </div>
    )
  }

  return null
}

function JournalDetailModal({
  journal,
  author,
  onAuthorClick,
  onClose,
}: {
  journal: NonNullable<FeedItem['journal']>
  author: AuthorSummary
  onAuthorClick: (id: number) => void
  onClose: () => void
}) {
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [currentImage, setCurrentImage] = useState(0)

  useEffect(() => {
    if (!journal.images.length) return
    let cancelled = false
    const urls: string[] = []

    Promise.all(
      journal.images.map((img) =>
        journalImagesApi.fetchBlob(journal.id, img.id).then(({ data: blob }) => URL.createObjectURL(blob))
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
  }, [journal.id, journal.images])

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
          {/* Header — author */}
          <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => onAuthorClick(author.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-xs font-bold text-primary-foreground"
              >
                {author.nickname.charAt(0).toUpperCase()}
              </button>
              <div className="min-w-0">
                <button
                  className="text-sm font-semibold hover:underline"
                  onClick={() => onAuthorClick(author.id)}
                >
                  {author.nickname}
                </button>
                <p className="text-xs text-muted-foreground">{formatDate(journal.journalDate)}</p>
              </div>
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

            {/* Content */}
            <div className="p-4 space-y-4">
              <div>
                <h2 className="text-lg font-bold">{journal.title}</h2>
                <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">{journal.content}</p>
              </div>

              <div className="border-t pt-4">
                <JournalCommentSection journalId={journal.id} canComment={true} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
