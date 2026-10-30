import { Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'
import { ApiError } from '../utils/ApiError'

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      throw ApiError.unauthorized('Authorization header is missing')
    }

    const [scheme, token] = authHeader.split(' ')

    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized(
        'Invalid authorization header format. Expected "Bearer <token>"'
      )
    }

    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      throw ApiError.unauthorized(
        error?.message || 'Invalid or expired authentication token'
      )
    }

    req.user = data.user
    req.token = token
    next()
  } catch (error) {
    next(error)
  }
}

