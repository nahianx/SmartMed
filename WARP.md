# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Monorepo overview

SmartMed is a TypeScript monorepo managed by Turbo and npm workspaces.

- **Apps**
  - `apps/web` – Next.js 14 (App Router) frontend for patient/doctor/admin portals.
  - `apps/api` – Express.js REST API backend.
- **Packages**
  - `packages/ui` – Shared React UI components (Tailwind-based).
  - `packages/database` – Prisma schema and client, plus DB scripts.
  - `packages/types` – Shared domain types (User/Patient/Doctor/Appointment/Prescription, API response types, etc.).
  - `packages/config` – Shared configuration layer that reads from environment variables.

`tsconfig.json` defines path aliases so code in apps imports shared packages via:
- `@smartmed/ui`, `@smartmed/database`, `@smartmed/types`, `@smartmed/config`

## Tooling & environment

- **Node**: `>= 18.0.0`
- **npm**: `>= 9.0.0` (monorepo uses npm workspaces)
- **Database**: PostgreSQL (connection via `DATABASE_URL`).
- **Monorepo orchestration**: `turbo` with a pipeline for `dev`, `build`, `test`, `lint`, `typecheck`, `clean`.

Before running anything, install dependencies at the root:

```bash
npm install
```

## Root-level commands (monorepo)

These scripts live in the root `package.json` and are the primary entry points:

- **Develop (all apps)**
  - Starts web and API together with Turbo:

    ```bash
    npm run dev
    ```

- **Build (all apps)**

  ```bash
  npm run build
  ```

- **Lint (all workspaces that define `lint`)**

  ```bash
  npm run lint
  ```

- **Typecheck (all workspaces that define `typecheck`)**

  ```bash
  npm run typecheck
  ```

- **Format (Prettier across repo)**

  ```bash
  npm run format
  ```

- **Clean (Turbo clean + remove `node_modules`)**

  ```bash
  npm run clean
  ```

- **Test (monorepo)**

  ```bash
  npm run test
  ```

  This runs `test` in each workspace that defines it (currently the web and API apps) using Jest.

## Per-app and per-package commands

Use npm workspaces to run scripts for a single app/package from the repo root.

### Web app (`apps/web` / `@smartmed/web`)

- **Dev server (Next.js)**

  ```bash
  npm run dev --workspace @smartmed/web
  ```

- **Build**

  ```bash
  npm run build --workspace @smartmed/web
  ```

- **Start (production)**

  ```bash
  npm run start --workspace @smartmed/web
  ```

- **Lint**

  ```bash
  npm run lint --workspace @smartmed/web
  ```

- **Typecheck**

  ```bash
  npm run typecheck --workspace @smartmed/web
  ```

### API (`apps/api` / `@smartmed/api`)

- **Dev server (Express + tsx watcher)**

  ```bash
  npm run dev --workspace @smartmed/api
  ```

- **Build**

  ```bash
  npm run build --workspace @smartmed/api
  ```

- **Start (production)**

  ```bash
  npm run start --workspace @smartmed/api
  ```

- **Lint**

  ```bash
  npm run lint --workspace @smartmed/api
  ```

- **Typecheck**

  ```bash
  npm run typecheck --workspace @smartmed/api
  ```

### Shared packages

From the repo root, you can target each package with `--workspace`:

- **Config (`packages/config` / `@smartmed/config`)**

  ```bash
  npm run lint --workspace @smartmed/config
  npm run typecheck --workspace @smartmed/config
  ```

- **Types (`packages/types` / `@smartmed/types`)**

  ```bash
  npm run lint --workspace @smartmed/types
  npm run typecheck --workspace @smartmed/types
  ```

- **UI (`packages/ui` / `@smartmed/ui`)**

  ```bash
  npm run lint --workspace @smartmed/ui
  npm run typecheck --workspace @smartmed/ui
  ```

## Database & Prisma workflows

The Prisma schema and client live in `packages/database`.

You can either `cd` into the package or use workspaces.

- **Using npm workspaces (from repo root)**

  ```bash
  npm run db:generate --workspace @smartmed/database
  npm run db:push --workspace @smartmed/database
  npm run db:migrate --workspace @smartmed/database
  npm run db:studio --workspace @smartmed/database
  ```

- **Alternate (aligns with root README)**

  ```bash
  cd packages/database
  npx prisma generate
  npx prisma db push
  ```

Prisma scripts are defined in `packages/database/package.json` and correspond to:

- `db:generate` – `prisma generate`
- `db:push` – `prisma db push`
- `db:migrate` – `prisma migrate dev`
- `db:studio` – `prisma studio`

## Environment configuration

Environment variables are split by app:

- **API (`apps/api/.env`)**
  - Example variables (see `README.md`):
    - `PORT`
    - `NODE_ENV`
    - `DATABASE_URL`
    - `JWT_SECRET`
- **Web (`apps/web/.env.local`)**
  - Primary variable:
    - `API_URL` (defaults to `http://localhost:4000` in docs).

The Turbo config (`turbo.json`) marks `.env.*local` files as global dependencies so changes to envs will invalidate caches as expected.

## Testing and running a single test

Jest is configured as the test framework for the web and API apps, as well as the shared `config`, `types`, and `ui` packages.

- **Monorepo test run**
  - From the repo root:

    ```bash
    npm run test
    ```

    This executes Jest in any workspace that defines a `test` script (currently `@smartmed/web`, `@smartmed/api`, `@smartmed/config`, `@smartmed/types`, and `@smartmed/ui`).

- **Web app tests (`@smartmed/web`)**
  - Run all web tests:

    ```bash
    npm run test --workspace @smartmed/web
    ```

  - Run a single test file (example):

    ```bash
    npm run test --workspace @smartmed/web -- src/app/page.test.tsx
    ```

- **API tests (`@smartmed/api`)**
  - Run all API tests:

    ```bash
    npm run test --workspace @smartmed/api
    ```

  - Run a single test file (example):

    ```bash
    npm run test --workspace @smartmed/api -- src/health.test.ts
    ```

- **Shared package tests**
  - Config package:

    ```bash
    npm run test --workspace @smartmed/config
    ```

  - Types package:

    ```bash
    npm run test --workspace @smartmed/types
    ```

  - UI package:

    ```bash
    npm run test --workspace @smartmed/ui
    ```

Jest runs in `jsdom` environment for the web app and UI package (with React Testing Library) and in `node` environment for the API, config, and types packages. Future workspaces can adopt Jest by adding their own `test` script and Jest config.

## Architectural notes

- **Frontend ↔ Backend interaction**
  - `apps/web` calls the API via `API_URL` and uses shared domain types from `@smartmed/types` and UI components from `@smartmed/ui`.
- **Backend layering**
  - `apps/api` uses:
    - `@smartmed/database` for all Prisma data access.
    - `@smartmed/types` for DTOs and domain models.
    - `@smartmed/config` for configuration.
  - This keeps HTTP handlers, domain logic, and persistence separated and reusable.
- **Domain model centralization**
  - Core domain entities (User, Patient, Doctor, Appointment, Prescription, etc.) are defined consistently at the Prisma level (`packages/database`) and exposed as TypeScript types via `packages/types`, ensuring the web and API stay in sync.
- **Shared configuration and flags**
  - `packages/config` centralizes things like API URL, feature flags (appointments, prescriptions, notifications, video calls), and pagination settings, so feature toggles should live there rather than per-app.

## Other tooling/rules

- There is currently **no** `CLAUDE.md`, `.cursorrules`, `.cursor/rules`, or Copilot instruction file in this repo; WARP.md and the primary `README.md` are the main sources of AI/tooling guidance.
