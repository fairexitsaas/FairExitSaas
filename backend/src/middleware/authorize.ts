import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/ApiError'

export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User not authenticated'))
    }

    // Only app_metadata is trusted (users can write their own user_metadata at sign-up).
    // profiles.role is copied into app_metadata.role by the sql/001 trigger.
    const userRole = String(req.user.app_metadata?.role || 'USER').toUpperCase()

    if (allowedRoles.length > 0 && !allowedRoles.map((r) => r.toUpperCase()).includes(userRole)) {
      return next(
        ApiError.forbidden(
          `Forbidden: Required role [${allowedRoles.join(', ')}], current role is [${userRole}]`
        )
      )
    }

    next()
  }
}

