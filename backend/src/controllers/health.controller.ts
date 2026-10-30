import { Request, Response } from 'express'
import { ApiResponse } from '../utils/ApiResponse'
import { checkSupabaseHealth } from '../config/supabase'
import { env } from '../config/env'

export class HealthController {
  getHealth = (_req: Request, res: Response) => {
    return ApiResponse.ok(
      res,
      {
        status: 'UP',
        service: 'FairExit Backend API',
        environment: env.NODE_ENV,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      'Backend is healthy'
    )
  }

  getReadiness = async (_req: Request, res: Response) => {
    const supabaseHealth = await checkSupabaseHealth()

    const isReady = supabaseHealth.healthy
    const statusCode = isReady ? 200 : 503

    return ApiResponse.send({
      res,
      statusCode,
      message: isReady ? 'Service is ready' : 'Service is degraded',
      data: {
        status: isReady ? 'READY' : 'DEGRADED',
        checks: {
          database: {
            status: supabaseHealth.healthy ? 'CONNECTED' : 'UNREACHABLE',
            latencyMs: supabaseHealth.latencyMs,
            ...(supabaseHealth.error ? { error: supabaseHealth.error } : {}),
          },
        },
        timestamp: new Date().toISOString(),
      },
    })
  }
}

export const healthController = new HealthController()

