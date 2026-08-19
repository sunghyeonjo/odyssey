import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Alert } from 'react-native'
import { deleteEntry, getEntry, updateVisibility } from '@/api/dayed'
import type { Visibility } from '@/api/types'
import DayCardShot, { type DayShot } from '@/components/save/DayCardShot'
import ActionSheet, { type SheetAction } from '@/components/ui/ActionSheet'
import { useComposer } from '@/contexts/ComposerContext'
import type { DateKey } from '@/lib/date'
import { patchEntry } from '@/lib/entryCache'
import { saveToLibrary, type SaveResult } from '@/lib/photoLibrary'

interface Props {
  /** 시트를 연 날짜. null 이면 닫혀 있다 */
  dateKey: DateKey | null
  /** 그날의 공개 범위 — 가운데 줄의 문구가 이걸로 갈린다 */
  visibility?: Visibility
  onClose: () => void
  /** 삭제가 끝난 뒤. 그 기록을 띄워둔 상세가 있으면 닫아야 한다 */
  onDeleted?: () => void
}

/**
 * 내 기록 한 건을 관리하는 시트 — 수정 · 공개 범위 · 사진첩에 저장 · 삭제.
 * 홈과 내 프로필이 같은 것을 띄운다.
 */
export default function EntryActions({ dateKey, visibility, onClose, onDeleted }: Props) {
  const composer = useComposer()
  const queryClient = useQueryClient()

  /** 삭제는 되돌릴 수 없어 한 번 더 묻는다 */
  const [confirmFor, setConfirmFor] = useState<DateKey | null>(null)
  /** 화면 밖에서 그리는 중인 그날 카드. 다 그려지면 사진첩으로 간다 */
  const [shot, setShot] = useState<DayShot | null>(null)
  /** 저장하는 동안 — 그리고 찍고 넣는 데 한 박자 걸린다 */
  const [saving, setSaving] = useState(false)

  const flip = useMutation({
    mutationFn: ({ k, next }: { k: DateKey; next: Visibility }) => updateVisibility(k, next),
    // 시트가 닫히는 그 프레임에 알약과 도장이 이미 바뀌어 있어야 바꾼 줄 안다
    onMutate: ({ k, next }) => patchEntry(queryClient, k, (e) => ({ ...e, visibility: next })),
    onSettled: () => queryClient.invalidateQueries(),
  })
  const remove = useMutation({
    mutationFn: (k: DateKey) => deleteEntry(k),
    onSuccess: () => { onDeleted?.(); queryClient.invalidateQueries() },
  })

  /**
   * 공개 범위는 **두 줄로 나란히** 놓고 지금 것에 체크를 찍는다.
   * 예전엔 반대쪽 하나만 띄웠는데, 그러면 그 글씨가 지금 상태인지 바뀔 상태인지 알 수 없어서
   * 누르고도 뭐가 됐는지 모른다. 고른 뒤 시트를 다시 열면 체크가 옮겨가 있다
   */
  const set = (k: DateKey, next: Visibility) => {
    if (visibility === next) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined)
    flip.mutate({ k, next })
  }

  /** 결과를 한 곳에서 말한다 — 권한이 막힌 것과 그냥 실패한 것은 할 일이 다르다 */
  const tell = (r: SaveResult) => {
    setSaving(false)
    if (r === 'ok') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined)
      Alert.alert('사진첩에 저장했어요')
    } else if (r === 'denied') {
      Alert.alert('사진첩에 저장하지 못했어요', '설정에서 사진 추가 권한을 허용해 주세요')
    } else {
      Alert.alert('사진첩에 저장하지 못했어요', '잠시 후 다시 시도해 주세요')
    }
  }

  /**
   * 그날 한 장을 사진첩으로.
   *
   * **사진만 있는 날은 그리지 않는다** — 원본을 그대로 넣는다.
   * 합성하면 재인코딩이라 그 순간 원본이 아니게 된다.
   * 글이 있으면 사진 아래 글을 붙인 한 장을 만든다(`DayCardShot`).
   */
  const keep = async (k: DateKey) => {
    if (saving) return
    setSaving(true)
    onClose()
    const entry = await getEntry(k).catch(() => null)
    if (entry === null) return tell('fail')
    const photo = entry.photos[0] ?? null
    const note = entry.text.trim()
    if (photo !== null && note === '') return tell(await saveToLibrary(photo))
    setShot({ dateKey: k, text: note, photo, paper: entry.paper })
  }

  const actions = (k: DateKey): SheetAction[] => {
    const acts: SheetAction[] = []
    /*
      지난 기록도 고친다. 못 하게 막던 것은 '지난 날에 **새로** 쓰는 것' 과 뒤섞인 규칙이었다 —
      없던 하루를 지어내는 건 창작이지만, 이미 남긴 하루의 오타를 고치는 건 그냥 고치는 것이다.
      남긴 시각은 처음 것을 지키므로 고쳐도 그날의 기록으로 남는다
    */
    acts.push({ label: '수정', icon: 'create-outline', onPress: () => composer.open({ dateKey: k }) })
    acts.push({
      label: '친구에게 공개',
      icon: 'people-outline',
      selected: visibility === 'friends',
      onPress: () => set(k, 'friends'),
    })
    acts.push({
      label: '나만 보기',
      icon: 'lock-closed-outline',
      selected: visibility === 'private',
      onPress: () => set(k, 'private'),
    })
    // 앱을 못 믿어도 사진은 손에 있어야 한다. 담을 때마다 자동으로 넣지 않고 **누를 때만**
    acts.push({ label: '사진첩에 저장', icon: 'download-outline', onPress: () => void keep(k) })
    acts.push({ label: '삭제', icon: 'trash-outline', danger: true, onPress: () => setConfirmFor(k) })
    return acts
  }

  return (
    <>
      <ActionSheet
        visible={dateKey !== null}
        actions={dateKey ? actions(dateKey) : []}
        onClose={onClose}
      />
      <ActionSheet
        visible={confirmFor !== null}
        title="이 기록을 삭제할까요?"
        message="사진과 글, 받은 반응이 함께 사라져요. 되돌릴 수 없어요."
        cancelLabel="취소"
        actions={confirmFor ? [{ label: '삭제', icon: 'trash-outline', danger: true, onPress: () => remove.mutate(confirmFor) }] : []}
        onClose={() => setConfirmFor(null)}
      />

      {/* 화면 밖에서 그날 카드를 그려 사진첩으로 보낸다 */}
      <DayCardShot
        job={shot}
        onDone={async (uri) => {
          setShot(null)
          tell(uri === null ? 'fail' : await saveToLibrary(uri))
        }}
      />
    </>
  )
}
