package com.odyssey.service

import com.odyssey.config.OAuth2Properties
import com.odyssey.exception.BadRequestException
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestTemplate

data class OAuthTokenResponse(val accessToken: String)
data class OAuthUserInfo(val email: String, val nickname: String, val providerId: String)

@Service
class OAuthService(
    private val oauth2Properties: OAuth2Properties,
    private val restTemplate: RestTemplate,
) {
    fun getAuthorizationUrl(provider: String, backendBaseUrl: String): String {
        val redirectUri = "$backendBaseUrl/api/v1/auth/oauth2/callback/$provider"
        return when (provider) {
            "google" -> "https://accounts.google.com/o/oauth2/v2/auth" +
                "?client_id=${oauth2Properties.google.clientId}" +
                "&redirect_uri=$redirectUri" +
                "&response_type=code" +
                "&scope=email%20profile" +
                "&prompt=select_account"
            else -> throw BadRequestException("Unsupported provider: $provider")
        }
    }

    fun exchangeCodeForUserInfo(provider: String, code: String, backendBaseUrl: String): OAuthUserInfo {
        val token = exchangeCode(provider, code, backendBaseUrl)
        return fetchUserInfo(provider, token.accessToken)
    }

    private fun exchangeCode(provider: String, code: String, backendBaseUrl: String): OAuthTokenResponse {
        val redirectUri = "$backendBaseUrl/api/v1/auth/oauth2/callback/$provider"
        return when (provider) {
            "google" -> exchangeGoogleCode(code, redirectUri)
            else -> throw BadRequestException("Unsupported provider: $provider")
        }
    }

    private fun exchangeGoogleCode(code: String, redirectUri: String): OAuthTokenResponse {
        val params = LinkedMultiValueMap<String, String>()
        params.add("code", code)
        params.add("client_id", oauth2Properties.google.clientId)
        params.add("client_secret", oauth2Properties.google.clientSecret)
        params.add("redirect_uri", redirectUri)
        params.add("grant_type", "authorization_code")

        val headers = HttpHeaders().apply { contentType = MediaType.APPLICATION_FORM_URLENCODED }
        val response = restTemplate.exchange(
            "https://oauth2.googleapis.com/token",
            HttpMethod.POST,
            HttpEntity(params, headers),
            Map::class.java,
        )
        val accessToken = response.body?.get("access_token") as? String
            ?: throw BadRequestException("Failed to get Google access token")
        return OAuthTokenResponse(accessToken)
    }

    private fun fetchUserInfo(provider: String, accessToken: String): OAuthUserInfo =
        when (provider) {
            "google" -> fetchGoogleUserInfo(accessToken)
            else -> throw BadRequestException("Unsupported provider: $provider")
        }

    private fun fetchGoogleUserInfo(accessToken: String): OAuthUserInfo {
        val headers = HttpHeaders().apply { setBearerAuth(accessToken) }
        val response = restTemplate.exchange(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            HttpMethod.GET,
            HttpEntity<Void>(headers),
            Map::class.java,
        )
        val body = response.body ?: throw BadRequestException("Failed to get Google user info")
        return OAuthUserInfo(
            email = body["email"] as? String ?: throw BadRequestException("Email not found"),
            nickname = body["name"] as? String ?: (body["email"] as String).substringBefore("@"),
            providerId = body["id"].toString(),
        )
    }
}
