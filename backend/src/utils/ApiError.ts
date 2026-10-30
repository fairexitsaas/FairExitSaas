export class ApiError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly errors?: unknown[]

  constructor(
    statusCode: number,
    message: string,
    errors?: unknown[],
    isOperational: boolean = true,
    stack: string = ''
  ) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.errors = errors

    if (stack) {
      this.stack = stack
    } else {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  static badRequest(message = 'Bad request', errors?: unknown[]): ApiError {
    return new ApiError(400, message, errors)
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message)
  }

  static forbidden(message = 'Forbidden: insufficient permissions'): ApiError {
    return new ApiError(403, message)
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message)
  }

  static conflict(message = 'Conflict: resource already exists'): ApiError {
    return new ApiError(409, message)
  }

  static unprocessable(message = 'Unprocessable entity', errors?: unknown[]): ApiError {
    return new ApiError(422, message, errors)
  }

  static tooManyRequests(message = 'Too many requests, please try again later'): ApiError {
    return new ApiError(429, message)
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, undefined, false)
  }
}

