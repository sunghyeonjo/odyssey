import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TradeRequest, TradeImageMeta } from '@buffett-diary/shared'
import { toDateString } from '@/lib/date'
import dayjs from 'dayjs'
import { tradesApi, tradeImagesApi } from '@/api/trades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TickerCombobox } from '@/components/TickerCombobox'
import { ImagePlus, X, ChevronDown, ChevronUp } from 'lucide-react'

const MAX_IMAGES = 5
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

interface ExistingImage {
  meta: TradeImageMeta
  objectUrl: string
}

export interface TradeFormProps {
  tradeId?: number
  compact?: boolean
  onCancel: () => void
  onSaved: () => void
}

export default function TradeForm({ tradeId, compact, onCancel, onSaved }: TradeFormProps) {
  const isEdit = tradeId != null
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Image state
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [showPlan, setShowPlan] = useState(false)

  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<TradeRequest & { profit?: number | null }>({
    defaultValues: {
      tradeDate: toDateString(dayjs()),
      position: 'BUY',
    },
  })

  const position = watch('position')
  const tickerValue = watch('ticker') ?? ''

  const { data: existingTrade } = useQuery({
    queryKey: ['trade', tradeId],
    queryFn: () => tradesApi.get(tradeId!).then((r) => r.data),
    enabled: isEdit,
  })

  const loadExistingImages = useCallback(async (images: TradeImageMeta[], id: number) => {
    const loaded: ExistingImage[] = []
    for (const meta of images) {
      try {
        const { data: blob } = await tradeImagesApi.fetchBlob(id, meta.id)
        loaded.push({ meta, objectUrl: URL.createObjectURL(blob) })
      } catch {
        // skip failed loads
      }
    }
    setExistingImages(loaded)
  }, [])

  useEffect(() => {
    if (existingTrade) {
      reset({
        tradeDate: existingTrade.tradeDate,
        ticker: existingTrade.ticker,
        position: existingTrade.position,
        quantity: existingTrade.quantity,
        entryPrice: existingTrade.entryPrice,
        profit: existingTrade.profit,
        reason: existingTrade.reason,
        targetPrice: existingTrade.targetPrice,
        stopLossPrice: existingTrade.stopLossPrice,
      })
      if (existingTrade.images?.length) {
        loadExistingImages(existingTrade.images, existingTrade.id)
      }
      if (existingTrade.targetPrice || existingTrade.stopLossPrice) {
        setShowPlan(true)
      }
    }
  }, [existingTrade, reset, loadExistingImages])

  useEffect(() => {
    return () => {
      existingImages.forEach((img) => URL.revokeObjectURL(img.objectUrl))
      newPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalImageCount = existingImages.length + newFiles.length

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const remaining = MAX_IMAGES - totalImageCount
    if (remaining <= 0) {
      setError(`최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다`)
      return
    }

    const toAdd: File[] = []
    for (const file of files.slice(0, remaining)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`지원하지 않는 파일 형식입니다: ${file.name}`)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`파일 크기가 5MB를 초과합니다: ${file.name}`)
        return
      }
      toAdd.push(file)
    }

    if (files.length > remaining) {
      setError(`최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다. ${remaining}장만 추가됩니다.`)
    } else {
      setError('')
    }

    const previews = toAdd.map((f) => URL.createObjectURL(f))
    setNewFiles((prev) => [...prev, ...toAdd])
    setNewPreviews((prev) => [...prev, ...previews])

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeNewFile = (index: number) => {
    URL.revokeObjectURL(newPreviews[index])
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
    setNewPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = async (index: number) => {
    const img = existingImages[index]
    try {
      await tradeImagesApi.delete(img.meta.tradeId, img.meta.id)
      URL.revokeObjectURL(img.objectUrl)
      setExistingImages((prev) => prev.filter((_, i) => i !== index))
    } catch {
      setError('이미지 삭제에 실패했습니다')
    }
  }

  const uploadNewFiles = async (id: number) => {
    for (const file of newFiles) {
      await tradeImagesApi.upload(id, file)
    }
  }

  const mutation = useMutation({
    mutationFn: (data: TradeRequest) =>
      isEdit ? tradesApi.update(tradeId!, data) : tradesApi.create(data),
    onSuccess: async (response) => {
      const savedId = response.data.id
      if (newFiles.length > 0) {
        setUploading(true)
        try {
          await uploadNewFiles(savedId)
        } catch {
          setError('일부 이미지 업로드에 실패했습니다')
        }
        setUploading(false)
      }
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      onSaved()
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || '저장에 실패했습니다')
    },
  })

  const onSubmit = (data: TradeRequest & { profit?: number | null }) => {
    const isBuy = data.position === 'BUY'
    mutation.mutate({
      ...data,
      ticker: (data.ticker ?? tickerValue).toUpperCase(),
      exitPrice: null,
      profit: isBuy ? null : (data.profit ?? null),
      reason: data.reason || null,
      targetPrice: data.targetPrice || null,
      stopLossPrice: data.stopLossPrice || null,
    })
  }

  const isBusy = isSubmitting || mutation.isPending || uploading

  const imageSection = (
    <>
      <div className="flex flex-wrap gap-3">
        {existingImages.map((img, i) => (
          <div key={`existing-${img.meta.id}`} className="group relative h-24 w-24 overflow-hidden rounded-md border">
            <img src={img.objectUrl} alt={img.meta.fileName} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeExistingImage(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {newPreviews.map((url, i) => (
          <div key={`new-${i}`} className="group relative h-24 w-24 overflow-hidden rounded-md border border-dashed">
            <img src={url} alt={newFiles[i].name} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeNewFile(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {totalImageCount < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-xs">추가</span>
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <p className="text-xs text-muted-foreground">
        JPEG, PNG, GIF, WebP / 파일당 5MB 이하
      </p>
    </>
  )

  if (compact) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Key-value rows — matches detail view */}
        <div className="divide-y text-sm">
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">매매일</span>
            <Input
              id="tradeDate"
              type="date"
              className="h-8 w-40 text-right"
              {...register('tradeDate', { required: true })}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">종목</span>
            <div className="w-40">
              <TickerCombobox
                value={tickerValue}
                onChange={(v) => setValue('ticker', v, { shouldValidate: true })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">구분</span>
            <select
              id="position"
              className="h-8 w-40 rounded-md border border-input bg-background px-2 text-right text-sm"
              {...register('position', { required: true })}
            >
              <option value="BUY">매수</option>
              <option value="SELL">매도</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">수량</span>
            <Input
              id="quantity"
              type="number"
              step="any"
              className="h-8 w-40 text-right"
              {...register('quantity', { required: true, valueAsNumber: true })}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">{position === 'SELL' ? '매도가' : '매수가'}</span>
            <Input
              id="entryPrice"
              type="number"
              step="0.01"
              className="h-8 w-40 text-right"
              {...register('entryPrice', { required: true, valueAsNumber: true })}
            />
          </div>
          {position === 'SELL' && (
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">손익</span>
              <Input
                id="profit"
                type="number"
                step="0.01"
                placeholder="±금액"
                className="h-8 w-40 text-right"
                {...register('profit', { valueAsNumber: true })}
              />
            </div>
          )}
        </div>

        {/* Memo */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">매매 사유</h3>
          <Textarea
            id="reason"
            rows={3}
            placeholder="이 매매를 한 이유는?"
            {...register('reason')}
          />
        </div>

        {/* Images */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">첨부파일 ({totalImageCount}/{MAX_IMAGES})</h3>
          {imageSection}
        </div>

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={isBusy}>
            {uploading ? '이미지 업로드 중...' : isBusy ? '저장 중...' : '수정하기'}
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            취소
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tradeDate">매매일</Label>
          <Input
            id="tradeDate"
            type="date"
            {...register('tradeDate', { required: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ticker">종목</Label>
          <TickerCombobox
            value={tickerValue}
            onChange={(v) => setValue('ticker', v, { shouldValidate: true })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="position">구분</Label>
          <select
            id="position"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            {...register('position', { required: true })}
          >
            <option value="BUY">매수</option>
            <option value="SELL">매도</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">수량</Label>
          <Input
            id="quantity"
            type="number"
            step="any"
            {...register('quantity', { required: true, valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="entryPrice">{position === 'SELL' ? '매도가($)' : '매수가($)'}</Label>
          <Input
            id="entryPrice"
            type="number"
            step="0.01"
            {...register('entryPrice', { required: true, valueAsNumber: true })}
          />
        </div>
      </div>

      {position === 'SELL' && (
        <div className="space-y-2">
          <Label htmlFor="profit">수익금($)</Label>
          <Input
            id="profit"
            type="number"
            step="0.01"
            placeholder="익절 150, 손절 -150"
            {...register('profit', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            양수 = 익절, 음수 = 손절
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">매매 사유</Label>
        <Textarea
          id="reason"
          rows={3}
          placeholder="이 매매를 한 이유는?"
          {...register('reason')}
        />
      </div>

      {/* Plan section */}
      <div className="space-y-2">
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setShowPlan(!showPlan)}
        >
          매매 계획
          {showPlan ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showPlan && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="targetPrice">목표가($)</Label>
              <Input
                id="targetPrice"
                type="number"
                step="0.01"
                placeholder="목표 매도가"
                {...register('targetPrice', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stopLossPrice">손절가($)</Label>
              <Input
                id="stopLossPrice"
                type="number"
                step="0.01"
                placeholder="손절 기준가"
                {...register('stopLossPrice', { valueAsNumber: true })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Image upload section */}
      <div className="space-y-2">
        <Label>첨부파일 ({totalImageCount}/{MAX_IMAGES})</Label>
        {imageSection}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isBusy}>
          {uploading ? '이미지 업로드 중...' : isBusy ? '저장 중...' : isEdit ? '수정하기' : '기록하기'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  )
}
