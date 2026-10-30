import { Response } from 'express'

export interface ApiResponseOptions<T> {
  res: Response
  statusCode?: number
  message?: string
  data?: T
  meta?: Record<string, unknown>
}

export class ApiResponse {
  static send<T>({
    res,
    statusCode = 200,
    message = 'Success',
    data,
    meta,
  }: ApiResponseOptions<T>) {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      ...(data !== undefined ? { data } : {}),
      ...(meta !== undefined ? { meta } : {}),
    })
  }

  static ok<T>(res: Response, data?: T, message = 'Success', meta?: Record<string, unknown>) {
    return ApiResponse.send({ res, statusCode: 200, message, data, meta })
  }

  static created<T>(
    res: Response,
    data?: T,
    message = 'Resource created successfully',
    meta?: Record<string, unknown>
  ) {
    return ApiResponse.send({ res, statusCode: 201, message, data, meta })
  }

  static noContent(res: Response) {
    return res.status(204).send()
  }
}

