import { useMutation } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { report } from '@/api/dayed'
import type { ReportReason } from '@/api/types'
import ActionSheet, { type SheetAction } from '@/components/ui/ActionSheet'

/**
 * 신고 사유. **고르기 쉬울 만큼 짧게, 판단할 수 있을 만큼 구체적으로.**
 * 아이콘은 사유를 그림으로 되풀이하지 않고 '무엇에 관한 신고인지' 만 거든다.
 */
const REASONS: { value: ReportReason; label: string; icon: SheetAction['icon'] }[] = [
  { value: 'spam', label: '스팸이거나 광고예요', icon: 'megaphone-outline' },
  { value: 'harassment', label: '괴롭히거나 욕해요', icon: 'sad-outline' },
  { value: 'sexual', label: '성적인 내용이에요', icon: 'eye-off-outline' },
  { value: 'violence', label: '폭력적이거나 위험해요', icon: 'warning-outline' },
  { value: 'impersonation', label: '다른 사람인 척해요', icon: 'person-outline' },
  { value: 'other', label: '그 밖의 이유', icon: 'ellipsis-horizontal-circle-outline' },
]

interface Props {
  /** `entry:{itemId}` 또는 `user:{userId}`. null 이면 닫혀 있다 */
  target: string | null
  /** 시트 머리글 — 무엇을 신고하는지 */
  title: string
  onClose: () => void
  /** 접수된 뒤. 부르는 쪽이 안내를 띄운다 */
  onReported: () => void
}

/**
 * 신고 시트 — 기록과 사람이 **같은 것**을 쓴다.
 *
 * 사유를 고르면 곧바로 접수된다. `정말 신고할까요?` 를 한 번 더 묻지 않는 이유는
 * 신고가 되돌릴 수 없는 일이 아니고, 되묻는 사이에 그만두는 쪽이 더 위험하기 때문이다.
 */
export default function ReportSheet({ target, title, onClose, onReported }: Props) {
  const send = useMutation({
    mutationFn: ({ t, reason }: { t: string; reason: ReportReason }) => report(t, reason),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined)
      onReported()
    },
  })

  return (
    <ActionSheet
      visible={target !== null}
      title={title}
      message="어떤 점이 문제인가요?"
      cancelLabel="취소"
      actions={target === null ? [] : REASONS.map((r) => ({
        label: r.label,
        icon: r.icon,
        onPress: () => send.mutate({ t: target, reason: r.value }),
      }))}
      onClose={onClose}
    />
  )
}
