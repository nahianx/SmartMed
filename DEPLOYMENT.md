# SmartMed Deployment Guide

## 1. Prerequisites

- Node.js 18+
- PostgreSQL database
- Google Cloud project with OAuth credentials
- Email service provider (e.g., SendGrid, SES, etc.)

## 2. Environment Configuration

1. Copy `.env.example` to `.env` at the repo root (and to any hosting-specific env system).
2. Fill in:
   - `DATABASE_URL`
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
   - `EMAIL_SERVICE_API_KEY`, `EMAIL_FROM`
   - `FRONTEND_URL`, `API_URL`
   - `SESSION_SECRET`, `RATE_LIMIT_*`.

## 3. Database Setup

From the repo root:

```bash
cd packages/database
npx prisma migrate deploy
npx prisma generate
```

Ensure the database is reachable via `DATABASE_URL` from your hosting environment.

## 4. Building and Running Services

### API (`apps/api`)

```bash
cd apps/api
npm install
npm run build
npm start  # starts compiled server on PORT (default 4000)
```

### Web (`apps/web`)

```bash
cd apps/web
npm install
npm run build
npm start  # Next.js production server on 3000 by default
```

Configure reverse proxy (e.g., Nginx) or hosting provider to expose:
- Frontend at `https://your-domain` (port 3000 internal).
- API at `https://api.your-domain` (port 4000 internal) or behind the same domain under `/api`.

## 5. HTTPS & Security

- Terminate TLS at your proxy/load balancer.
- Ensure `NODE_ENV=production` and cookies are sent with `secure: true`.
- Confirm CORS settings allow your frontend origin (`FRONTEND_URL`).

## 6. Running Tests

### Backend

```bash
cd apps/api
npm test
```

### Frontend

```bash
cd apps/web
npm test
```

## 7. Logging & Monitoring

- Capture stdout/stderr logs from API and Web processes.
- Monitor:
  - Auth failures and rate limiting events.
  - Database connection health.
  - Error rates on `/api/auth/*` and `/api/dashboard/*`.
