import { Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'
import { db } from '../config/db'
import { ApiError } from '../utils/ApiError'
import { caseService } from '../services/case.service'

/** Verifies a Bearer token if one is sent; never rejects a request without one. */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const h = req.headers.authorization
    if (h && h.startsWith('Bearer ')) {
      const token = h.slice(7)
      const { data } = await supabase.auth.getUser(token)
      if (data?.user) {
        req.user = data.user
        req.token = token
      }
    }
    next()
  } catch (e) {
    next(e)
  }
}

export async function isAdminUser(userId: string, appRole?: unknown): Promise<boolean> {
  if (String(appRole || '').toUpperCase() === 'ADMIN') return true
  const { data } = await db().from('profiles').select('role').eq('id', userId).maybeSingle()
  return data?.role === 'ADMIN'
}

/** Requires a signed-in ADMIN (profiles.role = 'ADMIN' or app_metadata.role = 'ADMIN'). */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized('Sign in as an admin')
    if (!(await isAdminUser(req.user.id, req.user.app_metadata?.role))) throw ApiError.forbidden('Admins only')
    req.isAdmin = true
    next()
  } catch (e) {
    next(e)
  }
}

/**
 * Loads :caseId and checks access. Accepted proofs, in order:
 *   1. X-Case-Token header (or ?t= on GET links such as the PDF in the email)
 *   2. Bearer user who owns the case (after "Save to your account")
 *   3. Bearer admin
 */
export async function caseAccess(req: Request, _res: Response, next: NextFunction) {
  try {
    const c = await caseService.get(req.params.caseId)
    const token = (req.headers['x-case-token'] as string | undefined) || (req.method === 'GET' ? (req.query.t as string | undefined) : undefined)
    if (caseService.hasToken(c, token)) req.caseAccessVia = 'token'
    else if (req.user && c.user_id && req.user.id === c.user_id) req.caseAccessVia = 'owner'
    else if (req.user && (await isAdminUser(req.user.id, req.user.app_metadata?.role))) req.caseAccessVia = 'admin'
    else throw ApiError.notFound('Case not found') // 404, not 403: never confirm a case exists
    req.caseRow = c
    next()
  } catch (e) {
    next(e)
  }
}
