package com.odyssey.controller

import com.odyssey.dto.*
import com.odyssey.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val authService: AuthService,
) {
    @PostMapping("/send-code")
    fun sendCode(@Valid @RequestBody request: SendCodeRequest): Map<String, String> {
        authService.sendVerificationCode(request.email)
        return mapOf("message" to "인증 코드가 발송되었습니다")
    }

    @PostMapping("/verify-code")
    fun verifyCode(@Valid @RequestBody request: VerifyCodeRequest): Map<String, String> {
        authService.verifyCode(request.email, request.code)
        return mapOf("message" to "인증이 완료되었습니다")
    }

    @GetMapping("/check-nickname")
    fun checkNickname(@RequestParam nickname: String): Map<String, Boolean> =
        mapOf("available" to !authService.isNicknameTaken(nickname))

    @PostMapping("/register")
    fun register(@Valid @RequestBody request: RegisterRequest): AuthResponse =
        authService.register(request)

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): AuthResponse =
        authService.login(request)

    @PostMapping("/refresh")
    fun refresh(@Valid @RequestBody request: RefreshRequest): AuthResponse =
        authService.refresh(request)

    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PostMapping("/logout")
    fun logout(@Valid @RequestBody request: LogoutRequest) {
        authService.logout(request)
    }
}
