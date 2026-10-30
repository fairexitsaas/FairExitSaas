import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/ApiError'

export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User not authenticated'))
    }

    const userRole =
      (req.user.app_metadata?.role as string) ||
      (req.user.user_metadata?.role as string) ||
      'user'

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      return next(
        ApiError.forbidden(
          `Forbidden: Required role [${allowedRoles.join(', ')}], current role is [${userRole}]`
        )
      )
    }

    next()
  }
}

