package com.odyssey.security

import io.jsonwebtoken.ExpiredJwtException
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.*
import javax.crypto.SecretKey

@Component
class JwtUtil(
    @Value("\${jwt.secret}") private val secret: String,
    @Value("\${jwt.access-expiration}") private val accessExpiration: Long,
    @Value("\${jwt.refresh-expiration}") private val refreshExpiration: Long,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val key: SecretKey by lazy {
        Keys.hmacShaKeyFor(secret.toByteArray())
    }

    fun generateAccessToken(userId: Long, email: String): String {
        return generateToken(userId, email, accessExpiration)
    }

    fun generateRefreshToken(userId: Long, email: String): String {
        return generateToken(userId, email, refreshExpiration)
    }

    fun getRefreshExpirationMs(): Long = refreshExpiration

    private fun generateToken(userId: Long, email: String, expiration: Long): String {
        val now = Date()
        return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .issuedAt(now)
            .expiration(Date(now.time + expiration))
            .signWith(key)
            .compact()
    }

    fun getUserIdFromToken(token: String): Long {
        return getClaims(token).subject.toLong()
    }

    fun validateToken(token: String): Boolean {
        return try {
            getClaims(token)
            true
        } catch (e: ExpiredJwtException) {
            log.debug("JWT expired")
            false
        } catch (e: JwtException) {
            log.debug("JWT invalid: {}", e.message)
            false
        } catch (e: Exception) {
            log.warn("Unexpected error validating JWT: {}", e.message)
            false
        }
    }

    private fun getClaims(token: String) =
        Jwts.parser().verifyWith(key).build().parseSignedClaims(token).payload
}
