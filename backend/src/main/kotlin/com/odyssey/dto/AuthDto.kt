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
