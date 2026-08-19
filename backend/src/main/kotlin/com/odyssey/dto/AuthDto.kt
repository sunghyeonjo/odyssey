package com.odyssey.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class RefreshRequest(
    @field:NotBlank val refreshToken: String,
)

data class LogoutRequest(
    @field:NotBlank val refreshToken: String,
)

data class LoginRequest(
    @field:NotBlank @field:Email val email: String,
    @field:NotBlank val password: String,
)

data class RegisterRequest(
    @field:NotBlank @field:Email val email: String,
    @field:NotBlank @field:Size(min = 8, max = 72) val password: String,
    @field:NotBlank @field:Size(min = 2, max = 20) val nickname: String,
    @field:NotBlank val code: String,
)

data class SendCodeRequest(
    @field:NotBlank @field:Email val email: String,
)

data class VerifyCodeRequest(
    @field:NotBlank @field:Email val email: String,
    @field:NotBlank val code: String,
)

/**
 * 비밀번호 재설정 코드 발송. 가입용 발송과 **조건이 반대**다 —
 * 가입은 없는 주소여야 하고, 재설정은 있는 주소여야 한다.
 */
data class SendPasswordResetCodeRequest(
    @field:NotBlank @field:Email val email: String,
)

data class ResetPasswordRequest(
    @field:NotBlank @field:Email val email: String,
    @field:NotBlank val code: String,
    @field:NotBlank @field:Size(min = 8, max = 72) val newPassword: String,
)

data class AuthResponse(
    val accessToken: String,
    val refreshToken: String,
    val user: UserResponse,
)

data class UserResponse(
    val id: Long,
    val email: String,
    val nickname: String,
    val bio: String?,
    val createdAt: String,
)
