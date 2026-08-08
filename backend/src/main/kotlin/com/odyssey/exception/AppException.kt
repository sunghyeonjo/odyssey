

package com.odyssey.exception

import org.springframework.http.HttpStatus

sealed class AppException(message: String, val status: HttpStatus) : RuntimeException(message)

class NotFoundException(message: String) : AppException(message, HttpStatus.NOT_FOUND)
class ForbiddenException(message: String) : AppException(message, HttpStatus.FORBIDDEN)
class UnauthorizedException(message: String) : AppException(message, HttpStatus.UNAUTHORIZED)
class ConflictException(message: String) : AppException(message, HttpStatus.CONFLICT)
class BadRequestException(message: String) : AppException(message, HttpStatus.BAD_REQUEST)
class RateLimitException(message: String) : AppException(message, HttpStatus.TOO_MANY_REQUESTS)
