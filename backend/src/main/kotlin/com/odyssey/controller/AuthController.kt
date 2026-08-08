package com.odyssey.controller

import com.odyssey.dto.*
import com.odyssey.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val authService: AuthService,
) {
    @PostMapping("/send-code")
    fun sendCode(@Valid @RequestBody request: SendCodeRequest): ResponseEntity<Map<String, String>> {
        authService.sendVerificationCode(request.email)
        return ResponseEntity.ok(mapOf("message" to "인증 코드가 발송되었습니다"))
    }

    @PostMapping("/verify-code")
    fun verifyCode(@Valid @RequestBody request: VerifyCodeRequest): ResponseEntity<Map<String, String>> {
        authService.verifyCode(request.email, request.code)
        return ResponseEntity.ok(mapOf("message" to "인증이 완료되었습니다"))
    }

    @GetMapping("/check-nickname")
    fun checkNickname(@RequestParam nickname: String): ResponseEntity<Map<String, Boolean>> {
        val available = !authService.isNicknameTaken(nickname)
        return ResponseEntity.ok(mapOf("available" to available))
    }

    @PostMapping("/register")
    fun register(@Valid @RequestBody request: RegisterRequest): ResponseEntity<AuthResponse> {
        return ResponseEntity.ok(authService.register(request))
    }

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<AuthResponse> {
        return ResponseEntity.ok(authService.login(request))
    }

    @PostMapping("/refresh")
    fun refresh(@Valid @RequestBody request: RefreshRequest): ResponseEntity<AuthResponse> {
        return ResponseEntity.ok(authService.refresh(request))
    }

    @PostMapping("/logout")
    fun logout(@Valid @RequestBody request: LogoutRequest): ResponseEntity<Void> {
        authService.logout(request)
        return ResponseEntity.noContent().build()
    }
}
