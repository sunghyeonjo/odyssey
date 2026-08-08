package com.odyssey.controller

import com.odyssey.enums.AuthProvider
import com.odyssey.service.AuthService
import com.odyssey.service.OAuthService
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.net.URI
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

@RestController
@RequestMapping("/api/v1/auth/oauth2")
class OAuthController(
    private val oAuthService: OAuthService,
    private val authService: AuthService,
    @Value("\${backend.url}") private val backendUrl: String,
    @Value("\${frontend.url}") private val frontendUrl: String,
) {
    @GetMapping("/{provider}")
    fun redirectToProvider(@PathVariable provider: String): ResponseEntity<Void> {
        val authUrl = oAuthService.getAuthorizationUrl(provider, backendUrl)
        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(authUrl))
            .build()
    }

    @GetMapping("/callback/{provider}")
    fun handleCallback(
        @PathVariable provider: String,
        @RequestParam code: String,
    ): ResponseEntity<Void> {
        val userInfo = oAuthService.exchangeCodeForUserInfo(provider, code, backendUrl)
        val authResponse = authService.findOrCreateOAuthUser(
            email = userInfo.email,
            nickname = userInfo.nickname,
            provider = AuthProvider.valueOf(provider.uppercase()),
            providerId = userInfo.providerId,
        )
        val userJson = URLEncoder.encode(
            """{"id":${authResponse.user.id},"email":"${authResponse.user.email}","nickname":"${authResponse.user.nickname}","createdAt":"${authResponse.user.createdAt}"}""",
            StandardCharsets.UTF_8,
        )
        val redirectUrl = "$frontendUrl/oauth/callback" +
            "?accessToken=${authResponse.accessToken}" +
            "&refreshToken=${authResponse.refreshToken}" +
            "&user=$userJson"
        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(redirectUrl))
            .build()
    }
}
