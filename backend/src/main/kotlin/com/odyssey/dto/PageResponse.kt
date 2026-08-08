package com.odyssey.dto

import java.io.Serializable

data class PageResponse<T>(
    val content: List<T>,
    val totalElements: Long,
    val totalPages: Int,
    val page: Int,
    val size: Int,
) : Serializable {
    companion object {
        private const val serialVersionUID = 1L
    }
}
