import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { deleteAccount, getStats } from '@/api/dayed'
import { qk } from '@/api/keys'
import LegalModal, { type LegalKind } from '@/components/legal/LegalModal'
import { useAuth } from '@/contexts/AuthContext'
import { colors, radius, space, text } from '@/theme'

/**
 * 설정.
 *
 * `나` 에서 떼어냈다. 거기는 **내 삶**이 시간 순서로 놓이는 자리인데
 * (나 → 오늘 → 지나온 날 → 친구), 그 아래에 약관·로그아웃·계정 삭제가 같은 스크롤로
 * 이어지면 **성격이 다른 것이 한 줄에 선다.** 달력을 보러 왔다가 계정 삭제를 지나치게 된다.
 *
 * 친구는 여기 없다 — 친구는 설정 항목이 아니라 이 앱의 절반이라 `나` 에 남았다.
 */
export default function SettingsScreen() {
  const navigation = useNavigation<any>()
  const { signOut } = useAuth()
  const statsQ = useQuery({ queryKey: qk.stats, queryFn: getStats })
  const [legal, setLegal] = useState<LegalKind | null>(null)

  /**
   * 계정 삭제 — **앱 안에 길이 있어야 한다**(App Store 5.1.1(v)).
   * 되돌릴 수 없으니 두 번 묻는다: 무엇이 사라지는지 알리고, 그다음 마지막 확인.
   */
  const remove = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => signOut(),
    onError: () => Alert.alert('계정을 지우지 못했어요', '잠시 후 다시 시도해 주세요'),
  })

  const confirmDelete = () =>
    Alert.alert(
      '계정을 삭제할까요?',
      `기록 ${statsQ.data?.totalEntries ?? 0}개와 사진·글, 받은 반응이 모두 사라져요. 되돌릴 수 없어요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => Alert.alert('정말 삭제할까요?', '이 작업은 되돌릴 수 없습니다.', [
            { text: '취소', style: 'cancel' },
            { text: '영구 삭제', style: 'destructive', onPress: () => remove.mutate() },
          ]),
        },
      ],
    )

  /** 로그아웃도 한 번 묻는다 — 다른 되돌리기 어려운 것들과 결이 같아야 한다 */
  const confirmSignOut = () =>
    Alert.alert('로그아웃할까요?', '다시 들어오려면 이메일과 비밀번호가 필요해요.', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ])

  const Row = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.rowText}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.faint} />
    </Pressable>
  )

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="뒤로">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.navTitle}>설정</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 내 것을 고치는 것 */}
        <View style={styles.group}>
          <Row label="프로필 편집" onPress={() => navigation.navigate('EditProfile')} />
          <Row label="비밀번호 변경" onPress={() => navigation.navigate('ChangePassword')} />
          <Row label="차단한 사람" onPress={() => navigation.navigate('Blocked')} />
        </View>

        {/* 읽는 것 — 고치는 것과 묶음을 나눈다 */}
        <View style={styles.group}>
          <Row label="이용약관" onPress={() => setLegal('terms')} />
          <Row label="개인정보 처리방침" onPress={() => setLegal('privacy')} />
        </View>

        <View style={styles.group}>
          <Pressable style={styles.row} onPress={confirmSignOut}>
            <Text style={styles.rowText}>로그아웃</Text>
          </Pressable>
        </View>

        {/*
          계정 삭제는 묶음 **밖**에 따로 둔다.
          로그아웃 바로 아래 같은 줄로 두면 눌러야 할 것을 잘못 누른다 —
          하나는 되돌아올 수 있고 하나는 아니다
        */}
        <Pressable style={styles.danger} onPress={confirmDelete} disabled={remove.isPending}>
          {remove.isPending
            ? <ActivityIndicator size="small" color={colors.danger} />
            : <Text style={styles.dangerText}>계정 삭제</Text>}
        </Pressable>
      </ScrollView>

      <LegalModal kind={legal} onClose={() => setLegal(null)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 44,
  },
  navTitle: { fontSize: text.title, fontWeight: '700', color: colors.ink },

  body: { paddingHorizontal: 16, paddingTop: space.md, paddingBottom: 40 },
  // 성격이 같은 것끼리 한 면에 — 선이 아니라 면과 틈으로 가른다
  group: {
    backgroundColor: colors.surface, borderRadius: radius.card,
    overflow: 'hidden', marginBottom: space.md,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line,
  },
  rowText: { fontSize: text.lead, fontWeight: '600', color: colors.ink },

  danger: { marginTop: space.sm, alignItems: 'center', paddingVertical: 16 },
  dangerText: { fontSize: text.body, fontWeight: '600', color: colors.danger },
})
