# @smartmed/database

Database package with Prisma schema and client for SmartMed.

## Setup

1. Configure your database URL in `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/smartmed"
```

2. Generate Prisma Client:

```bash
npm run db:generate
```

3. Push schema to database:

```bash
npm run db:push
```

Or create migrations:

```bash
npm run db:migrate
```

## Usage

Import the Prisma client in your application:

```typescript
import { prisma } from '@smartmed/database'

// Query users
const users = await prisma.user.findMany()

// Create a patient
const patient = await prisma.patient.create({
  data: {
    firstName: 'John',
    lastName: 'Doe',
    // ... other fields
  },
})
```

## Schema

The database includes:

- **User**: Authentication and user management
- **Patient**: Patient profiles and medical information
- **Doctor**: Doctor profiles and schedules
- **Appointment**: Appointment scheduling
- **Prescription**: Medical prescriptions

## Available Scripts

- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema to database (development)
- `npm run db:migrate` - Create and run migrations (production)
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Prisma Studio

View and edit your database with Prisma Studio:

```bash
npm run db:studio
```

This will open http://localhost:5555
