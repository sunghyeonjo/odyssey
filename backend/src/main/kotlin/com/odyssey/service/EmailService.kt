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
        sendCode(
            email = email,
            subject = "[dayed] 이메일 인증 코드: $code",
            heading = "이메일 인증",
            lead = "아래 인증 코드를 입력해주세요.",
            code = code,
        )
    }

    fun sendPasswordResetCode(email: String, code: String) {
        sendCode(
            email = email,
            subject = "[dayed] 비밀번호 재설정 코드: $code",
            heading = "비밀번호 재설정",
            lead = "아래 코드를 입력하면 새 비밀번호를 정할 수 있어요.",
            code = code,
            note = "본인이 요청한 것이 아니라면 이 메일을 무시하세요. 비밀번호는 그대로 유지됩니다.",
        )
    }

    /** 코드 메일은 제목·머리글·안내문만 다르다 → 껍데기는 한 곳에서만 만든다 */
    private fun sendCode(
        email: String,
        subject: String,
        heading: String,
        lead: String,
        code: String,
        /** 만료 안내 아래에 한 줄 더. 비울 수 있다 */
        note: String = "",
    ) {
        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            setBearerAuth(apiKey)
        }
        val body = mapOf(
            "from" to "dayed <noreply@dayed.cloud>",
            "to" to listOf(email),
            "subject" to subject,
            "html" to """
                <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
                    <h2 style="color: #333;">$heading</h2>
                    <p>$lead</p>
                    <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; background: #f4f4f5; border-radius: 8px; margin: 16px 0;">$code</div>
                    <p style="color: #888; font-size: 13px;">이 코드는 5분 후 만료됩니다.</p>
                    ${if (note.isEmpty()) "" else """<p style="color: #888; font-size: 13px;">$note</p>"""}
                </div>
            """.trimIndent(),
        )
        val request = HttpEntity(body, headers)
        restTemplate.postForEntity("https://api.resend.com/emails", request, String::class.java)
    }
}
