# SmartMed Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         SMARTMED SYSTEM                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            apps/web (Next.js 14)                         │  │
│  │  - Patient Portal                                        │  │
│  │  - Doctor Portal                                         │  │
│  │  - Admin Dashboard                                       │  │
│  │  Port: 3000                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          apps/api (Express.js + TypeScript)              │  │
│  │                                                          │  │
│  │  Routes:                                                 │  │
│  │  ├── /api/auth        (Authentication)                  │  │
│  │  ├── /api/patients    (Patient Management)              │  │
│  │  ├── /api/doctors     (Doctor Management)               │  │
│  │  ├── /api/appointments (Appointments)                   │  │
│  │  └── /api/prescriptions (Prescriptions)                 │  │
│  │                                                          │  │
│  │  Port: 4000                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Prisma ORM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         packages/database (Prisma + PostgreSQL)          │  │
│  │                                                          │  │
│  │  Tables:                                                 │  │
│  │  ├── users          (Authentication)                    │  │
│  │  ├── patients       (Patient Records)                   │  │
│  │  ├── doctors        (Doctor Profiles)                   │  │
│  │  ├── appointments   (Scheduling)                        │  │
│  │  └── prescriptions  (Medical Records)                   │  │
│  │                                                          │  │
│  │  PostgreSQL Database                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      SHARED PACKAGES LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │  packages/ui   │  │ packages/types │  │ packages/config │  │
│  │                │  │                │  │                 │  │
│  │ - Button       │  │ - User         │  │ - API Config    │  │
│  │ - Card         │  │ - Patient      │  │ - App Config    │  │
│  │ - Input        │  │ - Doctor       │  │ - Features      │  │
│  │ - Modal        │  │ - Appointment  │  │ - Pagination    │  │
│  │                │  │ - Prescription │  │                 │  │
│  └────────────────┘  └────────────────┘  └─────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
SmartMed/
│
├── apps/                       # Application packages
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   └── app/           # App router pages
│   │   ├── public/            # Static assets
│   │   └── package.json
│   │
│   └── api/                    # Express.js backend
│       ├── src/
│       │   ├── routes/        # API endpoints
│       │   └── index.ts       # Server entry
│       └── package.json
│
├── packages/                   # Shared packages
│   ├── ui/                     # React components
│   │   └── src/components/
│   │
│   ├── database/               # Prisma + database
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/index.ts
│   │
│   ├── types/                  # TypeScript types
│   │   └── src/index.ts
│   │
│   └── config/                 # Configuration
│       └── src/index.ts
│
├── package.json                # Root workspace
├── turbo.json                  # Turbo config
├── tsconfig.json              # TS base config
└── README.md                   # Documentation
```

## Data Flow

### User Authentication Flow

```
1. User enters credentials in Web App
   └─> POST /api/auth/login

2. API validates credentials
   └─> Query packages/database
       └─> Check users table

3. API returns JWT token
   └─> Web App stores token

4. Subsequent requests include token
   └─> API validates and processes
```

### Appointment Booking Flow

```
1. Patient selects doctor and time in Web App
   └─> GET /api/doctors (fetch available doctors)

2. Patient confirms appointment
   └─> POST /api/appointments

3. API creates appointment
   └─> packages/database creates record
       └─> appointments table

4. Confirmation sent to patient and doctor
   └─> Web App displays confirmation
```

## Technology Stack

### Frontend (apps/web)

- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Data Fetching**: TanStack Query

### Backend (apps/api)

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JWT
- **Validation**: Zod

### Database (packages/database)

- **ORM**: Prisma
- **Database**: PostgreSQL
- **Migrations**: Prisma Migrate

### Shared Packages

- **UI**: React components with TypeScript
- **Types**: Shared TypeScript interfaces
- **Config**: Environment configuration

### DevOps

- **Monorepo**: Turborepo
- **Package Manager**: npm workspaces
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript

## Key Features

### 1. Patient Management

- Patient registration and profiles
- Medical history tracking
- Appointment booking
- Prescription access

### 2. Doctor Management

- Doctor profiles and specializations
- Availability management
- Patient consultation
- Prescription creation

### 3. Appointment System

- Schedule management
- Booking and cancellation
- Status tracking
- Notifications

### 4. Prescription Management

- Digital prescriptions
- Medication tracking
- Diagnosis records
- Treatment history

## Security Features

- JWT-based authentication
- Password hashing (bcrypt)
- CORS protection
- Helmet security headers
- Environment variable protection
- TypeScript type safety

## Scalability Considerations

- Monorepo architecture for code sharing
- Microservices-ready structure
- Database indexing via Prisma
- Efficient data fetching with React Query
- Server-side rendering with Next.js
- API rate limiting (to be implemented)
- Caching strategies (to be implemented)

## Future Enhancements

- [ ] Video consultation feature
- [ ] Real-time notifications (WebSocket)
- [ ] Mobile app (React Native)
- [ ] Payment integration
- [ ] Report generation
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Email notifications
- [ ] SMS reminders

## Authentication & Authorization Architecture (Overview)

- Frontend (`apps/web`)
  - Next.js 14 app router.
  - Auth pages under `/auth/*` and dashboards under `/dashboard/*`.
  - `AuthContext` manages current user, access token, and redirects.
  - Axios `apiClient` attaches JWT access tokens and sends cookies for refresh.

- Backend (`apps/api`)
  - Express.js with `/api/auth` and `/api/dashboard` routes.
  - `AuthService` handles registration, login, logout, refresh, email verification, and password reset.
  - `OAuthService` + `OAuthController` implement Google Sign-In.
  - `TokenService` issues/rotates access and refresh tokens.
  - Middleware: `authenticate`, `requireRole`, `rateLimiter`, Zod validation, and centralized `errorHandler`.

- Database (`packages/database` with Prisma + PostgreSQL)
  - `User` model extended with:
    - `fullName`, `passwordHash`, `authProvider`, `googleId`, `emailVerified`, `isActive`, `lastLogin`.
  - Additional auth tables:
    - `UserSession` – refresh tokens + device/IP metadata.
    - `PasswordReset` – password reset tokens with expiry and `used` flag.
    - `EmailVerification` – email verification tokens and status.

- Token & Session Flow
  1. User authenticates via email/password or Google.
  2. API returns access token (JWT) and sets refresh token cookie.
  3. Frontend stores access token and uses it in `Authorization` headers.
  4. When access token expires, frontend calls `/api/auth/refresh` to obtain a new one.
  5. Logout and password reset revoke refresh tokens via `UserSession` records.
