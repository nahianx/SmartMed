# SmartMed Auth Components

## AuthContext (`apps/web/src/context/AuthContext.tsx`)

Provides global authentication state for the Next.js frontend.

**Props**
- Wraps the entire app in `app/layout.tsx` – no external props.

**Context value**
- `user: { id, email, fullName, role, emailVerified } | null`
- `accessToken: string | null`
- `loading: boolean`
- `login({ email, password, remember })`
- `logout()`
- `setUser(user)`
- `setAccessToken(token)`

## GoogleSignInButton (`apps/web/src/components/auth/GoogleSignInButton.tsx`)

Renders the Google Identity Services button and wires it to the backend.

**Props**
- `role?: "DOCTOR" | "PATIENT"` – optional role hint for new accounts.

**Behavior**
- Loads `https://accounts.google.com/gsi/client`.
- Initializes Google client with `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- On success, calls `authService.googleSignIn(idToken, role)`.
- Saves access token via `tokenManager` and updates `AuthContext`.
- Redirects by role to `/dashboard/doctor` or `/dashboard/patient`.

## Auth Pages

### `/auth` (landing)
- CTA cards for "Sign up as Doctor" and "Sign up as Patient".
- Link to `/auth/login`.

### `/auth/login`
- Email/password form with remember-me and "Forgot password?" link.
- Uses `useAuthContext().login`.
- Renders `<GoogleSignInButton />`.

### `/auth/register/doctor` and `/auth/register/patient`
- Full name, email, password, confirm password, terms checkbox.
- Password strength indicator (`getPasswordStrength`).
- Client-side validation using `validators.ts`.
- Duplicate email check via `authService.checkEmail`.
- `<GoogleSignInButton role="DOCTOR" | "PATIENT" />`.

### `/auth/forgot-password`
- Email-only form calling `authService.requestPasswordReset`.
- Confirmation message after submission.

### `/auth/reset-password/[token]`
- New password and confirm password.
- Calls `authService.completePasswordReset(token, newPassword)`.

### `/auth/verify-email/[token]`
- Calls `authService.verifyEmail(token)` on mount.
- Displays loading, success, or error state with CTA to login.

## Dashboards

### `/dashboard/doctor`
- Uses `useAuthContext` to guard access (`role === 'DOCTOR'`).
- Fetches `/api/dashboard/doctor` via `apiClient`.

### `/dashboard/patient`
- Uses `useAuthContext` to guard access (`role === 'PATIENT'`).
- Fetches `/api/dashboard/patient` via `apiClient`.
