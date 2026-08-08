package com.odyssey.service

import com.odyssey.dto.*
import com.odyssey.entity.RefreshToken
import com.odyssey.entity.User
import com.odyssey.enums.AuthProvider
import com.odyssey.exception.*
import com.odyssey.repository.RefreshTokenRepository
import com.odyssey.repository.UserRepository
import com.odyssey.security.JwtUtil
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.SecureRandom
import java.time.Duration
import java.time.LocalDateTime

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val jwtUtil: JwtUtil,
    private val passwordEncoder: PasswordEncoder,
    private val redisTemplate: StringRedisTemplate,
    private val emailService: EmailService,
) {
    fun sendVerificationCode(email: String) {
        if (userRepository.existsByEmail(email)) {
            throw ConflictException("이미 사용 중인 이메일입니다")
        }
        // 60초 쿨다운
        val cooldownKey = "verify:cooldown:$email"
        if (redisTemplate.hasKey(cooldownKey)) {
            throw RateLimitException("잠시 후 다시 시도해주세요 (60초 제한)")
        }
        val code = "%06d".format(SecureRandom().nextInt(1_000_000))
        redisTemplate.opsForValue().set("verify:code:$email", code, Duration.ofMinutes(5))
        redisTemplate.delete("verify:attempts:$email")
        redisTemplate.opsForValue().set(cooldownKey, "1", Duration.ofSeconds(60))
        emailService.sendVerificationCode(email, code)
    }

    fun verifyCode(email: String, code: String) {
        val stored = redisTemplate.opsForValue().get("verify:code:$email")
            ?: throw BadRequestException("인증 코드가 만료되었습니다")
        // 5회 시도 제한
        val attemptsKey = "verify:attempts:$email"
        val attempts = redisTemplate.opsForValue().increment(attemptsKey) ?: 1
        if (attempts == 1L) {
            redisTemplate.expire(attemptsKey, Duration.ofMinutes(5))
        }
        if (attempts > 5) {
            redisTemplate.delete("verify:code:$email")
            redisTemplate.delete(attemptsKey)
            throw BadRequestException("시도 횟수를 초과했습니다. 인증 코드를 다시 발송해주세요")
        }
        if (stored != code) {
            throw BadRequestException("인증 코드가 올바르지 않습니다 (${5 - attempts}회 남음)")
        }
        redisTemplate.delete("verify:code:$email")
        redisTemplate.delete(attemptsKey)
        redisTemplate.opsForValue().set("verify:confirmed:$email", "true", Duration.ofMinutes(10))
    }

    @Transactional
    fun register(request: RegisterRequest): AuthResponse {
        if (userRepository.existsByEmail(request.email)) {
            throw ConflictException("이미 사용 중인 이메일입니다")
        }
        validatePassword(request.password)
        validateNickname(request.nickname)
        val verified = redisTemplate.opsForValue().get("verify:confirmed:${request.email}")
        if (verified != "true") {
            throw BadRequestException("이메일 인증이 필요합니다")
        }
        redisTemplate.delete("verify:confirmed:${request.email}")
        val user = userRepository.save(
            User(
                email = request.email,
                password = passwordEncoder.encode(request.password),
                nickname = request.nickname,
                provider = AuthProvider.LOCAL,
            )
        )
        return createAuthResponse(user)
    }

    @Transactional
    fun login(request: LoginRequest): AuthResponse {
        val rateLimitKey = "login:attempts:${request.email}"
        val attempts = redisTemplate.opsForValue().increment(rateLimitKey) ?: 1
        if (attempts == 1L) {
            redisTemplate.expire(rateLimitKey, Duration.ofMinutes(15))
        }
        if (attempts > 10) {
            throw RateLimitException("로그인 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요")
        }
        val user = userRepository.findByEmail(request.email)
            ?: throw BadRequestException("이메일 또는 비밀번호가 올바르지 않습니다")
        if (user.password == null || !passwordEncoder.matches(request.password, user.password)) {
            throw BadRequestException("이메일 또는 비밀번호가 올바르지 않습니다")
        }
        redisTemplate.delete(rateLimitKey)
        return createAuthResponse(user)
    }

    @Transactional
    fun findOrCreateOAuthUser(email: String, nickname: String, provider: AuthProvider, providerId: String): AuthResponse {
        val user = userRepository.findByEmail(email)
            ?: userRepository.save(
                User(
                    email = email,
                    nickname = nickname,
                    provider = provider,
                    providerId = providerId,
                )
            )
        return createAuthResponse(user)
    }

    @Transactional
    fun refresh(request: RefreshRequest): AuthResponse {
        val stored = refreshTokenRepository.findByToken(request.refreshToken)
            ?: throw UnauthorizedException("Invalid refresh token")
        if (stored.expiresAt.isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(stored)
            throw UnauthorizedException("Refresh token expired")
        }
        refreshTokenRepository.delete(stored)
        val user = userRepository.findById(stored.userId)
            .orElseThrow { NotFoundException("User not found") }
        return createAuthResponse(user)
    }

    @Transactional
    fun logout(request: LogoutRequest) {
        refreshTokenRepository.deleteByToken(request.refreshToken)
    }

    @Transactional(readOnly = true)
    fun isNicknameTaken(nickname: String): Boolean {
        return userRepository.existsByNickname(nickname)
    }

    private fun validatePassword(password: String) {
        if (password.length < 8 || password.length > 72) {
            throw BadRequestException("비밀번호는 8~72자로 입력해주세요")
        }
        val hasLetter = password.any { it.isLetter() }
        val hasDigit = password.any { it.isDigit() }
        val hasSpecial = password.any { !it.isLetterOrDigit() }
        val typesCount = listOf(hasLetter, hasDigit, hasSpecial).count { it }
        if (typesCount < 2) {
            throw BadRequestException("비밀번호는 영문, 숫자, 특수문자 중 2가지 이상 포함해야 합니다")
        }
    }

    private fun validateNickname(nickname: String) {
        if (nickname.length < 2 || nickname.length > 20) {
            throw BadRequestException("닉네임은 2~20자로 입력해주세요")
        }
        if (!nickname.matches(Regex("^[가-힣a-zA-Z0-9_]+$"))) {
            throw BadRequestException("닉네임은 한글, 영문, 숫자, 밑줄만 사용할 수 있습니다")
        }
        if (userRepository.existsByNickname(nickname)) {
            throw ConflictException("이미 사용 중인 닉네임입니다")
        }
    }

    private fun createAuthResponse(user: User): AuthResponse {
        val accessToken = jwtUtil.generateAccessToken(user.id, user.email)
        val refreshToken = jwtUtil.generateRefreshToken(user.id, user.email)
        refreshTokenRepository.save(
            RefreshToken(
                userId = user.id,
                token = refreshToken,
                expiresAt = LocalDateTime.now().plusSeconds(jwtUtil.getRefreshExpirationMs() / 1000),
            )
        )
        return AuthResponse(
            accessToken = accessToken,
            refreshToken = refreshToken,
            user = UserResponse(
                id = user.id,
                email = user.email,
                nickname = user.nickname,
                bio = user.bio,
                createdAt = user.createdAt.toString(),
            ),
        )
    }
}
