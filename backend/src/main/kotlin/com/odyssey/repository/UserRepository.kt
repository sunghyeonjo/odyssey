package com.odyssey.repository

import com.odyssey.entity.User
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository

interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): User?
    fun existsByEmail(email: String): Boolean
    fun existsByNickname(nickname: String): Boolean
    fun findByNicknameContainingIgnoreCase(keyword: String, pageable: Pageable): Page<User>
    fun findByShowOnLeaderboardTrue(): List<User>
    fun findByNicknameIn(nicknames: List<String>): List<User>
}
