# Backend — Spring Boot (Kotlin) 컨벤션

## 최우선 원칙 — 공식 레퍼런스 준수

**Kotlin 공식 코딩 컨벤션(https://kotlinlang.org/docs/coding-conventions.html)을 반드시 지킬 것.**
아래 프로젝트 규칙보다 공식 레퍼런스가 우선함. 충돌하면 공식 레퍼런스를 따르고, 프로젝트 규칙을 고칠 것.

자주 어기는 항목:

| 항목 | 규칙 |
|---|---|
| 클래스 멤버 순서 | 프로퍼티/초기화 블록 → 보조 생성자 → 메서드 → **`companion object`(맨 뒤)** |
| 표현식 본문 | 본문이 단일 표현식인 함수는 `= 표현식`. `{ return x }` 금지 (`try`/`when`/`if`도 표현식) |
| 어노테이션 | 각각 별도 줄. **인자 없는** 어노테이션만 같은 줄에 붙일 수 있음 |
| Named argument | 같은 원시 타입 파라미터가 2개 이상이거나 `Boolean` 파라미터면 이름 붙여 호출 |
| 상수 이름 | `const val` / 최상위·object의 `val`(불변 데이터)은 `SCREAMING_SNAKE_CASE` |
| 약어 | 2글자는 전부 대문자(`IOStream`), 3글자 이상은 첫 글자만(`JwtUtil`, `HttpInputStream`) |
| Trailing comma | 선언부(생성자 파라미터, 프로퍼티 목록 등)에는 붙일 것 |
| 들여쓰기 | 스페이스 4칸. 탭 금지 |
| 콜론 공백 | 타입-상위타입 구분 시 앞뒤 공백(`class A : B()`), 선언-타입 구분 시 앞 공백 없음(`val a: Int`) |

공식 컨벤션에 **없는** 규칙(와일드카드 임포트 금지, 줄 길이 제한 등)은 공식 근거로 내세우지 말 것.
필요하면 ktlint/detekt 설정으로 별도 합의해서 도입.

## 아키텍처
- 레이어: Controller → Service → Repository
- Entity는 JPA 관계 매핑 없이 userId FK만 사용 (application-level join)
- DTO는 `dto/` 패키지에 도메인별 파일로 관리

## DB 쿼리 패턴
- 목록 조회 시 연관 데이터(댓글 수, 좋아요 수, 이미지 메타)는 반드시 배치 쿼리 사용
  - `countByTradeIdIn()`, `findLikeCountsByTradeIds()` 등 projection 쿼리
  - `associateBy { it.id }` 패턴으로 O(1) 매핑
- 이미지 데이터(BLOB)는 projection으로 메타만 조회. 바이너리는 별도 엔드포인트
- N+1 방지: 루프 안에서 repository 호출 금지. 항상 ID 목록 수집 후 배치 쿼리

## 캐시 전략
- Redis 캐시, TTL 기반 (default 5분, stocks 24시간, leaderboard 1시간)
- `@Cacheable` 키에 userId 포함 필수 (다른 유저 캐시 오염 방지)
- `allEntries=true` 사용 최소화 — 유저별 키 eviction 우선
- 캐시 키 네이밍: `"userId-suffix"` 형식

## 트랜잭션
- 읽기 메서드: `@Transactional(readOnly = true)` 필수
- 쓰기 메서드: `@Transactional` 필수
- Service 레이어에서만 트랜잭션 관리

## Controller 규칙
- 상태코드가 200 고정이면 `ResponseEntity` 래핑 금지 — DTO를 직접 반환
- 위 조건에서 본문이 한 문장이면 단일 표현식(`=`)으로 작성
- 반환 타입은 항상 명시. 추론에 맡기면 응답 스키마가 코드에서 안 보임
- 200이 아닌 상태코드는 `@ResponseStatus`로 선언 (예: 204 → `@ResponseStatus(HttpStatus.NO_CONTENT)`)
- 헤더를 직접 다뤄야 하면 `ResponseEntity` 유지 — 302 `Location`, `Content-Disposition`, `Cache-Control` 등
- `let`/`run`/`also`를 동원해야 한 줄이 되는 경우는 블록 본문 사용

```kotlin
// 단일 표현식
@PostMapping("/login")
fun login(@Valid @RequestBody request: LoginRequest): AuthResponse =
    authService.login(request)

// 부수효과 + 반환 = 블록 본문
@PostMapping("/send-code")
fun sendCode(@Valid @RequestBody request: SendCodeRequest): Map<String, String> {
    authService.sendVerificationCode(request.email)
    return mapOf("message" to "인증 코드가 발송되었습니다")
}

// 204 — 표현식이 아니라 애노테이션으로
@ResponseStatus(HttpStatus.NO_CONTENT)
@PostMapping("/logout")
fun logout(@Valid @RequestBody request: LogoutRequest) {
    authService.logout(request)
}
```

## 예외 처리
- `com.odyssey.exception` 패키지의 sealed AppException 계층만 사용
- `IllegalArgumentException`, `IllegalStateException` 사용 금지
- Controller에서 예외 throw 금지 — Service에서 처리

## Entity 규칙
- `createdAt`/`updatedAt`는 AuditEntity가 자동 관리, 수동 할당 금지
- `User.provider`는 AuthProvider enum 사용, 문자열 금지
- 인덱스는 `@Table(indexes = [...])` 로 엔티티에 선언

## Repository 규칙
- DELETE 커스텀 쿼리에 `@Modifying` 필수
- 배치 조회 메서드 네이밍: `findBy[Entity]IdIn()`, `countBy[Entity]IdIn()`
- Projection interface는 repository 파일에 함께 선언

## 보안
- JWT (HS256) 인증, stateless session
- 모든 쓰기 작업에서 userId == authenticated user 검증 필수
- 비밀번호: BCrypt (기본 strength)
- `application-local.yml` 절대 커밋 금지

## 빌드 & 실행
- Java 21 필수
- `./gradlew bootRun --args='--spring.profiles.active=local'`
- 빌드 검증: `./gradlew clean compileKotlin`
