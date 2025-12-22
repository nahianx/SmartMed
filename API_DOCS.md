# SmartMed Authentication API Documentation

## Overview
Complete API documentation for the SmartMed dual-path authentication system supporting both doctor and patient registration flows with OAuth integration.

## Base URL

- Local development API: `http://localhost:4000/api`
- Production API: `https://api.smartmed.com/api`

## Authentication Overview

SmartMed uses a secure token-based authentication system:
- **Access tokens**: Short-lived JWT (15 minutes) for API requests
- **Refresh tokens**: Long-lived secure tokens (7 days) in HTTP-only cookies
- **OAuth integration**: Google Sign-In with account linking
- **Role-based access**: Doctor and Patient specific endpoints
- **Security features**: Rate limiting, CSRF protection, token rotation

---

## Queue Management (Real-time)

### REST Endpoints

- `POST /api/queue/walk-in`
  - Body: `{ doctorId, patientId, priority? }`
  - Roles: `DOCTOR`, `NURSE`, `ADMIN`
- `POST /api/queue/check-in`
  - Body: `{ appointmentId }`
  - Roles: `DOCTOR`, `NURSE`, `ADMIN`
- `GET /api/queue/doctor/:doctorId`
  - Returns: `{ doctorStatus, queue }`
  - Roles: authenticated users
- `GET /api/queue/patient/:patientId`
  - Returns: `{ activeQueues }`
  - Roles: patient (self) or staff
- `PATCH /api/queue/:queueId/status`
  - Body: `{ status: "CANCELLED" | "NO_SHOW" }`
  - Roles: `DOCTOR`, `NURSE`, `ADMIN`
- `PATCH /api/queue/:queueId/position`
  - Body: `{ newPosition }`
  - Roles: `DOCTOR`, `NURSE`, `ADMIN`
- `POST /api/queue/doctor/:doctorId/call`
  - Calls next waiting patient
  - Roles: `DOCTOR`, `NURSE`, `ADMIN`
- `POST /api/queue/:queueId/complete`
  - Body: `{ notes? }`
  - Roles: `DOCTOR`
- `DELETE /api/queue/:queueId`
  - Cancels queue entry (patient self-service)
  - Roles: authenticated users

### Socket.IO

Connect with the JWT access token:
```json
{
  "auth": { "token": "<access_token>" }
}
```

**Client → Server**
- `queue:join` `{ doctorId }` (joins doctor queue room)
- `queue:leave` `{ doctorId }`
- `queue:add_walkin` `{ doctorId, patientId, priority? }`
- `queue:check_in` `{ appointmentId }`
- `queue:call_next` `{ doctorId }`
- `queue:complete` `{ queueId, notes? }`
- `queue:update_position` `{ queueId, newPosition }`
- `queue:entry_status_changed` `{ queueId, status }`

**Server → Client**
- `queue:updated` `{ doctorStatus, queue }`
- `queue:entry_updated` `{ id, status, position, estimatedWaitTime, serialNumber, queueType }`
- `queue:patient_called` `{ ...queueEntry }`
- `doctor:status_changed` `{ ...doctorStatus }`
- `notify:patient` `{ message, queueEntryId, doctorId }`

---

## Registration

### POST `/api/auth/register/doctor`
Register a new doctor.

**Body**
```json
{
  "fullName": "Dr Jane Doe",
  "email": "doctor@example.com",
  "password": "Aa1!strong"
}
```

**Responses**
- `201 Created`
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "doctor@example.com",
      "fullName": "Dr Jane Doe",
      "role": "DOCTOR",
      "emailVerified": false
    },
    "accessToken": "<jwt>"
  }
  ```
- `400 Bad Request` – validation error or duplicate email.

### POST `/api/auth/register/patient`
Same as doctor registration but with `role = PATIENT`.

---

## Login

### POST `/api/auth/login`
Login with email/password.

**Body**
```json
{
  "email": "user@example.com",
  "password": "Aa1!strong"
}
```

**Responses**
- `200 OK` – returns `user` and `accessToken`; sets refresh cookie.
- `400 Bad Request` – invalid credentials or inactive account.

### POST `/api/auth/google`
Google OAuth login/registration.

**Body**
```json
{
  "idToken": "<google-id-token>",
  "role": "DOCTOR" | "PATIENT" // optional, for new accounts
}
```

**Responses**
- `200 OK` – returns `user` and `accessToken`; sets refresh cookie.
- `400 Bad Request` – missing/invalid token.

---

## Tokens & Sessions

### POST `/api/auth/refresh`
Refresh access token using the refresh cookie.

**Body** (optional if cookie present)
```json
{
  "refreshToken": "<token>"
}
```

**Responses**
- `200 OK` – `{ "accessToken": "<jwt>" }` and rotated refresh cookie.
- `401 Unauthorized` – missing/invalid refresh token.

### POST `/api/auth/logout`
Logout and revoke refresh token.

**Responses**
- `200 OK` – `{ "success": true }`, refresh cookie cleared.

---

## Password Reset

### POST `/api/auth/password-reset/request`
Request a password reset link.

**Body**
```json
{ "email": "user@example.com" }
```

**Responses**
- `200 OK` – always generic (does not reveal if email exists).

### POST `/api/auth/password-reset/verify/:token`
Verify a reset token.

- `200 OK` – `{ "valid": true }` if token is valid.
- `400 Bad Request` – invalid or expired token.

### POST `/api/auth/password-reset/complete`
Complete password reset.

**Body**
```json
{
  "token": "<reset-token>",
  "newPassword": "Aa1!strong"
}
```

**Responses**
- `200 OK` – `{ "success": true }`; all existing sessions revoked.
- `400 Bad Request` – invalid/expired token or weak password.

---

## Email Verification

### POST `/api/auth/verify-email/:token`
Verify a user email.

**Responses**
- `200 OK` – `{ "user": { ... , "emailVerified": true } }`.
- `400 Bad Request` – invalid or expired token.

---

## User Management

### GET `/api/auth/me`
Get profile of the currently authenticated user.

- Requires `Authorization: Bearer <accessToken>`.

**Responses**
- `200 OK` – user profile.
- `401 Unauthorized` – missing/invalid token.

### GET `/api/auth/check-email`
Check if an email exists (for client-side validation).

**Query**
- `email` – string

**Responses**
- `200 OK` – `{ "exists": true | false }`.

### POST `/api/auth/change-password`
Change password for authenticated user.

**Body**
```json
{
  "currentPassword": "OldPass1!",
  "newPassword": "NewPass1!"
}
```

- Requires `Authorization: Bearer <accessToken>`.

**Responses**
- `200 OK` – `{ "success": true }`.
- `400 Bad Request` – incorrect current password or weak new password.

---

## Dashboards

### GET `/api/dashboard/doctor`
Doctor dashboard data.

- Requires doctor access token (`role = DOCTOR`).

### GET `/api/dashboard/patient`
Patient dashboard data.

- Requires patient access token (`role = PATIENT`).
