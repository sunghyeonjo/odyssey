# Backend — Spring Boot (Kotlin) 컨벤션

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
