package com.odyssey.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

@Service
class EmailService(
    @Value("\${resend.api-key}") private val apiKey: String,
    private val restTemplate: RestTemplate,
) {
    fun sendVerificationCode(email: String, code: String) {
        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            setBearerAuth(apiKey)
        }
        val body = mapOf(
            "from" to "dayed <noreply@dayed.cloud>",
            "to" to listOf(email),
            "subject" to "[dayed] 이메일 인증 코드: $code",
            "html" to """
                <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
                    <h2 style="color: #333;">이메일 인증</h2>
                    <p>아래 인증 코드를 입력해주세요.</p>
                    <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; background: #f4f4f5; border-radius: 8px; margin: 16px 0;">$code</div>
                    <p style="color: #888; font-size: 13px;">이 코드는 5분 후 만료됩니다.</p>
                </div>
            """.trimIndent(),
        )
        val request = HttpEntity(body, headers)
        restTemplate.postForEntity("https://api.resend.com/emails", request, String::class.java)
    }
}
