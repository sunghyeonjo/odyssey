import { Ionicons } from '@expo/vector-icons'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { SlideInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, space, text } from '@/theme'

export interface SheetAction {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  /** 되돌릴 수 없는 것 — 빨갛게 칠하고 맨 아래에 둔다 */
  danger?: boolean
  /**
   * 지금 켜져 있는 것. 오른쪽에 체크가 붙는다.
   * 상태를 바꾸는 줄은 '무엇으로 바뀐다' 가 아니라 **'지금 무엇이다'** 를 먼저 말해야 한다
   */
  selected?: boolean
  onPress: () => void
}

interface Props {
  visible: boolean
  actions: SheetAction[]
  /** 되돌릴 수 없는 것을 물을 때만. 없으면 그냥 동작 목록이다 */
  title?: string
  message?: string
  /** 주면 목록과 떨어진 취소 줄이 붙는다 */
  cancelLabel?: string
  onClose: () => void
}

/**
 * 아래에서 올라오는 동작 목록.
 * Alert 보다 손가락에 가깝고, 위험한 것을 색으로 갈라둘 수 있다.
 */
export default function ActionSheet({ visible, actions, title, message, cancelLabel, onClose }: Props) {
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        {/* 바깥을 누르면 닫힌다 — 시트에 취소 줄이 없어도 빠져나갈 길이 있다 */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View entering={SlideInDown.duration(220)} style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.sheet}>
            {!!title && (
              <View style={styles.head}>
                <Text style={styles.title}>{title}</Text>
                {!!message && <Text style={styles.message}>{message}</Text>}
              </View>
            )}
            {actions.map((a, i) => (
              <Pressable
                key={a.label}
                style={[styles.row, (i > 0 || !!title) && styles.line]}
                onPress={() => { onClose(); a.onPress() }}
              >
                <Ionicons name={a.icon} size={20} color={a.danger ? colors.danger : colors.ink} />
                <Text style={[styles.label, a.danger && styles.labelDanger]}>{a.label}</Text>
                {a.selected && (
                  <>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="checkmark" size={19} color={colors.accent} />
                  </>
                )}
              </Pressable>
            ))}
          </View>

          {!!cancelLabel && (
            <Pressable style={[styles.sheet, styles.cancel]} onPress={onClose}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  wrap: { paddingHorizontal: 10, gap: space.sm },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.sheet, overflow: 'hidden' },

  head: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, alignItems: 'center' },
  title: { fontSize: text.lead, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  message: { fontSize: text.body, lineHeight: 19, color: colors.sub, textAlign: 'center', marginTop: space.sm },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: 20, paddingVertical: space.lg },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  label: { fontSize: text.lead, fontWeight: '600', color: colors.ink },
  labelDanger: { color: colors.danger },

  cancel: { alignItems: 'center', paddingVertical: space.lg },
  cancelText: { fontSize: text.lead, fontWeight: '700', color: colors.ink },
})
