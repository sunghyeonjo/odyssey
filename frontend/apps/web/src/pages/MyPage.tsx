import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { FollowUser, TradeStats } from '@buffett-diary/shared'
import { useAuth } from '@/contexts/AuthContext'
import { usersApi } from '@/api/users'
import { followsApi } from '@/api/follows'
import { tradesApi } from '@/api/trades'
import { formatDate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TabFilter } from '@/components/ui/tab-filter'
import { Badge } from '@/components/ui/badge'
import { Settings, BarChart3, Mail, Calendar, X, Bell, UserPlus, MessageSquare, Heart } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import EditProfileModal from '@/components/EditProfileModal'

const EquityCurveChart = lazy(() => import('@/components/EquityCurveChart'))
const MonthlyBreakdownChart = lazy(() => import('@/components/MonthlyBreakdownChart'))
const MonthlyPnlHeatmap = lazy(() => import('@/components/MonthlyPnlHeatmap'))
const TickerStatsTable = lazy(() => import('@/components/TickerStatsTable'))

type AnalyticsTab = 'heatmap' | 'equity' | 'monthly' | 'ticker'

const ANALYTICS_TABS: { value: AnalyticsTab; label: string }[] = [
  { value: 'heatmap', label: '히트맵' },
  { value: 'equity', label: '손익 곡선' },
  { value: 'monthly', label: '월별 손익' },
  { value: 'ticker', label: '종목별 통계' },
]

export default function MyPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editingProfile, setEditingProfile] = useState(false)
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const userId = user?.id ?? 0

  const { data: profile } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => usersApi.profile(userId).then((r) => r.data),
    enabled: userId > 0,
  })

  const { data: stats } = useQuery({
    queryKey: ['tradeStats', 'all'],
    queryFn: () => tradesApi.stats('all').then((r) => r.data),
  })

  const { data: notifSettings, isLoading: notifLoading } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: () => usersApi.getNotificationSettings().then((r) => r.data),
  })

  const notifMutation = useMutation({
    mutationFn: (data: { followNotify?: boolean; commentNotify?: boolean; likeNotify?: boolean }) =>
      usersApi.updateNotificationSettings(data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['notificationSettings'] })
      const prev = queryClient.getQueryData<{ followNotify: boolean; commentNotify: boolean; likeNotify: boolean }>(['notificationSettings'])
      if (prev) {
        queryClient.setQueryData(['notificationSettings'], { ...prev, ...newData })
      }
      return { prev }
    },
    onError: (_err, _data, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['notificationSettings'], context.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteAccount(),
    onSuccess: () => logout(),
  })

  if (!user) return null

  const initial = user.nickname.charAt(0).toUpperCase()

  const profitColor = (v: number) =>
    v > 0 ? 'text-red-600' : v < 0 ? 'text-blue-600' : 'text-muted-foreground'

  const formatMoney = (v: number) => {
    const sign = v > 0 ? '+' : v < 0 ? '-' : ''
    return `${sign}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const hasTrades = stats && stats.totalTrades > 0

  return (
    <div className="mx-auto max-w-2xl">
      {/* Profile Header */}
      <div className="flex items-start gap-5 py-4 sm:gap-8">
        {/* Avatar */}
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-3xl font-bold text-primary-foreground sm:h-24 sm:w-24">
          {initial}
        </div>

        {/* Info */}
        <div className="flex-1 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{user.nickname}</h1>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setEditingProfile(true)}>
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              편집
            </Button>
          </div>

          {/* Stats — clickable counts */}
          <div className="mt-3 flex gap-5 text-sm">
            <button className="hover:opacity-70" onClick={() => setFollowModal('followers')}>
              <strong>{profile?.followerCount ?? 0}</strong>
              <span className="ml-1 text-muted-foreground">팔로워</span>
            </button>
            <button className="hover:opacity-70" onClick={() => setFollowModal('following')}>
              <strong>{profile?.followingCount ?? 0}</strong>
              <span className="ml-1 text-muted-foreground">팔로잉</span>
            </button>
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p className="mt-2.5 text-sm whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Badges */}
      {profile?.badges && profile.badges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 px-0">
          {profile.badges.map((b) => (
            <Badge key={b.type} variant="secondary" title={b.description}>
              {b.name}
            </Badge>
          ))}
        </div>
      )}

      {/* 분석 섹션 */}
      {hasTrades && (
        <AnalyticsSection stats={stats!} profitColor={profitColor} formatMoney={formatMoney} />
      )}

      {/* 알림 설정 섹션 */}
      <section className="mt-8 space-y-3 border-t pt-6">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Bell className="h-4 w-4" />
          알림 설정
        </h2>
        {notifLoading ? (
          <div className="py-4 text-center text-xs text-muted-foreground">불러오는 중...</div>
        ) : (
          <div className="space-y-1">
            {([
              { key: 'followNotify' as const, label: '팔로우 알림', desc: '누군가 나를 팔로우할 때', icon: UserPlus },
              { key: 'commentNotify' as const, label: '댓글 알림', desc: '내 게시물에 댓글이 달릴 때', icon: MessageSquare },
              { key: 'likeNotify' as const, label: '좋아요 알림', desc: '내 게시물에 좋아요가 달릴 때', icon: Heart },
            ]).map(({ key, label, desc, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between rounded-lg px-1 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <Switch
                  checked={notifSettings?.[key] ?? true}
                  onCheckedChange={(checked) => notifMutation.mutate({ [key]: checked })}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 계정 정보 섹션 */}
      <section className="mt-8 space-y-3 border-t pt-6">
        <h2 className="text-sm font-semibold">계정 정보</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0" />
            <span>{user.email}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{formatDate(user.createdAt)} 가입</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!confirmDelete ? (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}>
              회원 탈퇴
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <span className="text-xs text-destructive">정말 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.</span>
              <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? '처리 중...' : '확인'}
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setConfirmDelete(false)}>
                취소
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      {editingProfile && (
        <EditProfileModal
          currentBio={profile?.bio ?? null}
          currentNickname={user.nickname}
          onClose={() => {
            setEditingProfile(false)
            queryClient.invalidateQueries({ queryKey: ['userProfile', userId] })
          }}
        />
      )}

      {followModal && (
        <FollowListModal
          userId={userId}
          type={followModal}
          onClose={() => setFollowModal(null)}
          onUserClick={(id) => {
            setFollowModal(null)
            navigate(`/users/${id}`)
          }}
        />
      )}
    </div>
  )
}

function AnalyticsSection({
  stats,
  profitColor,
  formatMoney,
}: {
  stats: TradeStats
  profitColor: (v: number) => string
  formatMoney: (v: number) => string
}) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('heatmap')

  return (
    <section className="mt-8 space-y-4 border-t pt-6">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <BarChart3 className="h-4 w-4" />
        분석
      </h2>

      {/* 핵심 지표 요약 */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">총 수익</p>
            <p className={`mt-0.5 text-lg font-bold tabular-nums ${profitColor(stats.totalProfit)}`}>
              {formatMoney(stats.totalProfit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">승률</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">
              {stats.winRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">총 매매</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{stats.totalTrades}건</p>
          </CardContent>
        </Card>
      </div>

      <TabFilter options={ANALYTICS_TABS} value={activeTab} onChange={setActiveTab} />
      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<div className="text-sm text-muted-foreground">불러오는 중...</div>}>
            {activeTab === 'heatmap' && <MonthlyPnlHeatmap />}
            {activeTab === 'equity' && <EquityCurveChart />}
            {activeTab === 'monthly' && <MonthlyBreakdownChart />}
            {activeTab === 'ticker' && <TickerStatsTable />}
          </Suspense>
        </CardContent>
      </Card>
    </section>
  )
}

// --- Follower/Following Modal ---
function FollowListModal({
  userId,
  type,
  onClose,
  onUserClick,
}: {
  userId: number
  type: 'followers' | 'following'
  onClose: () => void
  onUserClick: (id: number) => void
}) {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['followList', userId, type],
    queryFn: () =>
      (type === 'followers' ? followsApi.followers(userId) : followsApi.following(userId))
        .then((r) => r.data),
  })

  const unfollowMutation = useMutation({
    mutationFn: (targetId: number) => followsApi.unfollow(targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followList'] })
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    },
  })

  const followMutation = useMutation({
    mutationFn: (targetId: number) => followsApi.follow(targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followList'] })
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    },
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm overflow-hidden rounded-xl border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">{type === 'followers' ? '팔로워' : '팔로잉'}</h2>
            <button onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!data?.content.length ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {type === 'followers' ? '아직 팔로워가 없습니다' : '아직 팔로우하는 유저가 없습니다'}
              </div>
            ) : (
              data.content.map((u: FollowUser) => (
                <div key={u.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50">
                  <button className="flex items-center gap-3 min-w-0" onClick={() => onUserClick(u.id)}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted-foreground/20 to-muted text-xs font-bold">
                      {u.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-semibold truncate">{u.nickname}</p>
                      {u.bio && <p className="text-xs text-muted-foreground truncate">{u.bio}</p>}
                    </div>
                  </button>
                  {u.id !== userId && (
                    u.isFollowing ? (
                      <Button variant="outline" size="sm" className="ml-3 h-7 shrink-0 text-xs" onClick={() => unfollowMutation.mutate(u.id)} disabled={unfollowMutation.isPending}>
                        팔로잉
                      </Button>
                    ) : (
                      <Button size="sm" className="ml-3 h-7 shrink-0 text-xs" onClick={() => followMutation.mutate(u.id)} disabled={followMutation.isPending}>
                        팔로우
                      </Button>
                    )
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
