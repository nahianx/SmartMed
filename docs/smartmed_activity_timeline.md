# SmartMed Activity Timeline

This document describes the architecture, APIs, component structure, configuration, and setup for the **SmartMed Activity Timeline** feature.

## 1. Architecture Overview

### 1.1 High level

- **Frontend**: `apps/web` (Next.js 14, React, Tailwind, React Query)
- **Backend**: `apps/api` (Express + TypeScript)
- **Database**: `packages/database` (Prisma + PostgreSQL)
- **Shared UI**: `packages/ui` (design-system React components)
- **Shared Types**: `packages/types`

The Activity Timeline surfaces a unified stream of:

- Appointments
- Prescriptions
- Reports (uploaded PDFs)

Each is represented by an `Activity` row in the database and rendered as a timeline item.

### 1.2 Data model

Defined in `packages/database/prisma/schema.prisma`:

- `ActivityType` enum: `APPOINTMENT`, `PRESCRIPTION`, `REPORT`
- `NotificationType` enum: `APPOINTMENT_REMINDER_24H`, `APPOINTMENT_REMINDER_1H`, `ACTIVITY_CREATED`, `ACTIVITY_UPDATED`

#### Activity

```prisma
model Activity {
  id             String            @id @default(uuid())
  type           ActivityType
  occurredAt     DateTime
  patientId      String
  doctorId       String?
  appointmentId  String?
  prescriptionId String?
  reportId       String?
  title          String
  subtitle       String?
  tags           String[]
  status         AppointmentStatus?
  notes          String?
  vitals         Json?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  patient      Patient      @relation(fields: [patientId], references: [id])
  doctor       Doctor?      @relation(fields: [doctorId], references: [id])
  appointment  Appointment? @relation(fields: [appointmentId], references: [id])
  prescription Prescription? @relation(fields: [prescriptionId], references: [id])
  report       Report?      @relation(fields: [reportId], references: [id])

  notifications Notification[]

  @@index([patientId, occurredAt(sort: Desc)])
  @@index([doctorId, occurredAt(sort: Desc)])
  @@index([type, occurredAt(sort: Desc)])
  @@map("activities")
}
```

Activities are generated automatically from appointment, prescription, and report events.

#### Report

```prisma
model Report {
  id            String   @id @default(uuid())
  patientId     String
  doctorId      String?
  appointmentId String?
  fileKey       String
  fileName      String
  fileSize      Int
  mimeType      String
  uploadedAt    DateTime @default(now())
  notes         String?

  patient     Patient     @relation(fields: [patientId], references: [id])
  doctor      Doctor?     @relation(fields: [doctorId], references: [id])
  appointment Appointment? @relation(fields: [appointmentId], references: [id])
  activities  Activity[]

  @@map("reports")
}
```

Files are stored in S3-compatible object storage; metadata lives in the `reports` table.

#### Notification

```prisma
model Notification {
  id            String           @id @default(uuid())
  userId        String
  type          NotificationType
  title         String
  body          String?
  activityId    String?
  appointmentId String?
  readAt        DateTime?
  createdAt     DateTime        @default(now())

  user        User        @relation(fields: [userId], references: [id])
  activity    Activity?   @relation(fields: [activityId], references: [id])
  appointment Appointment? @relation(fields: [appointmentId], references: [id])

  @@index([userId, createdAt(sort: Desc)])
  @@unique([userId, appointmentId, type], map: "unique_notification_per_appointment_type")
  @@map("notifications")
}
```

Notifications support in-app reminders and activity updates.

### 1.3 Data flow

1. **Appointments/Prescriptions**
   - When appointments or prescriptions are created/updated (via future controllers), `activity_service` will create/update corresponding `Activity` rows.

2. **Report uploads**
   - Web app calls `POST /api/reports` with a PDF for a given patient (and optional doctor/appointment).
   - API uploads the file to S3 and creates a `Report` row.
   - `createReportActivity` is invoked to create an `Activity` of type `REPORT`.
   - Timeline page refetches `/api/timeline` and displays the new report.

3. **Timeline**
   - Web app calls `GET /api/timeline` with filters.
   - API queries `Activity` with role-based scoping (patient vs doctor) and filter conditions.
   - Response items are mapped to frontend `TimelineActivity` types and rendered.

4. **Notifications & reminders**
   - A scheduler in `apps/api` scans upcoming appointments every 5 minutes.
   - For appointments within 24h and 1h windows, notifications are upserted for patient and doctor.
   - Web app polls `/api/notifications` and displays new notifications in a drawer.

---

## 2. APIs

### 2.1 Timeline

**Route:** `GET /api/timeline`

**Query params:**

- `from` (optional) – ISO date string; lower bound for `occurredAt`.
- `to` (optional) – ISO date string; upper bound for `occurredAt`.
- `types` (optional) – comma-separated list of `appointment,prescription,report`.
- `statuses` (optional) – comma-separated list of `completed,cancelled,no-show`.
- `search` (optional) – text search across title/subtitle/notes.
- `limit` (optional) – max items (default 50, max 100).

**Behavior:**

- Uses `req.user` from the auth stub to scope results:
  - PATIENT → activities where `patientId` matches the current patient.
  - DOCTOR → activities where `doctorId` matches the current doctor.
- Applies date/type/status/search filters in Prisma query.
- Returns items sorted by `occurredAt` desc.

**Response:**

```json
{
  "items": [
    {
      "id": "...",
      "type": "appointment | prescription | report",
      "date": "2025-11-05T10:30:00.000Z",
      "title": "Visit with Dr. ...",
      "subtitle": "Memorial Hospital",
      "tags": ["Follow-up"],
      "status": "completed | cancelled | no-show",
      "doctorName": "Dr. Sarah Chen",
      "specialty": "Cardiology",
      "clinic": null,
      "medications": [
        { "name": "Lisinopril", "dose": "10mg", "frequency": "Once daily", "duration": "90 days" }
      ],
      "fileName": "Blood_Panel_Results.pdf",
      "fileSize": "123456 bytes",
      "notes": "...",
      "vitals": { "bloodPressure": "120/80", ... },
      "linkedReports": [],
      "linkedPrescriptions": []
    }
  ]
}
```

### 2.2 Reports

#### `POST /api/reports`

Upload a PDF report for a patient.

- **Body:** `multipart/form-data`
  - `file` (required) – PDF file (`application/pdf`).
  - `patientId` (required) – ID of `Patient`.
  - `doctorId` (optional) – ID of `Doctor`.
  - `appointmentId` (optional) – ID of `Appointment`.
  - `notes` (optional) – free-text notes.

**Behavior:**

- Validates entities exist.
- Uploads file to S3 using `uploadBufferToS3`.
- Creates `Report` row.
- Creates an `Activity` via `createReportActivity({ reportId })`.

**Response 201:**

```json
{
  "id": "report-id",
  "patientId": "...",
  "doctorId": "...",
  "appointmentId": "...",
  "fileName": "Blood_Panel_Results.pdf",
  "fileSize": 1048576,
  "mimeType": "application/pdf",
  "uploadedAt": "2025-11-05T10:30:00.000Z",
  "notes": "..."
}
```

#### `GET /api/reports/:id`

Returns metadata for a single report.

#### `GET /api/reports/:id/download?disposition=inline|attachment`

Streams the report PDF from S3.

- `disposition=inline` (default) → for in-browser preview.
- `disposition=attachment` → for file download.

### 2.3 Notifications

#### `GET /api/notifications`

Returns notifications for the current user:

```json
{
  "items": [
    {
      "id": "...",
      "userId": "...",
      "type": "APPOINTMENT_REMINDER_24H",
      "title": "Upcoming appointment in 24 hours",
      "body": null,
      "activityId": null,
      "appointmentId": "...",
      "readAt": null,
      "createdAt": "2025-11-04T10:00:00.000Z"
    }
  ]
}
```

#### `POST /api/notifications/:id/read`

Marks a notification as read (`readAt` = now) for the current user.

### 2.4 Current patient

#### `GET /api/patients/me`

Returns the `Patient` profile for the authenticated PATIENT user.

- **Responses:**
  - `200` → `{ patient: Patient }`.
  - `401` → not authenticated.
  - `403` → non-patient role.
  - `404` → no patient profile exists.

Used by the web app to determine `patientId` for report uploads.

---

## 3. Frontend component tree

### 3.1 Timeline page

`apps/web/src/app/timeline/page.tsx`

- `TopAppBar`
  - Upload report button
  - Search field
  - Notifications bell (opens notifications drawer)
- Hidden file input for report uploads
- Layout:
  - Left: `FilterRail` (desktop), mobile menu TBD
  - Main: `Timeline` list
  - Right overlays:
    - `DetailsDrawer`
    - `NotificationsDrawer`

### 3.2 Components

Under `apps/web/src/components/timeline`:

- `top_app_bar.tsx`
  - Props: `onMenuClick`, `showMenuButton`, `onNotificationsClick`, `hasUnreadNotifications`, `onUploadClick`, `uploadDisabled`.
  - Uses `Button`, `Input`, `Avatar` from `@smartmed/ui`.

- `filter_rail.tsx`
  - Props: `filters: FilterState`, `onFiltersChange`.
  - Controls: role (patient/doctor), date range, activity types, statuses, text search.
  - Uses `Button`, `Checkbox`, `Badge`, `Popover`, `Input`.

- `timeline.tsx`
  - Props: `activities: TimelineActivity[]`, `filters: FilterState`, `onOpenDetails`, `isLoading`.
  - Groups activities by date; renders date headers and `TimelineItem`s.
  - Handles loading skeletons and "No activities found" empty state.

- `timeline_item.tsx`
  - Props: `activity: TimelineActivity`, `onOpenDetails`.
  - Shows icon, title, datetime, clinic, tags, status badge, and actions depending on type.

- `details_drawer.tsx`
  - Props: `activity: TimelineActivity | null`, `open`, `onClose`.
  - Uses `Sheet`/`Button`/`Badge` from `@smartmed/ui`.
  - Renders detailed content per activity type (appointment, prescription, report).

Under `apps/web/src/components/notifications`:

- `notifications_drawer.tsx`
  - Props: `open`, `onClose`, `notifications: NotificationItem[]`, `onMarkRead`.
  - Uses `Sheet`, `ScrollArea`, `Button`.

### 3.3 Shared UI components

`packages/ui/src` exports reusable primitives (Button, Input, Badge, Avatar, Checkbox, Sheet, Popover, Separator, Skeleton, ScrollArea, etc.) styled to match the design.

---

## 4. Environment variables & configuration

### 4.1 Backend (`apps/api`)

Required for full functionality:

- `DATABASE_URL` – PostgreSQL connection string (Prisma).
- `PORT` – API port (default 4000).
- `API_URL` – exposed in frontend env for pointing to the API (Next.js).
- `S3_BUCKET_NAME` – bucket name for report storage.
- `AWS_REGION` – AWS region for S3 client.
- `S3_ENDPOINT` (optional) – custom endpoint for MinIO / S3-compatible storage.
- `S3_FORCE_PATH_STYLE` (optional, `true|false`) – path vs virtual host style.

### 4.2 Frontend (`apps/web`)

- `NEXT_PUBLIC_API_URL` – base URL for `apiClient` (defaults to `API_URL` or `http://localhost:4000`).

### 4.3 Auth stub

The API uses `authStub` middleware (`apps/api/src/middleware/auth_stub.ts`) to attach `req.user` by:

- Checking `x-user-email` header, or
- Falling back to the first PATIENT user in the database.

In development and tests, this makes the system usable without full auth.

---

## 5. Setup & run instructions

### 5.1 Install dependencies

From the monorepo root:

```bash
npm install
```

### 5.2 Configure environment

Create `.env` files:

- `packages/database/.env` (if using Prisma defaults) or set `DATABASE_URL` at root.
- `apps/api/.env`:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgres://user:pass@localhost:5432/smartmed
JWT_SECRET=dev-secret
S3_BUCKET_NAME=smartmed-reports
AWS_REGION=us-east-1
```

- `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 5.3 Database migration and seed

```bash
# Run Prisma migrations
npm run db:migrate --workspace @smartmed/database

# Seed initial data (patient, doctor, appointments, prescriptions, reports, activities)
npm run db:seed --workspace @smartmed/database
```

### 5.4 Run API and web apps

In two terminals, or using separate commands:

```bash
# API
npm run dev --workspace @smartmed/api

# Web
npm run dev --workspace @smartmed/web
```

Open `http://localhost:3000/timeline` in a browser.

### 5.5 Using the timeline

- The default auth stub will pick the seeded patient user (from seed script) as the current user.
- `/timeline` will show seeded activities for that patient.
- Filters and search can be used to narrow the timeline.
- Clicking a timeline item opens the details drawer.
- Click the bell icon to open the notifications drawer.
- Click **Upload report** to upload a new PDF for the current patient; the new report will appear in the timeline after upload.

---

## 6. Tests

### 6.1 Jest unit and integration tests

- **API:** `apps/api`
  - `health.test.ts` – health check.
  - `timeline.test.ts` – `/api/timeline` returns items array.
  - `notifications.test.ts` – `/api/notifications` returns notifications array.
  - `patient.me.test.ts` – `/api/patients/me` returns current patient or appropriate status.

- **Web:** `apps/web`
  - `src/app/page.test.tsx` – home page heading.
  - `src/components/timeline/timeline.test.tsx` – timeline rendering and empty state behavior.

Run from root:

```bash
npm run test
```

### 6.2 E2E tests (Playwright)

- Config: `apps/web/playwright.config.ts`
- Tests: `apps/web/tests/e2e/timeline.spec.ts`

From `apps/web`:

```bash
npx playwright install
npm run e2e
```

The E2E test assumes:

- API running on `http://localhost:4000`.
- Web app running on `http://localhost:3000`.
- Database migrated and seeded.

---

## 7. CI

GitHub Actions workflow: `.github/workflows/ci.yml`

- Spins up PostgreSQL service.
- Installs dependencies (`npm ci`).
- Runs Prisma migrate + seed.
- Builds the monorepo (`npm run build`).
- Runs Jest tests (`npm run test`).
- Installs Playwright browsers.
- Starts API and web servers.
- Runs Playwright E2E tests.

---

## 8. Notes & future enhancements

- **Auth**: Replace `authStub` with real JWT authentication and pass tokens from the web app.
- **Doctor view**: Currently, the timeline UI allows toggling between patient/doctor view; backend scoping is still determined by `req.user.role`. Implement real doctor auth to make this toggle reflect actual role.
- **Report preview**: Replace the static PDF preview placeholder in `DetailsDrawer` with a true PDF viewer (e.g. `react-pdf`) using the `/api/reports/:id/download` endpoint.
- **Real-time**: The timeline uses polling; can be upgraded to SSE or WebSockets for push updates.
- **Metrics & logging**: Add more structured logging and metrics around timeline, uploads, and reminders.
