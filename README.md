
  # Dual-Path Authentication System

  This is a code bundle for Dual-Path Authentication System. The original project is available at https://www.figma.com/design/7QsZJG4PfC2aNZQC6tnMlk/Dual-Path-Authentication-System.

## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

## Auth Feature Quickstart

1. Copy `.env.example` to `.env` and fill in at least:
   - `DATABASE_URL`
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`
   - `FRONTEND_URL` (e.g., `http://localhost:3000`)
   - `API_URL` (e.g., `http://localhost:4000`)
2. Apply database migrations and generate Prisma client:
   ```bash
   cd packages/database
   npx prisma migrate dev --name auth_extension
   npx prisma generate
   ```
3. Start the API:
   ```bash
   cd apps/api
   npm install
   npm run dev
   ```
4. Start the frontend:
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```
5. Open the auth entry page in your browser:
   - `http://localhost:3000/auth`
6. Test key flows:
   - Register as doctor: `/auth/register/doctor`
   - Register as patient: `/auth/register/patient`
   - Login: `/auth/login`
   - Forgot password: `/auth/forgot-password`
   - After login, verify you are redirected to the correct dashboard:
     - Doctor → `/dashboard/doctor`
     - Patient → `/dashboard/patient`
  