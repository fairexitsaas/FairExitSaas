import { Request, Response } from 'express'
import { userService } from '../services/user.service'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'

export class UserController {
  getProfile = async (req: Request, res: Response) => {
    if (!req.user || !req.token) {
      throw ApiError.unauthorized('User not authenticated')
    }
    const profile = await userService.getProfile(req.user, req.token)
    return ApiResponse.ok(res, { profile }, 'User profile retrieved successfully')
  }

  updateProfile = async (req: Request, res: Response) => {
    if (!req.user || !req.token) {
      throw ApiError.unauthorized('User not authenticated')
    }
    const updated = await userService.updateProfile(req.user, req.token, req.body)
    return ApiResponse.ok(res, { profile: updated }, 'User profile updated successfully')
  }

  updateEmail = async (req: Request, res: Response) => {
    if (!req.user || !req.token) {
      throw ApiError.unauthorized('User not authenticated')
    }
    const { email, emailRedirectTo } = req.body
    const result = await userService.updateEmail(req.user, req.token, email, emailRedirectTo)
    return ApiResponse.ok(res, result, 'Email update initiated')
  }
}

export const userController = new UserController()

