/**
 * 가입·재설정에서 쓰는 입력 규칙 — **서버(`AuthDto.kt`)와 같은 값**.
 *
 * 클라이언트가 서버보다 느슨하면 다 채운 뒤에 400 을 받고, 빡빡하면 서버가 받아줄 값을 막는다.
 * 두 곳이 어긋나지 않게 여기 한 곳에만 적는다.
 */

/** 서버: `@Size(min = 8, max = 72)` */
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72
/**
 * 서버 `AuthService.validatePassword` 는 길이 말고 **글자 종류도** 본다 —
 * 영문·숫자·특수문자 중 둘 이상. DTO 애노테이션에는 없어서 놓치기 쉽다.
 */
export const PASSWORD_TYPES_MIN = 2
/** 서버: `@Size(min = 2, max = 20)` */
export const NICKNAME_MIN = 2
export const NICKNAME_MAX = 20
/** 서버 `AuthService.validateNickname` 의 정규식과 같은 것 */
const NICKNAME_CHARS = /^[가-힣a-zA-Z0-9_]+$/

/**
 * 글자 종류 세기 — 서버는 `isLetter` / `isDigit` / 그 밖으로 가른다.
 * `[a-zA-Z]` 로 좁히면 한글이 '특수문자' 로 세어져 서버는 막는 것을 앱이 통과시킨다
 */
const typeCount = (v: string) =>
  [/\p{L}/u.test(v), /\p{Nd}/u.test(v), /[^\p{L}\p{Nd}]/u.test(v)].filter(Boolean).length

/**
 * 서버는 `@Email` 을 쓴다. 여기서는 오타를 걸러줄 만큼만 본다 —
 * 정규식을 빡빡하게 쓰면 서버가 받아주는 주소를 앱이 막는 일이 생긴다.
 */
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

export const isNickname = (v: string) => {
  const n = v.trim().length
  return n >= NICKNAME_MIN && n <= NICKNAME_MAX
}

/** 인증 코드는 여섯 자리 숫자 */
export const CODE_LEN = 6
export const isCode = (v: string) => v.length === CODE_LEN
/** 숫자만 남기고 여섯 자리로 자른다 — 붙여넣기로 들어온 공백·하이픈까지 받아준다 */
export const cleanCode = (v: string) => v.replace(/\D/g, '').slice(0, CODE_LEN)

/*
  ── 무엇이 틀렸는지 말해주는 문구 ──

  규칙과 **같은 자리**에 둔다. 화면마다 문구를 각자 쓰면 같은 잘못에 다른 말이 나온다.
  버튼만 회색으로 죽이면 사용자는 왜 안 되는지 알 길이 없다 —
  통과하면 `null`, 아니면 띄울 문장을 돌려준다.
*/

export const emailError = (v: string): string | null =>
  v.trim() === '' ? '이메일을 입력해 주세요'
    : isEmail(v) ? null : '이메일 형식이 올바르지 않아요'

export const nicknameError = (v: string): string | null => {
  const t = v.trim()
  if (t.length === 0) return '닉네임을 입력해 주세요'
  if (t.length < NICKNAME_MIN) return `${NICKNAME_MIN}자 이상이어야 해요`
  if (t.length > NICKNAME_MAX) return `${NICKNAME_MAX}자까지예요`
  if (!NICKNAME_CHARS.test(t)) return '한글·영문·숫자·밑줄만 쓸 수 있어요'
  return null
}

export const passwordError = (v: string): string | null =>
  v === '' ? '비밀번호를 입력해 주세요'
    : v.length < PASSWORD_MIN ? `${PASSWORD_MIN}자 이상이어야 해요`
      : typeCount(v) < PASSWORD_TYPES_MIN ? '영문·숫자·특수문자 중 2가지 이상 넣어 주세요'
        : null

export const confirmError = (password: string, confirm: string): string | null =>
  confirm === '' ? '비밀번호를 한 번 더 입력해 주세요'
    : password === confirm ? null : '비밀번호가 서로 달라요'

export const codeError = (v: string): string | null =>
  v === '' ? '코드를 입력해 주세요'
    : isCode(v) ? null : `${CODE_LEN}자리를 입력해 주세요`
