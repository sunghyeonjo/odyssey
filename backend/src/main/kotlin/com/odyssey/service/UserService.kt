package com.odyssey.service

import com.odyssey.dto.PageResponse
import com.odyssey.dto.UserSearchResponse
import com.odyssey.exception.NotFoundException
import com.odyssey.repository.RefreshTokenRepository
import com.odyssey.repository.UserRepository
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class UserService(
    private val userRepository: UserRepository,
    private val refreshTokenRepository: RefreshTokenRepository,
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

    /**
     * 계정 삭제 — **앱 안에서 스스로 지울 수 있어야 한다**(App Store 5.1.1(v)).
     *
     * 남은 세션도 같이 끊는다. 계정 행이 사라져도 refresh token 이 남으면
     * 그 토큰으로 갱신을 시도하다 엉뚱한 오류를 만난다.
     *
     * 기록·친구 관계 등 딸린 데이터는 각 도메인이 생기는 대로 여기서 함께 지운다.
     */
    @Transactional
    fun deleteAccount(userId: Long) {
        val user = userRepository.findById(userId)
            .orElseThrow { NotFoundException("계정을 찾을 수 없습니다") }
        refreshTokenRepository.deleteByUserId(userId)
        userRepository.delete(user)
    }
}
