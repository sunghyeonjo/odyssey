import { StyleSheet } from 'react-native'
import { colors, radius, text } from '@/theme'

/**
 * 로그인·회원가입 화면 공유 스타일.
 *
 * 입력칸에 **테두리를 두르지 않는다** — 이 앱은 층을 선이 아니라 면으로 가른다.
 * 옅은 바탕 위의 순백 면이면 그것만으로 입력칸으로 읽힌다.
 * 모서리와 버튼 굴림도 앱의 다른 곳(컴포저의 `담기`, 카드)과 같은 값을 쓴다.
 */
export const authStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  /* 위아래 여백은 부르는 쪽이 안전영역을 더해서 넣는다 — 칸이 화면보다 길어지면 제목이 상태 표시줄 밑으로 들어간다 */
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28 },
  title: { color: colors.ink, fontSize: text.display, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  /** 부제 없이 제목만 있을 때. 제목은 아래 여백을 안 갖는다 — 부제가 붙는 화면에서 둘이 벌어진다 */
  titleOnly: { marginBottom: 32 },
  subtitle: { color: colors.sub, fontSize: text.body, textAlign: 'center', marginTop: 4, marginBottom: 36 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: 18,
    paddingVertical: 15,
    color: colors.ink,
    fontSize: text.lead,
    marginBottom: 10,
  },
  codeInput: { fontSize: text.display, letterSpacing: 12, textAlign: 'center' },
  /** 칸 안에 손잡이(보기 토글 등)가 들어가는 줄. 안쪽 여백은 `input` 과 같아야 줄이 안 어긋난다 */
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: radius.card,
    paddingHorizontal: 18, marginBottom: 10,
  },
  inputFlex: { flex: 1, paddingVertical: 15, color: colors.ink, fontSize: text.lead },
  /** 칸 바로 아래 한 줄 — 평소엔 안내, 틀리면 빨강, 통과하면 초록 */
  hint: { color: colors.sub, fontSize: text.small, lineHeight: 18, marginBottom: 12, marginLeft: 4 },
  hintBad: { color: colors.danger },
  hintGood: { color: colors.ok },
  /** 버튼 위 한 줄 — **서버가 준 말과 흐름 문제만.** 칸별 잘못은 그 칸 밑에서 말한다 */
  error: { color: colors.danger, fontSize: text.body, marginBottom: 8, marginLeft: 4 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.card,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonPressed: { transform: [{ translateY: 2 }] },
  buttonText: { color: '#fff', fontSize: text.lead, fontWeight: '700' },
  footer: { alignItems: 'center', marginTop: 24 },
  link: { color: colors.sub, fontSize: text.body, textDecorationLine: 'underline' },

  /*
    개발용 지름길. 오른쪽 위 구석에 작게 — 입력칸 흐름을 안 건드리는 자리다.
    옅은 테두리만 둘러 앱의 다른 단추들과 섞이지 않게 한다 (이건 제품이 아니다)
  */
  devWrap: { position: 'absolute', right: 16, top: 0, zIndex: 1 },
  devBtn: {
    marginTop: 8, height: 30, paddingHorizontal: 12, justifyContent: 'center',
    borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  devText: { color: colors.sub, fontSize: text.caption, fontWeight: '700' },
})
