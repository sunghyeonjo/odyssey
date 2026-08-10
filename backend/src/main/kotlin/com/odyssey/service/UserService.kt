package com.odyssey.service

import com.odyssey.dto.PageResponse
import com.odyssey.dto.UserSearchResponse
import com.odyssey.repository.UserRepository
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class UserService(
    private val userRepository: UserRepository,
) {
    @Transactional(readOnly = true)
    fun search(query: String, page: Int, size: Int): PageResponse<UserSearchResponse> {
        val result = userRepository.findByNicknameContainingIgnoreCase(query, PageRequest.of(page, size))
        return PageResponse(
            content = result.content.map { UserSearchResponse(id = it.id, nickname = it.nickname, bio = it.bio) },
            totalElements = result.totalElements,
            totalPages = result.totalPages,
            page = page,
            size = size,
        )
    }
}
