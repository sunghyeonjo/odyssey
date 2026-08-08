import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { usersApi } from '@/api/users'
import { formatDate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Settings, Mail, Calendar } from 'lucide-react'
import EditProfileModal from '@/components/EditProfileModal'

export default function MyPage() {
  const { user, logout } = useAuth()
  const [editingProfile, setEditingProfile] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteAccount(),
    onSuccess: () => logout(),
  })

  if (!user) return null

  const initial = user.nickname.charAt(0).toUpperCase()

  return (
    <div className="mx-auto max-w-2xl">
      {/* Profile Header */}
      <div className="flex items-start gap-5 py-4 sm:gap-8">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-3xl font-bold text-primary-foreground sm:h-24 sm:w-24">
          {initial}
        </div>

        <div className="flex-1 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{user.nickname}</h1>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setEditingProfile(true)}>
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              편집
            </Button>
          </div>

          {user.bio && (
            <p className="mt-2.5 text-sm whitespace-pre-wrap leading-relaxed">{user.bio}</p>
          )}
        </div>
      </div>

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

      {editingProfile && (
        <EditProfileModal
          currentBio={user.bio}
          currentNickname={user.nickname}
          onClose={() => setEditingProfile(false)}
        />
      )}
    </div>
  )
}
