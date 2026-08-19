import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Alert } from 'react-native'
import { blockUser } from '@/api/dayed'
import ActionSheet from '@/components/ui/ActionSheet'
import ReportSheet from '@/components/safety/ReportSheet'

/** 무엇에 대한 손잡이인지 — 기록 한 건이거나 사람 한 명이다 */
export interface SafetyTarget {
  kind: 'entry' | 'user'
  /** 기록이면 itemId, 사람이면 안 쓴다 */
  itemId?: string
  userId: number
  name: string
}

interface Props {
  /** null 이면 닫혀 있다 */
  target: SafetyTarget | null
  onClose: () => void
  /** 차단이 끝난 뒤. 그 사람 화면에 서 있었다면 빠져나와야 한다 */
  onBlocked?: () => void
}

/**
 * 남의 기록·프로필에 붙는 손잡이 — **신고와 차단.**
 *
 * 내 기록의 `EntryActions`(수정·공개범위·삭제)와 짝이다. 남의 것에는 고칠 것이 없고,
 * 대신 이 둘이 있어야 한다 (App Store 1.2 — 이용자 콘텐츠를 다루는 앱의 요구사항).
 *
 * 신고와 차단을 갈라 두는 이유:
 * 신고는 **우리에게** 알리는 것이고, 차단은 **그 사람과 나 사이**를 끊는 것이다.
 * 하나로 합치면 조용히 안 보이게만 하고 싶은 사람이 신고까지 하게 된다.
 */
export default function SafetyActions({ target, onClose, onBlocked }: Props) {
  const queryClient = useQueryClient()
  /** 신고 사유를 고르는 중인 대상 */
  const [reporting, setReporting] = useState<SafetyTarget | null>(null)

  const block = useMutation({
    mutationFn: (userId: number) => blockUser(userId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined)
      queryClient.invalidateQueries()
      onBlocked?.()
    },
    onError: () => Alert.alert('차단하지 못했어요', '잠시 후 다시 시도해 주세요'),
  })

  /** 되돌릴 수 있지만 관계가 끊기므로 한 번 묻는다 */
  const confirmBlock = (t: SafetyTarget) =>
    Alert.alert(
      `${t.name}님을 차단할까요?`,
      '서로의 기록이 보이지 않고, 이 사람은 나를 찾거나 친구 요청을 보낼 수 없어요. 친구였다면 관계도 끊어져요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '차단', style: 'destructive', onPress: () => block.mutate(t.userId) },
      ],
    )

  return (
    <>
      <ActionSheet
        visible={target !== null && reporting === null}
        actions={target === null ? [] : [
          { label: '신고하기', icon: 'flag-outline', onPress: () => setReporting(target) },
          { label: `${target.name}님 차단하기`, icon: 'ban-outline', danger: true, onPress: () => confirmBlock(target) },
        ]}
        cancelLabel="취소"
        onClose={onClose}
      />

      <ReportSheet
        target={reporting === null ? null : reporting.kind === 'entry' ? `entry:${reporting.itemId}` : `user:${reporting.userId}`}
        title={reporting?.kind === 'entry' ? '이 기록을 신고합니다' : `${reporting?.name ?? ''}님을 신고합니다`}
        onClose={() => setReporting(null)}
        onReported={() => {
          const t = reporting
          setReporting(null)
          /*
            접수만 알리고 끝내면 "그래서 이 사람 글을 계속 봐야 하나" 가 남는다 →
            그 자리에서 차단까지 갈 수 있게 한다. Apple 도 신고와 차단을 함께 요구한다
          */
          Alert.alert(
            '신고를 접수했어요',
            '확인한 뒤 조치할게요. 이 사람의 기록을 더 보지 않으려면 차단할 수 있어요.',
            [
              { text: '닫기', style: 'cancel' },
              ...(t ? [{ text: '차단하기', style: 'destructive' as const, onPress: () => confirmBlock(t) }] : []),
            ],
          )
        }}
      />
    </>
  )
}
