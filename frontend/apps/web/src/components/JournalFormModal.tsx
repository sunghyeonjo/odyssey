import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Journal, JournalRequest } from '@buffett-diary/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Upload, Trash2 } from 'lucide-react'
import { journalsApi, journalImagesApi } from '@/api/journals'
import dayjs from 'dayjs'

interface JournalFormModalProps {
  journalId?: number
  onClose: () => void
  onSaved: () => void
}

const MAX_IMAGES = 5
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export default function JournalFormModal({ journalId, onClose, onSaved }: JournalFormModalProps) {
  const isEdit = journalId != null
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [journalDate, setJournalDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<{ id: number; fileName: string }[]>([])
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)

  const { data: journal } = useQuery({
    queryKey: ['journal', journalId],
    queryFn: () => journalsApi.get(journalId!).then((r) => r.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (journal) {
      setTitle(journal.title)
      setContent(journal.content)
      setJournalDate(journal.journalDate)
      setExistingImages(journal.images.map((img) => ({ id: img.id, fileName: img.fileName })))
    }
  }, [journal])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const totalCount = existingImages.length - deletedImageIds.length + newFiles.length
    const allowed = files.filter((f) => {
      if (!ALLOWED_TYPES.includes(f.type)) return false
      if (f.size > MAX_FILE_SIZE) return false
      return true
    }).slice(0, MAX_IMAGES - totalCount)
    setNewFiles((prev) => [...prev, ...allowed])
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return
    setSubmitting(true)
    try {
      const request: JournalRequest = { title: title.trim(), content: content.trim(), journalDate }

      let saved: Journal
      if (isEdit) {
        const { data } = await journalsApi.update(journalId!, request)
        saved = data
      } else {
        const { data } = await journalsApi.create(request)
        saved = data
      }

      // Delete removed images
      for (const imageId of deletedImageIds) {
        await journalImagesApi.delete(saved.id, imageId)
      }

      // Upload new images
      for (const file of newFiles) {
        await journalImagesApi.upload(saved.id, file)
      }

      queryClient.invalidateQueries({ queryKey: ['journals'] })
      queryClient.invalidateQueries({ queryKey: ['journal', journalId] })
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  const activeExistingImages = existingImages.filter((img) => !deletedImageIds.includes(img.id))
  const totalImages = activeExistingImages.length + newFiles.length

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{isEdit ? '일지 수정' : '새 투자일지'}</CardTitle>
              <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="journalDate">날짜</Label>
                <Input
                  id="journalDate"
                  type="date"
                  value={journalDate}
                  onChange={(e) => setJournalDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="일지 제목"
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="content">내용</Label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="오늘의 시장 뷰, 투자 생각을 기록해보세요..."
                  rows={8}
                  className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Images */}
              <div>
                <Label>첨부 이미지 ({totalImages}/{MAX_IMAGES})</Label>
                <div className="mt-2 space-y-2">
                  {activeExistingImages.map((img) => (
                    <div key={img.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="truncate">{img.fileName}</span>
                      <button
                        onClick={() => setDeletedImageIds((prev) => [...prev, img.id])}
                        className="ml-2 text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {newFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="truncate">{file.name}</span>
                      <button
                        onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="ml-2 text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {totalImages < MAX_IMAGES && (
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/30">
                      <Upload className="h-4 w-4" />
                      이미지 추가
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>
                  취소
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!title.trim() || !content.trim() || submitting}
                >
                  {submitting ? '저장 중...' : isEdit ? '수정' : '작성'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
