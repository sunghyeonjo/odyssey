/**
 * 글만 남긴 날의 **종이**.
 *
 * 이 앱은 무채색만 쓰고 진짜 색은 사진에서만 나온다.
 * 사진이 없는 날은 예외다 — 종이가 사진 자리를 대신하므로, 거기서는 색이 내용이 된다.
 * 대신 채도를 낮게 눌러 UI 와 싸우지 않게 한다.
 *
 * 종이는 배경과 글씨를 **함께** 들고 다닌다. 배경만 저장하고 글씨를 그때그때 계산하면
 * 달력 칸·상세·썸네일이 각자 다른 규칙으로 계산해 셋이 어긋난다.
 */
import type { Paper } from '@/api/types'

/** 배경 후보. 흰 → 회 → 색 → 어두운 것 순 (고르는 손이 왼쪽부터 밝은 쪽을 만난다) */
export const PAPER_BGS = [
  '#FFFFFF',
  '#EDF0F4',
  '#F3E7DA',
  '#E4EDE4',
  '#E7E9F5',
  '#F6E3E3',
  '#3B4657',
  '#1E2128',
] as const

/** 글씨는 두 갈래뿐 — 진한 먹과 흰 것. 자유롭게 고르게 두면 안 읽히는 조합이 나온다 */
export const PAPER_INKS = ['#191D24', '#FFFFFF'] as const

export const DEFAULT_PAPER: Paper = { bg: '#EDF0F4', ink: '#191D24' }

/** 배경을 고르면 글씨는 읽히는 쪽으로 먼저 맞춰준다. 사용자는 그 뒤에 뒤집을 수 있다 */
export function inkFor(bg: string): string {
  const h = bg.replace('#', '')
  const lum =
    (0.299 * parseInt(h.slice(0, 2), 16) +
      0.587 * parseInt(h.slice(2, 4), 16) +
      0.114 * parseInt(h.slice(4, 6), 16)) /
    255
  return lum > 0.6 ? PAPER_INKS[0] : PAPER_INKS[1]
}

/**
 * 그날의 종이. 없으면 기본 종이 —
 * 종이라는 개념이 생기기 전에 남긴 기록도 어딘가에서는 그려져야 한다.
 */
export const paperOf = (p?: Paper): Paper => p ?? DEFAULT_PAPER

/**
 * 종이에 쓴 글의 크기 — **어디서나 같다.**
 *
 * 한때 길이에 따라 키웠다 줄였다 했는데(짧으면 크게), 같은 글이 화면마다 다르게 보이고
 * 한 글자 지웠다고 글씨가 커지는 게 거슬렸다. **크기는 글의 성질이 아니다.**
 *
 * `15 / 22` 는 사진 아래 글과 같은 값이다 — 종이에 쓴 글이나 사진 아래 붙인 글이나
 * 그날 쓴 한 줄이라는 점에서 같은 것이고, 같은 것은 같은 크기여야 한다.
 * 280자를 꽉 채워도, 스무 줄로 끊어 써도 상세의 종이 안에 들어오는 크기이기도 하다.
 */
export const NOTE_FONT = { fontSize: 15, lineHeight: 22 } as const
