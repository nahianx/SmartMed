# SmartMed Security Overview

## Passwords

- All passwords are hashed server-side using `bcryptjs` with at least 12 salt rounds.
- Plaintext passwords are never stored or logged.
- Password changes and resets invalidate all existing sessions for that user.

## Tokens

- **Access tokens**
  - JWT signed with `JWT_SECRET`.
  - 15-minute expiration.
  - Contains `sub` (user id), `email`, and `role` only.
  - Sent in `Authorization: Bearer <token>` header.
- **Refresh tokens**
  - 7-day lifetime.
  - Stored as random strings created with `crypto.randomBytes`.
  - Persisted in `user_sessions` table with device info and IP.
  - Sent/stored in `httpOnly`, `secure`, `sameSite=strict` cookies.
  - Rotated on each `/api/auth/refresh` call; old refresh token is replaced.

## Session Management

- Each refresh token is tied to a `UserSession` record.
- Logout deletes the corresponding session.
- Password reset and password change revoke all user sessions.

## OAuth (Google)

- Frontend uses Google Identity Services to obtain an ID token.
- Backend verifies the ID token with Google using `google-auth-library`.
- If user exists by `googleId` or email, accounts are linked.
- New users created with `authProvider=GOOGLE` and `emailVerified=true` (if Google reports verified).

## Rate Limiting

- In-memory rate limiter middleware protects critical endpoints:
  - `/api/auth/login`
  - `/api/auth/register/*`
  - `/api/auth/password-reset/request`
  - `/api/auth/google`
- Defaults: 5 attempts per 15 minutes for registration/login/reset; 10 for Google.

## CSRF

- Access tokens are sent in headers, not cookies.
- Refresh tokens are cookie-based and only used on auth endpoints.
- CSRF risk is reduced by:
  - Using `sameSite=strict` on refresh cookies.
  - Requiring explicit client calls for refresh/logout.

## Input Validation & Sanitization

- All auth bodies are validated using Zod schemas and custom validators.
- Email, name, and password formats are strictly validated.
- Prisma ORM is used for DB access, preventing SQL injection via parameterization.

## Headers & Transport

- `helmet` is used to set common security headers.
- In production, the app must be served over HTTPS.

## Logging

- Authentication errors and unexpected exceptions are logged on the server.
- Sensitive values (passwords, tokens) are never logged.

## OWASP Considerations

- Enforced strong passwords and hashing.
- No sensitive data stored in JWT payload besides id/email/role.
- Generic error messages for password reset/email verification requests (no user enumeration).
- Rate limiting to mitigate brute force and credential stuffing.
