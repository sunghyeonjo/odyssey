import { useMemo, useState } from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextLayoutLine, type TextStyle } from 'react-native'
import { colors } from '@/theme'

/** 접어두는 줄 수. 넘치면 마지막 줄 끝에 `... 더 보기` 가 붙는다 */
const FOLD_LINES = 3

/** `... 더 보기` 폭 (글자 크기의 배수). 실측 ≈4.4, 모자라면 손잡이가 잘리므로 넉넉히 */
const MORE_EM = 5

interface Props {
  children: string
  /** 글 자체의 모양 — 부르는 쪽의 문맥을 따른다 */
  style?: StyleProp<TextStyle>
}

/**
 * 세 줄에서 접히는 글. `... 더 보기` 는 **잘린 자리 바로 뒤, 같은 줄 안**에 붙는다.
 * 홈·프로필·상세가 같은 것을 써야 한 글이 화면마다 다른 길이로 잘리지 않는다.
 */
export default function FoldableText({ children, style }: Props) {
  const [open, setOpen] = useState(false)
  // 줄 수와 각 줄의 원문은 재봐야 안다. numberOfLines 를 건 글은 잘린 뒤만 세어지므로 사본을 깔아 잰다
  const [lines, setLines] = useState<TextLayoutLine[]>([])

  const size = Number(StyleSheet.flatten(style)?.fontSize) || 15
  const over = lines.length > FOLD_LINES

  /** 마지막으로 보이는 줄 끝에 손잡이가 앉을 자리를 비워둔 본문 */
  const clipped = useMemo(() => {
    const last = lines[FOLD_LINES - 1]
    if (!over || !last?.text) return children
    const head = lines.slice(0, FOLD_LINES).map((l) => l.text).join('')
    // 쓸 수 있는 폭은 가장 긴 줄로 갈음한다 (부모를 재면 글 스타일의 좌우 여백을 알아야 함).
    // 실제 폭보다 늘 같거나 좁게 잡히므로 손잡이가 잘리는 쪽으로는 안 틀린다
    const room = Math.max(...lines.map((l) => l.width)) - last.width - MORE_EM * size
    if (room >= 0) return head
    const per = last.width / last.text.length // 이 줄의 평균 글자 폭
    return head.slice(0, Math.max(1, head.length - Math.ceil(-room / per)))
  }, [over, lines, children, size])

  return (
    <View>
      <Text
        style={[style, styles.probe]}
        onTextLayout={(e) => setLines(e.nativeEvent.lines)}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      >
        {children}
      </Text>

      <Text style={style} numberOfLines={open ? undefined : FOLD_LINES}>
        {open || !over ? children : clipped.trimEnd()}
        {over && !open && (
          <Text onPress={() => setOpen(true)} suppressHighlighting>
            {/* 말줄임표는 글의 일부라 글 색 그대로, 손잡이만 옅다 */}
            {'... '}
            <Text style={styles.more}>더 보기</Text>
          </Text>
        )}
        {over && open && (
          <Text style={styles.more} onPress={() => setOpen(false)} suppressHighlighting>
            {'  접기'}
          </Text>
        )}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  // 줄 수만 재는 사본 — 눈에 안 보이고 자리도 안 차지한다. 좌우를 0 으로 잡아 본문과 같은 폭에서 접힌다
  probe: { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 },
  // 크기·굵기는 본문을 그대로 물려받고 색만 옅어진다 — 글의 일부이지 버튼이 아니다
  more: { color: colors.sub, fontWeight: '400' },
})
