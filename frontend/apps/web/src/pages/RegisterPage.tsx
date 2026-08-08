import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/api/auth'

type Step = 1 | 2 | 3

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1)
  const [nickname, setNickname] = useState('')
  const [nicknameChecked, setNicknameChecked] = useState(false)
  const [nicknameAvailable, setNicknameAvailable] = useState(false)
  const [checkingNickname, setCheckingNickname] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const nicknameFormatValid = nickname.length >= 2 && nickname.length <= 20 && /^[가-힣a-zA-Z0-9_]+$/.test(nickname)

  const handleCheckNickname = async () => {
    setCheckingNickname(true)
    try {
      const { data } = await authApi.checkNickname(nickname)
      setNicknameChecked(true)
      setNicknameAvailable(data.available)
    } catch {
      setNicknameChecked(true)
      setNicknameAvailable(false)
    } finally {
      setCheckingNickname(false)
    }
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.sendCode({ email })
      setStep(2)
    } catch (err: any) {
      setError(err.response?.data?.message || '인증 코드 발송에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.verifyCode({ email, code })
      setStep(3)
    } catch (err: any) {
      setError(err.response?.data?.message || '인증 코드 확인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.register({ email, password, nickname, code })
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      window.location.href = '/'
    } catch (err: any) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const stepLabels = ['기본 정보', '코드 확인', '비밀번호']

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center pb-2">
          <img src="/logo.svg" alt="dayed" className="h-12 w-12 mb-2" />
          <h1 className="text-2xl font-bold">회원가입</h1>
          <div className="flex items-center gap-2 mt-2">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    i + 1 <= step
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`text-xs ${i + 1 <= step ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <div className={`h-px w-4 ${i + 1 < step ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="nickname">닉네임</Label>
                <div className="flex gap-2">
                  <Input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value)
                      setNicknameChecked(false)
                      setNicknameAvailable(false)
                    }}
                    maxLength={20}
                    placeholder="닉네임"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={!nicknameFormatValid || checkingNickname}
                    onClick={handleCheckNickname}
                  >
                    {checkingNickname ? '확인 중' : '중복 확인'}
                  </Button>
                </div>
                {nickname.length > 0 && !nicknameFormatValid && (
                  <p className="text-xs text-destructive">
                    {nickname.length < 2
                      ? '2자 이상 입력해주세요'
                      : '한글, 영문, 숫자, 밑줄(_)만 사용할 수 있습니다'}
                  </p>
                )}
                {nicknameChecked && (
                  <p className={`text-xs ${nicknameAvailable ? 'text-green-600' : 'text-destructive'}`}>
                    {nicknameAvailable ? '\u2713 사용 가능한 닉네임입니다' : '이미 사용 중인 닉네임입니다'}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">2~20자, 한글/영문/숫자/밑줄</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !nicknameChecked || !nicknameAvailable}
              >
                {loading ? '발송 중...' : '인증 코드 발송'}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>{email}</strong>으로 6자리 인증 코드를 보냈습니다.
              </p>
              <div className="space-y-1">
                <Label htmlFor="code">인증 코드</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? '확인 중...' : '확인'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={() => { setStep(1); setCode(''); setError('') }}
              >
                이전으로 돌아가기
              </Button>
            </form>
          )}

          {step === 3 && (() => {
            const hasLength = password.length >= 8
            const hasLetter = /[a-zA-Z]/.test(password)
            const hasDigit = /\d/.test(password)
            const hasSpecial = /[^a-zA-Z0-9]/.test(password)
            const typesCount = [hasLetter, hasDigit, hasSpecial].filter(Boolean).length
            const passwordValid = hasLength && typesCount >= 2
            const passwordMatch = password === passwordConfirm && passwordConfirm.length > 0
            const canSubmit = passwordValid && passwordMatch

            return (
              <form onSubmit={handleRegister} className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  <strong>{nickname}</strong>님, 비밀번호를 설정해주세요.
                </p>
                <div className="space-y-1">
                  <Label htmlFor="password">비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    maxLength={72}
                    required
                  />
                  {password.length > 0 && (
                    <ul className="space-y-0.5 text-xs mt-1">
                      <li className={hasLength ? 'text-green-600' : 'text-muted-foreground'}>
                        {hasLength ? '\u2713' : '\u2022'} 8자 이상
                      </li>
                      <li className={typesCount >= 2 ? 'text-green-600' : 'text-muted-foreground'}>
                        {typesCount >= 2 ? '\u2713' : '\u2022'} 영문, 숫자, 특수문자 중 2가지 이상
                        <span className="text-muted-foreground ml-1">
                          ({[hasLetter && '영문', hasDigit && '숫자', hasSpecial && '특수문자'].filter(Boolean).join(', ') || '없음'})
                        </span>
                      </li>
                    </ul>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    maxLength={72}
                    required
                  />
                  {passwordConfirm.length > 0 && (
                    <p className={`text-xs ${passwordMatch ? 'text-green-600' : 'text-destructive'}`}>
                      {passwordMatch ? '\u2713 비밀번호가 일치합니다' : '비밀번호가 일치하지 않습니다'}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading || !canSubmit}>
                  {loading ? '가입 중...' : '가입 완료'}
                </Button>
              </form>
            )
          })()}

          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-primary underline-offset-4 hover:underline">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
