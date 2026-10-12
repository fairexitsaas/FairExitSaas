# Fairexit — Next.js + Supabase Authentication

A complete, clean, and production-ready authentication implementation built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and official **Supabase SSR** (`@supabase/ssr` & `@supabase/supabase-js`).

---

## Features

- **App Router Architecture**: Utilizes Next.js App Router with Server Components and Client Components where appropriate.
- **Supabase SSR**: Implements modern cookie handling with `getAll` and `setAll` via `@supabase/ssr`.
- **Server-Side Route Protection**: Protected routes (`/dashboard`) guarded at both the middleware level and within Server Components using `supabase.auth.getUser()`.
- **Automatic Session Refresh**: Middleware refreshes expired tokens transparently on incoming requests.
- **Complete Auth Flows**:
  - **Sign Up**: Full name (metadata), email, password confirmation, validation, and email verification support.
  - **Login**: Email & password, show/hide password toggle, input validation, and duplicate submission prevention.
  - **Logout**: Session invalidation via `supabase.auth.signOut()` and redirection.
  - **Callback Route**: `/auth/callback` handles PKCE code exchange and guards against open redirects.
- **Modern Minimal UI**: Clean, responsive interface styled with Tailwind CSS with dark mode support.

---

## 1. Prerequisites

Before getting started, make sure you have:

- **Node.js**: v18.17.0 or higher (v20+ recommended).
- **npm**: v9 or higher.
- A **Supabase** account ([supabase.com](https://supabase.com)).

---

## 2. Installation

Clone or navigate to the repository directory, then install the dependencies:

```bash
npm install
```

Installed packages include:
- `next`: Latest stable Next.js framework
- `react` & `react-dom`: React 19
- `tailwindcss`: Utility-first CSS framework
- `@supabase/supabase-js`: Official Supabase JavaScript client
- `@supabase/ssr`: Official Supabase SSR package for Next.js

---

## 3. Creating a Supabase Project

1. Sign in to your dashboard at [database.new](https://database.new) or [supabase.com/dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Choose your organization, enter a **Project Name** (e.g. `fairexit`), set a secure **Database Password**, and select a region close to your users.
4. Click **Create new project** and wait a couple of minutes for provisioning to complete.

---

## 4. Retrieving Your Supabase Credentials

1. Open your project in the Supabase Dashboard.
2. In the left-hand navigation sidebar, click the **Settings** (gear icon) -> **API** (or **Project Settings** -> **API**).
3. Under the **Project API keys** section:
   - **Project URL**: Copy the URL (e.g., `https://xyzcompany.supabase.co`).
   - **anon / public key**: Copy the `anon` `public` key (or newer publishable key format).

> ⚠️ **Important:** Never use the `service_role` secret key in your client-side application or public repository.

---

## 5. Configuring Environment Variables

Create a file named `.env.local` in the root of your project:

```bash
cp .env.example .env.local
```

Open `.env.local` and paste your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Note:** `.env.local` is listed in `.gitignore` to ensure your keys are never committed to version control.

---

## 6. Configuring Supabase Authentication & Redirect URLs

To support email confirmation and authentication callbacks:

1. In your Supabase Dashboard, navigate to **Authentication** -> **URL Configuration**.
2. Set the **Site URL** to:
   - Development: `http://localhost:3000`
   - Production: `https://your-production-domain.com`
3. Under **Redirect URLs**, add the callback URL:
   - `http://localhost:3000/auth/callback`
   - `https://your-production-domain.com/auth/callback`
4. (Optional) Email Confirmation Settings:
   - Go to **Authentication** -> **Providers** -> **Email**.
   - If **Confirm email** is enabled, users will receive a verification email upon signup before they can log in.
   - If disabled during development, users are logged in immediately upon registration.

### Configuring "Continue with Google" OAuth

To enable Google sign-in:

1. **Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
   - Create an **OAuth 2.0 Client ID** (Web application).
   - Under **Authorized redirect URIs**, add your Supabase auth callback URL:
     `https://<your-supabase-project-id>.supabase.co/auth/v1/callback`
   - Copy the generated **Client ID** and **Client Secret**.

2. **Supabase Dashboard**:
   - Go to **Authentication** -> **Providers** -> **Google**.
   - Toggle **Enable Google provider** to ON.
   - Paste your **Client ID** and **Client Secret**.
   - Click **Save**.

3. **Allowed Redirect URLs**:
   - Under **Authentication** -> **URL Configuration** -> **Redirect URLs**, ensure:
     `http://localhost:3000/auth/callback`
     `https://<your-production-domain>/auth/callback`
     are included.

---

## 7. Running the Application Locally

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> Whenever you update `.env.local`, restart the development server (`Ctrl+C` then `npm run dev`) for changes to take effect.

---

## 8. Testing the Authentication Flow

### 1. Test Sign Up (`/signup`)
- Go to `http://localhost:3000/signup`.
- Enter your full name, an email address, and matching passwords (min 6 characters).
- Click **Create Account**.
- If email confirmation is enabled in your Supabase project, check your email inbox for the confirmation link. Clicking the link will route through `/auth/callback` and sign you into the dashboard.
- If email confirmation is disabled, you will be redirected straight to `/dashboard`.

### 2. Test Login (`/login`)
- Navigate to `http://localhost:3000/login`.
- Test the show/hide password toggle.
- Enter valid credentials and click **Sign In** -> You are redirected to `/dashboard`.
- Test invalid credentials to verify clear error messages.

### 3. Test Route Protection
- While logged in, try visiting `http://localhost:3000/login` or `http://localhost:3000/signup`. The middleware will redirect you back to `/dashboard`.
- Log out, and try navigating directly to `http://localhost:3000/dashboard`. Both middleware and server-level checks will redirect you to `/login`.

### 4. Test Log Out
- On `/dashboard`, click the **Log out** button in the top navigation.
- The session cookies are cleared, and you are redirected to `/login`.

---

## 9. Deployment

### Deploying on Vercel

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Import the project into [Vercel](https://vercel.com).
3. In the **Environment Variables** section of the deployment configuration, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy the project.
5. In Supabase Dashboard -> **Authentication** -> **URL Configuration**, add your Vercel deployment URL (e.g. `https://fairexit.vercel.app/auth/callback`) to the **Redirect URLs** list.

---

## Project Structure

```text
fairexit/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root HTML & typography layout
│   │   ├── page.tsx                # Public landing page with auth status
│   │   ├── globals.css             # Tailwind CSS entrypoint
│   │   ├── login/
│   │   │   └── page.tsx            # Login route
│   │   ├── signup/
│   │   │   └── page.tsx            # Signup route
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Protected dashboard (SSR)
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts        # PKCE auth callback handler
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx       # Client login form with validation
│   │   │   ├── SignupForm.tsx      # Client signup form with validation
│   │   │   └── LogoutButton.tsx    # Dashboard sign-out trigger
│   │   └── ui/
│   │       └── Navbar.tsx          # Responsive navigation bar
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts           # Browser client (createBrowserClient)
│   │       ├── server.ts           # Server client (createServerClient + cookies)
│   │       └── middleware.ts       # Middleware session updater & guard
│   └── middleware.ts               # Next.js global edge middleware
├── .env.local                      # Local private environment variables (git-ignored)
├── .env.example                    # Template environment variables
├── .gitignore                      # Git ignore rules
├── package.json
└── README.md
```

---

## Scripts

- `npm run dev` — Start the local development server with Turbopack.
- `npm run build` — Build the application for production.
- `npm run start` — Start the production server.
- `npm run lint` — Run ESLint checks.
