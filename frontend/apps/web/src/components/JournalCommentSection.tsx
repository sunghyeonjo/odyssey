import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { JournalComment } from '@buffett-diary/shared'
import { journalCommentsApi } from '@/api/journals'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, CornerDownRight, MessageSquare } from 'lucide-react'
import { renderWithMentions } from '@/lib/mention'

export default function JournalCommentSection({ journalId, canComment }: { journalId: number; canComment: boolean }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')

  const { data: comments = [] } = useQuery({
    queryKey: ['journalComments', journalId],
    queryFn: () => journalCommentsApi.list(journalId).then((r) => r.data),
    enabled: canComment,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['journalComments', journalId] })
    queryClient.invalidateQueries({ queryKey: ['journals'] })
  }

  const createMutation = useMutation({
    mutationFn: () => journalCommentsApi.create(journalId, { content: newComment.trim() }),
    onSuccess: () => { setNewComment(''); invalidate() },
  })

  const replyMutation = useMutation({
    mutationFn: (parentId: number) => journalCommentsApi.reply(journalId, parentId, { content: replyContent.trim() }),
    onSuccess: () => { setReplyingTo(null); setReplyContent(''); invalidate() },
  })

  const updateMutation = useMutation({
    mutationFn: (commentId: number) => journalCommentsApi.update(journalId, commentId, { content: editContent.trim() }),
    onSuccess: () => { setEditingId(null); setEditContent(''); invalidate() },
  })

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => journalCommentsApi.delete(journalId, commentId),
    onSuccess: invalidate,
  })

  // Group comments: top-level + replies
  const topLevel = comments.filter((c) => c.parentId == null)
  const repliesMap = new Map<number, JournalComment[]>()
  for (const c of comments) {
    if (c.parentId != null) {
      const list = repliesMap.get(c.parentId) ?? []
      list.push(c)
      repliesMap.set(c.parentId, list)
    }
  }

  if (!canComment) return null

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const renderComment = (comment: JournalComment, isReply: boolean) => {
    const isOwn = user?.id === comment.userId
    const isEditing = editingId === comment.id

    return (
      <div key={comment.id} className={`${isReply ? 'ml-6 border-l-2 pl-3' : ''}`}>
        <div className="flex items-start gap-2 py-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
            {comment.nickname.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">{comment.nickname}</span>
              <span className="text-[10px] text-muted-foreground">{formatTime(comment.createdAt)}</span>
            </div>

            {isEditing ? (
              <div className="mt-1 space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  maxLength={1000}
                  rows={2}
                  className="w-full resize-none rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingId(null)}>취소</Button>
                  <Button size="sm" className="h-6 text-xs" disabled={!editContent.trim() || updateMutation.isPending} onClick={() => updateMutation.mutate(comment.id)}>저장</Button>
                </div>
              </div>
            ) : (
              <p className="mt-0.5 text-sm whitespace-pre-wrap leading-relaxed">{renderWithMentions(comment.content)}</p>
            )}

            {!isEditing && (
              <div className="mt-1 flex items-center gap-2">
                {!isReply && (
                  <button
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyContent('') }}
                  >
                    답글
                  </button>
                )}
                {isOwn && (
                  <>
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditingId(comment.id); setEditContent(comment.content) }}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => { if (confirm('댓글을 삭제하시겠습니까?')) deleteMutation.mutate(comment.id) }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reply input */}
        {replyingTo === comment.id && (
          <div className="ml-8 mb-2 flex gap-2">
            <CornerDownRight className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 space-y-1.5">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="답글을 작성하세요... (@닉네임으로 멘션)"
                maxLength={1000}
                rows={2}
                className="w-full resize-none rounded-md border bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setReplyingTo(null)}>취소</Button>
                <Button size="sm" className="h-6 text-xs" disabled={!replyContent.trim() || replyMutation.isPending} onClick={() => replyMutation.mutate(comment.id)}>답글</Button>
              </div>
            </div>
          </div>
        )}

        {/* Replies */}
        {repliesMap.get(comment.id)?.map((reply) => renderComment(reply, true))}
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" />
        댓글 {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comment list */}
      {topLevel.length > 0 && (
        <div className="divide-y">
          {topLevel.map((c) => renderComment(c, false))}
        </div>
      )}

      {/* New comment input */}
      <div className="mt-2 space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="댓글을 작성하세요... (@닉네임으로 멘션)"
          maxLength={1000}
          rows={2}
          className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!newComment.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            댓글 작성
          </Button>
        </div>
      </div>
    </div>
  )
}
