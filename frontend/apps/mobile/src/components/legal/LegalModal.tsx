import { Ionicons } from '@expo/vector-icons'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PRIVACY, TERMS, type LegalDoc } from '@/lib/legal'
import { colors, radius, space, text as type } from '@/theme'

export type LegalKind = 'terms' | 'privacy'

const DOCS: Record<LegalKind, LegalDoc> = { terms: TERMS, privacy: PRIVACY }

/**
 * 한 줄을 어떻게 그릴지. 문서는 마크다운 몇 갈래만 쓰므로 라이브러리를 들이지 않는다 —
 * 표와 제목, 목록, 굵은 글씨면 충분하다.
 */
type Line =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'li'; text: string }
  | { kind: 'row'; cells: string[]; head: boolean }

/** `| a | b |` 를 칸으로 가른다. 구분선(`|---|`)은 앞줄을 머리글로 만든다 */
const parse = (body: string): Line[] => {
  const out: Line[] = []
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (line === '') continue
    // 긴 조는 `1) 2) 3)` 으로 한 번 더 갈린다 — 조보다 먼저 봐야 `##` 에 안 먹힌다
    if (line.startsWith('### ')) { out.push({ kind: 'h3', text: line.slice(4) }); continue }
    if (line.startsWith('## ')) { out.push({ kind: 'h2', text: line.slice(3) }); continue }
    if (line.startsWith('- ')) { out.push({ kind: 'li', text: line.slice(2) }); continue }
    if (line.startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim())
      // 구분선을 만나면 바로 앞 줄이 머리글이었다는 뜻
      if (cells.every((c) => /^-+$/.test(c))) {
        const prev = out[out.length - 1]
        if (prev?.kind === 'row') prev.head = true
        continue
      }
      out.push({ kind: 'row', cells, head: false })
      continue
    }
    out.push({ kind: 'p', text: line })
  }
  return out
}

/** `**굵게**` 만 살린다. 문서에서 강조가 필요한 곳은 그것뿐이다 */
function Rich({ text, style }: { text: string; style: object }) {
  return (
    <Text style={style}>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>
          : part.replace(/`/g, ''),
      )}
    </Text>
  )
}

interface Props {
  /** null 이면 닫혀 있다 */
  kind: LegalKind | null
  onClose: () => void
}

/**
 * 약관·개인정보 처리방침 보기.
 *
 * **화면(라우트)이 아니라 덮개**인 이유 — 가입 화면은 로그인 전이라 앱 네비게이션 밖에 있다.
 * 덮개로 두면 가입 중에도, 설정에서도 같은 것을 같은 모양으로 연다.
 *
 * 동의 체크박스만 있고 읽을 길이 없으면 무엇에 동의하는지 볼 수가 없다 (App Store 5.1.1).
 */
export default function LegalModal({ kind, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const doc = kind === null ? null : DOCS[kind]

  return (
    <Modal visible={kind !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>{doc?.title ?? ''}</Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="닫기">
            <Ionicons name="close" size={24} color={colors.ink} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
        >
          <Text style={styles.updated}>시행일 {doc?.updated ?? ''}</Text>
          {doc && parse(doc.body).map((l, i) => {
            if (l.kind === 'h2') return <Text key={i} style={styles.h2}>{l.text}</Text>
            if (l.kind === 'h3') return <Text key={i} style={styles.h3}>{l.text}</Text>
            if (l.kind === 'li') {
              return (
                <View key={i} style={styles.liRow}>
                  <Text style={styles.bullet}>·</Text>
                  <Rich text={l.text} style={styles.p} />
                </View>
              )
            }
            if (l.kind === 'row') {
              return (
                <View key={i} style={[styles.row, l.head && styles.rowHead]}>
                  {l.cells.map((c, j) => (
                    <Rich key={j} text={c} style={l.head ? styles.cellHead : styles.cell} />
                  ))}
                </View>
              )
            }
            return <Rich key={i} text={l.text} style={styles.p} />
          })}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  nav: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  navTitle: { fontSize: type.title, fontWeight: '700', color: colors.ink },

  body: { paddingHorizontal: 20, gap: space.md },
  updated: { fontSize: type.caption, color: colors.faint },

  h2: { fontSize: type.lead, fontWeight: '800', color: colors.ink, marginTop: space.md },
  // 조 안의 갈래. 조보다 한 단 작고 옅다 — 같은 크기면 어느 쪽이 위인지 안 보인다
  h3: { fontSize: type.body, fontWeight: '700', color: colors.sub, marginTop: space.xs },
  p: { fontSize: type.body, lineHeight: 22, color: colors.sub },
  bold: { fontWeight: '700', color: colors.ink },

  liRow: { flexDirection: 'row', gap: space.sm, paddingLeft: space.xs },
  bullet: { fontSize: type.body, lineHeight: 22, color: colors.faint },

  // 표는 선이 아니라 면으로 가른다 — 앱의 다른 곳과 같은 규칙
  row: { flexDirection: 'row', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.chip, paddingHorizontal: space.md, paddingVertical: space.sm },
  rowHead: { backgroundColor: colors.accentSoft },
  cell: { flex: 1, fontSize: type.small, lineHeight: 19, color: colors.sub },
  cellHead: { flex: 1, fontSize: type.micro, fontWeight: '700', color: colors.sub },
})
