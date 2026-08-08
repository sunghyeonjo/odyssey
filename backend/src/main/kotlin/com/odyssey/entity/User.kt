package com.odyssey.entity

import com.odyssey.enums.AuthProvider
import jakarta.persistence.*

@Entity
@Table(name = "users")
class User(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(unique = true, nullable = false)
    val email: String,

    @Column(nullable = true)
    var password: String? = null,

    @Column(length = 20, unique = true, nullable = false)
    var nickname: String,

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    val provider: AuthProvider = AuthProvider.LOCAL,

    @Column(name = "provider_id")
    val providerId: String? = null,

    @Column(length = 200)
    var bio: String? = null,

    @Column(name = "show_on_leaderboard", nullable = false)
    var showOnLeaderboard: Boolean = false,
) : AuditEntity()
