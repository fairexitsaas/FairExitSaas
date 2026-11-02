import { User } from '@supabase/supabase-js'
import type { CaseRow } from '../fairexit/types'

declare global {
  namespace Express {
    interface Request {
      user?: User
      token?: string
      id?: string
      /** Loaded by the caseAccess middleware */
      caseRow?: CaseRow
      /** How the caller proved access to the case */
      caseAccessVia?: 'token' | 'owner' | 'admin'
      isAdmin?: boolean
      rawBody?: Buffer
    }
  }
}

export {}
