/**
 * FairExit Backend API Client
 * Connects Web & Mobile clients to the Express REST backend
 */

export const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export interface BackendUser {
  id: string
  email: string
  emailConfirmed: boolean
  role?: string
  metadata?: Record<string, unknown>
  createdAt?: string
}

export interface BackendSession {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export interface AuthSuccessData {
  user: BackendUser
  session: BackendSession | null
  requiresEmailVerification?: boolean
}

export interface ApiResponse<T> {
  success: boolean
  statusCode: number
  message: string
  data?: T
  errors?: Array<{ field: string; message: string }>
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BACKEND_API_URL}${endpoint}`
  const headers = new Headers(options.headers)

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  let json: ApiResponse<T>
  try {
    json = await response.json()
  } catch {
    throw new Error(`Server returned non-JSON response: ${response.status}`)
  }

  if (!response.ok || !json.success) {
    const errorMsg =
      json.errors && json.errors.length > 0
        ? json.errors.map((e) => e.message).join(', ')
        : json.message || 'Request failed'
    throw new Error(errorMsg)
  }

  return (json.data !== undefined ? json.data : json) as T
}

export const backendAuth = {
  /**
   * Log in user with email and password via backend
   */
  async login(email: string, password: string): Promise<AuthSuccessData> {
    return request<AuthSuccessData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  /**
   * Sign up new user with email, password, and metadata via backend
   */
  async signup(data: {
    email: string
    password: string
    fullName?: string
    phone?: string
    country?: 'CA' | 'US'
    redirectTo?: string
  }): Promise<AuthSuccessData> {
    return request<AuthSuccessData>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Retrieve OAuth provider authorization URL (Google or Apple)
   */
  async getOAuthUrl(
    provider: 'google' | 'apple',
    redirectTo?: string
  ): Promise<{ provider: string; url: string; redirectTo: string }> {
    const query = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''
    return request<{ provider: string; url: string; redirectTo: string }>(
      `/auth/oauth/${provider}${query}`,
      { method: 'GET' }
    )
  },

  /**
   * Exchange OAuth code for session tokens
   */
  async exchangeOAuthCode(code: string): Promise<AuthSuccessData> {
    return request<AuthSuccessData>('/auth/oauth/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  },

  /**
   * Sign out current user session
   */
  async logout(accessToken: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  },

  /**
   * Fetch currently authenticated user
   */
  async getMe(accessToken: string): Promise<{ user: BackendUser }> {
    return request<{ user: BackendUser }>('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  },

  /**
   * Request password reset link
   */
  async forgotPassword(
    email: string,
    redirectTo?: string
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      '/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ email, redirectTo }),
      }
    )
  },

  /**
   * Resend signup verification email
   */
  async resendVerification(
    email: string,
    redirectTo?: string
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      '/auth/resend-verification',
      {
        method: 'POST',
        body: JSON.stringify({ email, redirectTo }),
      }
    )
  },

  /**
   * Fetch user profile from database via backend
   */
  async getProfile(accessToken: string): Promise<{ profile: Record<string, unknown> }> {
    return request<{ profile: Record<string, unknown> }>('/user/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  },

  /**
   * Update user profile via backend
   */
  async updateProfile(
    accessToken: string,
    data: {
      fullName?: string
      avatarUrl?: string
      phone?: string
      country?: 'CA' | 'US'
      preferences?: Record<string, unknown>
    }
  ): Promise<{ profile: Record<string, unknown> }> {
    return request<{ profile: Record<string, unknown> }>('/user/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    })
  },
}

