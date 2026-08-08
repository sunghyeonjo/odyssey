package com.odyssey.controller

import com.odyssey.dto.*
import com.odyssey.service.UserService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/users")
class UserController(
    private val userService: UserService,
) {
    private fun userId(auth: Authentication): Long = auth.principal as Long

    @GetMapping("/search")
    fun search(
        auth: Authentication,
        @RequestParam q: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<PageResponse<UserSearchResponse>> {
        return ResponseEntity.ok(userService.search(q, page, size))
    }
}
