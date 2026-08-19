/**
 * 인증 목업 — 서버 없이 로그인·가입·비밀번호 찾기를 끝까지 지나갈 수 있게 한다.
 *
 * 실서버와 **같은 실패도 낸다**: 짧은 비밀번호, 겹치는 닉네임, 여섯 자리가 아닌 코드.
 * 다 통과시켜 버리면 오류 화면을 한 번도 못 보고 넘어간다.
 */
import type {
  AuthResponse,
  ChangePasswordRequest,
  RegisterRequest,
  ResetPasswordRequest,
  User,
} from '@odyssey/shared'
import { isCode, isEmail, passwordError } from '@/lib/authRules'

/** 목업의 `me`(성현·id 1)와 같은 사람 */
export const MOCK_USER: User = {
  id: 1,
  email: 'dev@dayed.cloud',
  nickname: '성현',
  bio: null,
  createdAt: '2026-01-01T00:00:00.000Z',
}

export const MOCK_SESSION: AuthResponse = {
  accessToken: 'mock-access',
  refreshToken: 'mock-refresh',
  user: MOCK_USER,
}

/**
 * 겹치는 닉네임 — 중복 확인이 실제로 걸리는 걸 볼 수 있어야 한다.
 * 프로필 편집도 같은 목록을 본다(`mock.updateMe`) — 두 벌이면 한쪽만 걸린다.
 */
export const TAKEN_NICKNAMES = ['성현', 'dayed', 'admin', 'test']

/**
 * 지금 비밀번호. 목업에도 있어야 **현재 비밀번호가 틀린 경우**를 볼 수 있다.
 * 첫 값은 심사용 시연 계정과 같다(`APP_REVIEW.md`). 로그인하면 그때 쓴 것으로 바뀐다.
 */
let storedPassword = 'Dayed!2026'

/**
 * 코드를 보낸 주소. 안 보낸 주소로 확인을 시도하면 실서버처럼 막는다.
 * **가입과 재설정을 갈라 담는다** — 서버도 그렇다(한 칸이면 가입 코드로 남의 비밀번호를 바꿀 수 있다)
 */
const sent = { signup: new Set<string>(), reset: new Set<string>() }
/**
 * 코드 확인까지 끝난 주소. **서버와 같은 두 칸 구조다** —
 * 서버 `register` 는 넘어온 코드를 안 보고 `verifyCode` 가 세워둔 이 표시만 본다.
 * 목업이 코드만 보고 통과시키면 `verifyCode` 를 안 불러도 여기서는 가입이 되고,
 * 실서버에 붙이는 날 처음으로 막힌다
 */
const confirmed = new Set<string>()

const wait = <T>(v: T, ms = 400): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms))
const fail = (msg: string) => Promise.reject(new Error(msg))

export const authMock = {
  sendCode: (email: string) => {
    if (!isEmail(email)) return fail('이메일 형식이 올바르지 않습니다')
    sent.signup.add(email)
    return wait(undefined)
  },

  /** 개발 중에는 **아무 여섯 자리 숫자**나 통과한다 — 받을 메일이 없으니 */
  verifyCode: (email: string, code: string) => {
    if (!sent.signup.has(email)) return fail('먼저 인증 코드를 받아 주세요')
    if (!isCode(code)) return fail('코드는 6자리예요')
    confirmed.add(email)
    return wait(undefined)
  },

  /** 서버처럼 **없는 주소여도 성공으로** 답한다 — 갈라서 알려주면 계정을 훑을 수 있다 */
  sendPasswordResetCode: (email: string) => {
    if (!isEmail(email)) return fail('이메일 형식이 올바르지 않습니다')
    sent.reset.add(email)
    return wait(undefined)
  },

  checkNickname: (nickname: string) => wait(!TAKEN_NICKNAMES.includes(nickname.trim()), 250),

  register: ({ email, password, nickname }: RegisterRequest): Promise<AuthResponse> => {
    // 서버와 같은 판정 — 코드가 아니라 `verifyCode` 가 남긴 표시를 본다
    if (!confirmed.has(email)) return fail('이메일 인증이 필요합니다')
    const bad = passwordError(password)
    if (bad) return fail(bad)
    if (TAKEN_NICKNAMES.includes(nickname.trim())) return fail('이미 쓰는 닉네임입니다')
    return wait({ ...MOCK_SESSION, user: { ...MOCK_USER, email, nickname } })
  },

  login: (email: string, password: string): Promise<AuthResponse> => {
    if (!isEmail(email)) return fail('이메일 형식이 올바르지 않습니다')
    // 로그인은 왜 틀렸는지 갈라주지 않는다 — 서버도 같은 문장 하나만 준다
    if (password.length < 8) return fail('이메일 또는 비밀번호를 확인해 주세요')
    storedPassword = password
    return wait({ ...MOCK_SESSION, user: { ...MOCK_USER, email } })
  },

  /**
   * 로그인한 채로 바꾸기 — 코드가 아니라 **현재 비밀번호**로 본인을 확인한다.
   * 메일함까지 가지 않아도 되고, 남이 내 폰을 집어 든 경우도 막힌다.
   */
  changePassword: ({ currentPassword, newPassword }: ChangePasswordRequest) => {
    if (currentPassword !== storedPassword) return fail('현재 비밀번호가 맞지 않아요')
    if (newPassword === currentPassword) return fail('지금 쓰는 비밀번호와 같아요')
    const bad = passwordError(newPassword)
    if (bad) return fail(bad)
    storedPassword = newPassword
    return wait(undefined)
  },

  resetPassword: ({ email, code, newPassword }: ResetPasswordRequest) => {
    if (!sent.reset.has(email)) return fail('인증 코드가 만료되었습니다')
    if (!isCode(code)) return fail('코드가 맞지 않습니다')
    const bad = passwordError(newPassword)
    if (bad) return fail(bad)
    sent.reset.delete(email)
    storedPassword = newPassword
    return wait(undefined)
  },

  logout: () => wait(undefined, 100),
}
