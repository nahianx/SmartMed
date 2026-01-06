# SmartMed Technical Documentation

**Version:** 1.0  
**Last Updated:** January 6, 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Structure](#2-project-structure)
3. [API Reference](#3-api-reference)
4. [Database Schema](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Real-Time Features](#6-real-time-features)
7. [Services & Business Logic](#7-services--business-logic)
8. [Configuration](#8-configuration)
9. [Development Guidelines](#9-development-guidelines)
10. [Testing](#10-testing)
11. [Deployment](#11-deployment)

---

## 1. Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Next.js Web   │  │   Mobile App    │  │   Admin Panel   │ │
│  │   (apps/web)    │  │   (Future)      │  │                 │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼────────────────────┼────────────────────┼──────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                      ┌──────────▼──────────┐
                      │    API Gateway      │
                      │    (Express.js)     │
                      │    (apps/api)       │
                      └──────────┬──────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼───────┐    ┌───────────▼───────────┐   ┌───────▼───────┐
│   PostgreSQL  │    │      Redis            │   │     AWS S3    │
│   (Primary)   │    │   (Queue/Cache)       │   │   (Storage)   │
└───────────────┘    └───────────────────────┘   └───────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, React, TypeScript | Web application |
| **UI Framework** | Tailwind CSS, shadcn/ui | Styling & components |
| **Backend** | Express.js, TypeScript | REST API & WebSocket |
| **Database** | PostgreSQL | Primary data store |
| **ORM** | Prisma | Database access |
| **Cache/Queue** | BullMQ (Redis) | Background jobs |
| **Auth** | JWT, bcrypt, TOTP | Authentication |
| **File Storage** | AWS S3 | Document storage |
| **Email** | Resend | Transactional email |
| **Build** | Turborepo | Monorepo management |

### Monorepo Structure

```
SmartMed/
├── apps/
│   ├── api/          # Express.js backend API
│   └── web/          # Next.js frontend
├── packages/
│   ├── config/       # Shared configuration
│   ├── database/     # Prisma schema & client
│   ├── types/        # Shared TypeScript types
│   └── ui/           # Shared UI components
├── docs/             # Documentation
├── postman/          # API collection for testing
└── turbo.json        # Turborepo configuration
```

---

## 2. Project Structure

### API Application (`apps/api`)

```
apps/api/
├── src/
│   ├── index.ts              # Application entry point
│   ├── config/
│   │   ├── env.ts            # Environment configuration
│   │   └── prisma.ts         # Prisma client setup
│   ├── controllers/          # Request handlers
│   ├── middleware/
│   │   ├── auth.middleware.ts     # JWT authentication
│   │   ├── authorize.ts           # Role-based authorization
│   │   └── validate.ts            # Request validation
│   ├── routes/
│   │   ├── auth.routes.ts         # Authentication endpoints
│   │   ├── appointments/          # Appointment management
│   │   ├── drugs/                 # Drug information
│   │   └── ...                    # Other route modules
│   ├── services/
│   │   ├── audit.service.ts       # HIPAA audit logging
│   │   ├── email.service.ts       # Email notifications
│   │   ├── permission.service.ts  # Authorization logic
│   │   └── ...                    # Other services
│   ├── jobs/                 # Background jobs (BullMQ)
│   ├── utils/                # Helper functions
│   └── types/                # TypeScript types
├── tests/                    # Integration tests
├── public/                   # Static files
├── package.json
└── tsconfig.json
```

### Web Application (`apps/web`)

```
apps/web/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── (auth)/           # Auth-related pages
│   │   ├── (dashboard)/      # Dashboard pages
│   │   ├── api/              # API routes (if any)
│   │   └── layout.tsx        # Root layout
│   ├── components/
│   │   ├── ui/               # Base UI components
│   │   ├── forms/            # Form components
│   │   └── features/         # Feature-specific components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities & config
│   ├── services/             # API service clients
│   └── types/                # TypeScript types
├── public/                   # Static assets
├── tests/                    # Test files
├── next.config.js
├── tailwind.config.js
└── package.json
```

### Database Package (`packages/database`)

```
packages/database/
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Migration history
├── src/
│   └── index.ts              # Prisma client export
├── scripts/
│   ├── seed.ts               # Database seeding
│   └── reset.ts              # Database reset
└── package.json
```

---

## 3. API Reference

### Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:4000/api` |
| Production | `https://api.smartmed.com/api` |

### Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register/doctor` | Register new doctor | No |
| POST | `/auth/register/patient` | Register new patient | No |
| POST | `/auth/login` | Login with email/password | No |
| POST | `/auth/google` | OAuth with Google | No |
| POST | `/auth/refresh` | Refresh access token | Cookie |
| POST | `/auth/logout` | Logout user | Yes |
| POST | `/auth/password-reset/request` | Request password reset | No |
| POST | `/auth/password-reset/complete` | Complete password reset | No |
| POST | `/auth/verify-email/:token` | Verify email | No |
| GET | `/auth/me` | Get current user | Yes |

### MFA Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/mfa/status` | Get MFA status | Yes |
| POST | `/mfa/setup` | Start MFA setup | Yes |
| POST | `/mfa/verify` | Verify MFA code | Yes |
| POST | `/mfa/disable` | Disable MFA | Yes |
| POST | `/mfa/recovery` | Generate recovery codes | Yes |

### Appointment Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/appointments` | List appointments | Yes |
| POST | `/appointments` | Create appointment | Yes |
| GET | `/appointments/:id` | Get appointment details | Yes |
| PATCH | `/appointments/:id` | Update appointment | Yes |
| DELETE | `/appointments/:id` | Cancel appointment | Yes |
| POST | `/appointments/:id/accept` | Accept appointment (Doctor) | Doctor |
| POST | `/appointments/:id/reject` | Reject appointment (Doctor) | Doctor |
| POST | `/appointments/:id/complete` | Complete appointment | Doctor |

### Patient Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/patients/me` | Get patient profile | Patient |
| PATCH | `/patients/me` | Update patient profile | Patient |
| GET | `/patients/me/medical-history` | Get medical history | Patient |
| PATCH | `/patients/me/medical-history` | Update medical history | Patient |
| GET | `/patients/me/allergies` | Get allergies | Patient |
| POST | `/patients/me/allergies` | Add allergy | Patient |

### Doctor Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/doctors` | Search doctors | Yes |
| GET | `/doctors/:id` | Get doctor profile | Yes |
| GET | `/doctors/:id/availability` | Get availability | Yes |
| PATCH | `/doctors/me` | Update doctor profile | Doctor |
| PATCH | `/doctors/me/settings` | Update settings | Doctor |

### Prescription Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/prescriptions` | List prescriptions | Yes |
| POST | `/prescriptions` | Create prescription | Doctor |
| GET | `/prescriptions/:id` | Get prescription | Yes |
| POST | `/prescriptions/:id/share` | Generate share token | Yes |
| GET | `/prescriptions/shared/:token` | Access shared prescription | No |
| DELETE | `/prescriptions/:id` | Delete prescription | Doctor |

### Queue Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/queue/walk-in` | Add walk-in patient | Staff |
| POST | `/queue/check-in` | Check-in appointment | Staff |
| GET | `/queue/doctor/:id` | Get doctor's queue | Yes |
| GET | `/queue/patient/:id` | Get patient's queue | Yes |
| POST | `/queue/doctor/:id/call` | Call next patient | Doctor |
| POST | `/queue/:id/complete` | Complete consultation | Doctor |
| DELETE | `/queue/:id` | Leave queue | Patient |

### Notification Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications` | List notifications | Yes |
| PATCH | `/notifications/:id/read` | Mark as read | Yes |
| POST | `/notifications/read-all` | Mark all as read | Yes |
| DELETE | `/notifications/:id` | Delete notification | Yes |
| GET | `/notification-preferences` | Get preferences | Yes |
| PATCH | `/notification-preferences` | Update preferences | Yes |

### Drug Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/drugs/search` | Search drugs | Yes |
| GET | `/drugs/:rxcui` | Get drug details | Yes |
| POST | `/drugs/interactions` | Check interactions | Yes |

### Report Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/reports` | List reports | Yes |
| POST | `/reports` | Upload report | Yes |
| GET | `/reports/:id` | Get report | Yes |
| DELETE | `/reports/:id` | Delete report | Yes |

### Health Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | API health check | No |
| GET | `/health/tips` | Get health tips | Yes |

---

## 4. Database Schema

### Core Models

#### User
```prisma
model User {
  id             String     @id @default(uuid())
  email          String     @unique
  passwordHash   String?
  fullName       String
  role           UserRole
  emailVerified  Boolean    @default(false)
  isActive       Boolean    @default(true)
  avatar         String?
  mfaEnabled     Boolean    @default(false)
  mfaSecret      String?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  
  patient        Patient?
  doctor         Doctor?
  notifications  Notification[]
  auditLogs      AuditLog[]
}

enum UserRole {
  ADMIN
  DOCTOR
  PATIENT
  NURSE
}
```

#### Patient
```prisma
model Patient {
  id             String     @id @default(uuid())
  userId         String     @unique
  dateOfBirth    DateTime?
  gender         Gender?
  phone          String?
  address        String?
  medicalHistory String?
  emergencyContact Json?
  insuranceInfo  Json?
  
  user           User       @relation(fields: [userId], references: [id])
  appointments   Appointment[]
  prescriptions  Prescription[]
  allergies      PatientAllergy[]
}
```

#### Doctor
```prisma
model Doctor {
  id             String     @id @default(uuid())
  userId         String     @unique
  specialization String[]
  qualifications String[]
  yearsExperience Int?
  bio            String?
  consultationFee Decimal?
  availability   Json?
  
  user           User       @relation(fields: [userId], references: [id])
  appointments   Appointment[]
  prescriptions  Prescription[]
  queueStatus    DoctorStatus?
}
```

#### Appointment
```prisma
model Appointment {
  id             String     @id @default(uuid())
  patientId      String
  doctorId       String
  scheduledAt    DateTime
  duration       Int        @default(30)
  status         AppointmentStatus
  type           AppointmentType
  notes          String?
  cancelReason   String?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  
  patient        Patient    @relation(fields: [patientId], references: [id])
  doctor         Doctor     @relation(fields: [doctorId], references: [id])
  queueEntry     QueueEntry?
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}
```

#### Prescription
```prisma
model Prescription {
  id             String     @id @default(uuid())
  patientId      String
  doctorId       String
  diagnosis      String?
  medications    Json
  instructions   String?
  validUntil     DateTime?
  createdAt      DateTime   @default(now())
  
  patient        Patient    @relation(fields: [patientId], references: [id])
  doctor         Doctor     @relation(fields: [doctorId], references: [id])
  accessTokens   PrescriptionAccessToken[]
}
```

### Queue System Models

```prisma
model DoctorStatus {
  id             String     @id @default(uuid())
  doctorId       String     @unique
  status         DoctorStatusType @default(OFFLINE)
  currentPatient String?
  avgConsultTime Int        @default(15)
  updatedAt      DateTime   @updatedAt
  
  doctor         Doctor     @relation(fields: [doctorId], references: [id])
}

model QueueEntry {
  id             String     @id @default(uuid())
  patientId      String
  doctorId       String
  appointmentId  String?    @unique
  position       Int
  status         QueueStatus
  serialNumber   String
  queueType      QueueType
  priority       Int        @default(0)
  checkInTime    DateTime   @default(now())
  calledAt       DateTime?
  completedAt    DateTime?
  estimatedWait  Int?
  notes          String?
}
```

### Audit Model

```prisma
model AuditLog {
  id             String     @id @default(uuid())
  userId         String?
  action         AuditAction
  resourceType   String
  resourceId     String?
  details        Json?
  ipAddress      String?
  userAgent      String?
  timestamp      DateTime   @default(now())
  retentionDate  DateTime
}
```

### Key Relationships

```
User 1:1 Patient | Doctor
Patient 1:N Appointments
Doctor 1:N Appointments
Patient 1:N Prescriptions
Doctor 1:N Prescriptions
Appointment 1:1 QueueEntry
Doctor 1:1 DoctorStatus
```

---

## 5. Authentication & Authorization

### JWT Token Structure

**Access Token (15 minutes)**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "PATIENT",
  "iat": 1704556800,
  "exp": 1704557700
}
```

**Refresh Token (7 days)**
- Stored in HTTP-only cookie
- Rotated on each refresh
- Revoked on logout

### Authentication Flow

```
┌──────────┐        ┌──────────┐        ┌──────────┐
│  Client  │        │   API    │        │    DB    │
└────┬─────┘        └────┬─────┘        └────┬─────┘
     │  POST /login      │                   │
     │──────────────────>│                   │
     │                   │ Verify Credentials│
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │ Generate Tokens   │
     │<──────────────────│                   │
     │ {accessToken} +   │                   │
     │ Set-Cookie:refresh│                   │
     │                   │                   │
     │  GET /protected   │                   │
     │  Authorization:   │                   │
     │  Bearer <token>   │                   │
     │──────────────────>│                   │
     │                   │ Validate JWT      │
     │<──────────────────│                   │
     │   Response        │                   │
```

### Role-Based Authorization

```typescript
// Middleware usage
router.get('/admin-only', 
  authenticate,
  authorize('ADMIN'),
  handler
);

router.get('/doctors-only',
  authenticate,
  authorize(['DOCTOR', 'ADMIN']),
  handler
);
```

### Permission Service

```typescript
// Granular permissions
const canAccess = await permissionService.checkAccess({
  userId: req.user.id,
  resource: 'prescription',
  resourceId: prescriptionId,
  action: 'read'
});
```

### MFA Implementation

1. **Setup Flow**
   - Generate TOTP secret
   - Display QR code
   - Verify initial code
   - Store encrypted secret

2. **Verification**
   - User enters 6-digit code
   - Validate against TOTP
   - 30-second time window
   - Rate limited attempts

3. **Recovery**
   - 8 backup codes generated
   - Each code single-use
   - Stored hashed

---

## 6. Real-Time Features

### Socket.IO Implementation

```typescript
// Server setup
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL },
});

io.use(authenticateSocket);

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  socket.join(`user:${userId}`);
  
  socket.on('queue:join', handleQueueJoin);
  socket.on('queue:leave', handleQueueLeave);
});
```

### Events

**Queue Events**
| Event | Direction | Payload |
|-------|-----------|---------|
| `queue:join` | Client → Server | `{ doctorId }` |
| `queue:updated` | Server → Client | `{ queue, doctorStatus }` |
| `queue:patient_called` | Server → Client | `{ queueEntry }` |

**Notification Events**
| Event | Direction | Payload |
|-------|-----------|---------|
| `notification:new` | Server → Client | `{ notification }` |
| `notification:read` | Client → Server | `{ notificationId }` |

### Rooms Strategy

```
user:{userId}     - Personal notifications
doctor:{doctorId} - Doctor's queue subscribers
queue:{doctorId}  - Queue updates for a doctor
```

---

## 7. Services & Business Logic

### Audit Service

```typescript
// Usage
await auditService.log({
  userId: user.id,
  action: AuditAction.VIEW_PRESCRIPTION,
  resourceType: 'Prescription',
  resourceId: prescription.id,
  details: { reason: 'Patient requested access' },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

### Email Service

```typescript
// Send appointment confirmation
await emailService.sendAppointmentConfirmation({
  to: patient.email,
  appointment: {
    date: appointment.scheduledAt,
    doctorName: doctor.fullName,
    location: 'SmartMed Clinic'
  }
});
```

### Permission Service

```typescript
// Check resource access
const hasAccess = await permissionService.canAccessResource(
  userId,
  'prescription',
  prescriptionId,
  'read'
);
```

### Queue Service

```typescript
// Add to queue
const entry = await queueService.addToQueue({
  patientId,
  doctorId,
  queueType: 'WALK_IN',
  priority: 0
});

// Call next patient
const next = await queueService.callNext(doctorId);
```

---

## 8. Configuration

### Environment Variables

```bash
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/smartmed

# Authentication
JWT_SECRET=your-256-bit-secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
MFA_ENCRYPTION_KEY=32-byte-hex-key

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email
RESEND_API_KEY=re_xxxxx

# Storage
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=smartmed-files
AWS_REGION=us-east-1

# Redis (for queues)
REDIS_URL=redis://localhost:6379

# Frontend
FRONTEND_URL=http://localhost:3000
```

### Configuration Validation

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  // ... more validations
});

export const env = envSchema.parse(process.env);
```

---

## 9. Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow ESLint configuration
- Use Prettier for formatting
- Prefer functional programming patterns

### Git Workflow

```bash
# Feature branch
git checkout -b feature/TASK-123-description

# Commit message format
git commit -m "feat(scope): description"
git commit -m "fix(auth): resolve token refresh issue"

# PR process
# 1. Create PR against main
# 2. Ensure tests pass
# 3. Request review
# 4. Squash merge
```

### API Design Principles

1. **RESTful conventions**
   - GET for reads
   - POST for creates
   - PATCH for updates
   - DELETE for deletes

2. **Response format**
   ```json
   {
     "data": {},
     "message": "Success",
     "pagination": {
       "page": 1,
       "limit": 20,
       "total": 100
     }
   }
   ```

3. **Error format**
   ```json
   {
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Invalid input",
       "details": [...]
     }
   }
   ```

### Adding New Routes

1. Create route file in `routes/`
2. Define endpoints with validation
3. Add authorization middleware
4. Register in `index.ts`
5. Add audit logging for PHI access
6. Write tests

---

## 10. Testing

### Test Structure

```
tests/
├── unit/           # Unit tests
├── integration/    # API integration tests
├── e2e/            # End-to-end tests (Playwright)
└── fixtures/       # Test data
```

### Running Tests

```bash
# All tests
npm test

# API tests only
npm test --workspace=apps/api

# Web tests only
npm test --workspace=apps/web

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Writing Tests

```typescript
// Example API test
describe('POST /api/auth/login', () => {
  it('should return tokens for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();
  });
});
```

---

## 11. Deployment

### Build Process

```bash
# Build all packages
npm run build

# Build specific workspace
npm run build --workspace=apps/api
npm run build --workspace=apps/web
```

### Docker Deployment

```dockerfile
# Dockerfile for API
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY dist ./dist
EXPOSE 4000

CMD ["node", "dist/index.js"]
```

### Environment Setup

See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) for detailed deployment instructions.

### Monitoring

- Health endpoint: `GET /api/health`
- Logging: Structured JSON logs
- Metrics: Response times, error rates
- Alerts: Critical error notifications

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | January 6, 2026 | Initial technical documentation | Development Team |
