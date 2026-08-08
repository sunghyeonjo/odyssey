import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { AppNotification } from '@buffett-diary/shared'
import { notificationsApi } from '@/api/notifications'
import { Bell, Check, UserPlus, MessageSquare, Heart, AtSign } from 'lucide-react'
import { cn } from '@/lib/utils'

const typeIcon: Record<string, typeof Bell> = {
  FOLLOW: UserPlus,
  TRADE_COMMENT: MessageSquare,
  JOURNAL_COMMENT: MessageSquare,
  TRADE_LIKE: Heart,
  JOURNAL_LIKE: Heart,
  MENTION: AtSign,
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: unread } = useQuery({
    queryKey: ['notificationsUnread'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(0, 30).then((r) => r.data),
    enabled: open,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notificationsUnread'] })
    },
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notificationsUnread'] })
    },
  })

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const handleClick = (notif: AppNotification) => {
    if (!notif.isRead) markReadMutation.mutate(notif.id)
    setOpen(false)

    if (notif.referenceType === 'TRADE') {
      navigate('/trades')
    } else if (notif.referenceType === 'JOURNAL') {
      navigate('/journals')
    } else if (notif.referenceType === 'USER') {
      navigate(`/users/${notif.referenceId}`)
    }
  }

  const count = unread?.count ?? 0
  const notifications = notifData?.content ?? []

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return '방금'
    if (diffMin < 60) return `${diffMin}분 전`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}시간 전`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 7) return `${diffDay}일 전`
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-full transition-colors',
          open
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        )}
      >
        <Bell className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="fixed inset-x-3 top-14 z-50 overflow-hidden rounded-xl border bg-background shadow-xl md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-96">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">알림</h3>
              {count > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  disabled={markAllMutation.isPending}
                >
                  <Check className="h-3 w-3" />
                  모두 읽음
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <Bell className="h-8 w-8 opacity-30" />
                  <p className="text-sm">알림이 없습니다</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = typeIcon[n.notificationType] ?? Bell
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                        !n.isRead && 'bg-primary/5',
                      )}
                    >
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                        {n.actorNickname.charAt(0).toUpperCase()}
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background">
                          <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] leading-snug">
                          <span className="font-semibold">{n.actorNickname}</span>{' '}
                          <span className="text-muted-foreground">{n.message}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{formatTime(n.createdAt)}</p>
                      </div>
                      {!n.isRead && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
