# FairExit Backend API

Scalable, production-ready REST API backend for FairExit built with **Node.js, Express.js, TypeScript, and Supabase**.

---

## 1. Architecture Overview

- **Platform Independent:** Serves web (Next.js), iOS (Swift), Android (Kotlin), and future API consumers.
- **Authentication:** Supabase Auth (Email/Password, Google OAuth, Sign in with Apple, native ID token exchange).
- **Database:** Supabase PostgreSQL with Row Level Security (RLS) policies.
- **Validation:** Strict runtime validation using Zod.
- **Error Handling:** Centralized Express error handler returning consistent RFC-compliant JSON responses with correlation IDs (`X-Request-Id`).
- **Security:** Helmet HTTP headers, CORS origin allowlisting, rate limiting, and parameter sanitization.

---

## 2. Folder Structure

```
backend/
├── src/
│   ├── config/             # Environment, Supabase client, and CORS configuration
│   │   ├── env.ts
│   │   ├── supabase.ts
│   │   └── cors.ts
│   ├── routes/             # Express API route declarations
│   │   ├── index.ts        # Main router (/api/v1)
│   │   ├── auth.routes.ts  # /api/v1/auth
│   │   ├── user.routes.ts  # /api/v1/user
│   │   └── health.routes.ts# /api/v1/health
│   ├── controllers/        # Request handling and HTTP status mapping
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   └── health.controller.ts
│   ├── services/           # Supabase SDK business logic & operations
│   │   ├── auth.service.ts
│   │   └── user.service.ts
│   ├── middleware/         # Express middlewares
│   │   ├── authenticate.ts # Bearer token verification with Supabase
│   │   ├── authorize.ts    # Role-based authorization
│   │   ├── validate.ts     # Zod schema validation
│   │   ├── rateLimiter.ts  # Rate limiting per IP
│   │   ├── notFound.ts     # 404 handler
│   │   ├── errorHandler.ts # Centralized error handler
│   │   └── requestLogger.ts# Request correlation & logging
│   ├── validators/         # Zod validation schemas
│   │   ├── auth.validator.ts
│   │   └── user.validator.ts
│   ├── utils/              # Helper utilities
│   │   ├── ApiError.ts
│   │   ├── ApiResponse.ts
│   │   ├── asyncHandler.ts
│   │   └── logger.ts
│   ├── types/              # Express request typings
│   │   └── express.d.ts
│   ├── app.ts              # Express app definition (export for testing)
│   └── server.ts           # Server entrypoint with graceful shutdown
├── tests/
│   ├── unit/               # Unit tests (validators, error classes)
│   └── integration/        # HTTP API tests (Supertest + Vitest)
├── sql/
│   └── 001_create_profiles.sql # PostgreSQL schema & RLS policies
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. Environment Variables

Store your environment variables in `backend/.env`.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | HTTP port for backend | `5000` |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` |
| `FRONTEND_URL` | Canonical frontend web URL | `http://localhost:3000` |
| `CORS_ORIGINS` | Comma-separated list of allowed web origins | `http://localhost:3000,http://127.0.0.1:3000` |
| `SUPABASE_URL` | Supabase Project URL | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon/publishable API key | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret key (optional for server-only jobs) | `eyJhbGci...` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms (default: 15 min) | `900000` |
| `RATE_LIMIT_MAX` | Max general requests per window | `100` |
| `AUTH_RATE_LIMIT_MAX` | Max auth requests per window | `20` |

---

## 4. Setup & Running

### Installation
```bash
cd backend
npm install
```

### Running Locally (Development with hot reload)
```bash
npm run dev
```

### Running Tests
```bash
npm run test
```

### Building for Production
```bash
npm run build
npm start
```

---

## 5. Database Setup (Supabase PostgreSQL)

Execute the script located in `backend/sql/001_create_profiles.sql` in your Supabase SQL Editor:
- Creates `public.profiles` table with foreign key to `auth.users(id)`.
- Enables Row Level Security (RLS).
- Adds policies allowing authenticated users to read and update only their own profile.
- Adds trigger `on_auth_user_created` to automatically create a profile record upon signup.

---

## 6. Authentication & Client Integration

All protected endpoints require the HTTP header:
```http
Authorization: Bearer <access_token>
```

### Client Flow:
1. **Web (Next.js):**
   - User signs in with `POST /api/v1/auth/login` or via Supabase OAuth flow.
   - Client stores `accessToken` and `refreshToken`.
   - Sends `Authorization: Bearer <accessToken>` to FairExit backend endpoints.
2. **Mobile (iOS / Android):**
   - For Google / Apple Sign In: The native mobile app calls native SDKs to obtain the `id_token`.
   - The mobile app sends `POST /api/v1/auth/oauth/google/native` or `POST /api/v1/auth/oauth/apple/native` with `{ "idToken": "..." }`.
   - The backend exchanges it with Supabase and returns the session tokens.

---

## 7. API Reference (`/api/v1`)

### Response Format Standards

#### Success Response:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success message",
  "data": { ... },
  "meta": { ... }
}
```

#### Error Response:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ],
  "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "timestamp": "2026-10-30T12:00:00.000Z"
}
```

---

### Endpoints

#### Health & Readiness
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | None | Basic server uptime, node environment, timestamp |
| `GET` | `/api/v1/health/ready` | None | Deep health check (verifies Supabase connectivity without secrets) |

#### Authentication (`/api/v1/auth`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | None | Register with email, password, and metadata |
| `POST` | `/api/v1/auth/login` | None | Authenticate with email & password |
| `POST` | `/api/v1/auth/refresh-token` | None | Refresh tokens using `refreshToken` |
| `GET` | `/api/v1/auth/oauth/google` | None | Generate Google OAuth sign-in URL |
| `GET` | `/api/v1/auth/oauth/apple` | None | Generate Apple OAuth sign-in URL |
| `POST` | `/api/v1/auth/oauth/google/native` | None | Exchange native Google `idToken` (iOS/Android) |
| `POST` | `/api/v1/auth/oauth/apple/native` | None | Exchange native Apple `idToken` (iOS) |
| `POST` | `/api/v1/auth/oauth/callback` | None | Exchange OAuth code for session tokens (Web & Mobile deep link) |
| `POST` | `/api/v1/auth/verify-email` | None | Verify email token or OTP code |
| `POST` | `/api/v1/auth/resend-verification` | None | Resend verification email |
| `POST` | `/api/v1/auth/forgot-password` | None | Send password recovery email |
| `POST` | `/api/v1/auth/logout` | `Bearer` | Invalidate current user session |
| `GET` | `/api/v1/auth/me` | `Bearer` | Get authenticated user info & auth metadata |
| `PUT` | `/api/v1/auth/update-password` | `Bearer` | Change current user password |

#### User Profile (`/api/v1/user`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/user/profile` | `Bearer` | Get full user profile from PostgreSQL & auth |
| `PUT` | `/api/v1/user/profile` | `Bearer` | Update user profile (name, phone, country, preferences) |
| `PUT` | `/api/v1/user/email` | `Bearer` | Request email change with verification |

---

## 8. Provider Setup (Google & Apple)

### Google OAuth
1. Go to **Google Cloud Console** > **APIs & Services** > **Credentials**.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Set Authorized redirect URIs:
   `https://<your-supabase-project-id>.supabase.co/auth/v1/callback`
4. In **Supabase Dashboard** > **Authentication** > **Providers** > **Google**:
   - Enable Google.
   - Enter `Client ID` and `Client Secret`.
5. For native mobile:
   - Add iOS / Android Client IDs in Google Cloud Console.

### Sign in with Apple
1. Go to **Apple Developer Portal** > **Certificates, Identifiers & Profiles**.
2. Register an **App ID** with `Sign in with Apple` capability.
3. Register a **Services ID** for Web / API verification.
4. Add Return URL:
   `https://<your-supabase-project-id>.supabase.co/auth/v1/callback`
5. Create a Private Key for Apple Sign In (`.p8` file).
6. In **Supabase Dashboard** > **Authentication** > **Providers** > **Apple**:
   - Enable Apple.
   - Enter `Service ID`, `Team ID`, `Key ID`, and the `.p8` private key.

