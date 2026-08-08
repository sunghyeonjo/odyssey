package com.odyssey.repository

import com.odyssey.entity.RefreshToken
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying

interface RefreshTokenRepository : JpaRepository<RefreshToken, Long> {
    fun findByToken(token: String): RefreshToken?

    @Modifying
    fun deleteByUserId(userId: Long)

    @Modifying
    fun deleteByToken(token: String)
}
