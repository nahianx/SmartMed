# SmartMed - Healthcare Management System

A modern, scalable healthcare management system built with a monorepo architecture using Turbo.

## 📋 Project Overview

SmartMed is a comprehensive healthcare management platform designed to streamline patient care, doctor consultations, and medical record management. The system provides:

- **Patient Management**: Complete patient profiles, medical history, and appointments
- **Doctor Portal**: Schedule management, patient consultations, and prescriptions
- **Appointment System**: Easy booking and management of medical appointments
- **Prescription Management**: Digital prescriptions and medication tracking
- **Admin Dashboard**: System-wide monitoring and configuration

## 🏗️ Architecture

This is a monorepo managed by Turbo, containing:

### Apps

- **`apps/web`**: Next.js frontend application (Patient & Doctor portals)
- **`apps/api`**: Express.js REST API backend

### Packages

- **`packages/ui`**: Shared React component library
- **`packages/database`**: Prisma database schema and client
- **`packages/types`**: Shared TypeScript types and interfaces
- **`packages/config`**: Shared configuration

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL database

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd SmartMed
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

**For API (`apps/api/.env`):**

```bash
cp apps/api/.env.example apps/api/.env
# Edit .env with your database credentials and secrets
```

**For Web (`apps/web/.env.local`):**

```bash
echo "API_URL=http://localhost:1080" > apps/web/.env.local
```

4. Set up the database:

```bash
cd packages/database
npx prisma generate
npx prisma db push
```

### Development

Start all apps in development mode:

```bash
npm run dev
```

This will start:

- Web app: http://localhost:3000
- API server: http://localhost:1080

### Build

Build all apps:

```bash
npm run build
```

### Test

Run tests across all packages:

```bash
npm run test
```

This runs Jest in each workspace that defines a `test` script (currently web, api, config, types, and ui).

### Lint

Lint all packages:

```bash
npm run lint
```

### Format

Format code with Prettier:

```bash
npm run format
```

## 📦 Package Scripts

### Root Level

- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all apps
- `npm run test` - Run all tests
- `npm run lint` - Lint all packages
- `npm run format` - Format all code
- `npm run clean` - Clean all build artifacts

### Web App (`apps/web`)

- `npm run dev` - Start Next.js dev server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Lint the web app

### API (`apps/api`)

- `npm run dev` - Start API in development mode with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run lint` - Lint the API

### Database (`packages/database`)

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio

## 🗄️ Database Schema

The database includes the following main entities:

- **User**: Authentication and authorization
- **Patient**: Patient profiles and medical information
- **Doctor**: Doctor profiles and availability
- **Appointment**: Appointment scheduling and management
- **Prescription**: Medical prescriptions and medications

## 🔧 Technology Stack

### Frontend

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- TanStack Query (React Query)
- Zustand (State Management)

### Backend

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication

### DevOps & Tools

- Turbo (Monorepo management)
- ESLint
- Prettier
- TypeScript

## 📁 Project Structure

```
SmartMed/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   └── app/         # App router pages
│   │   ├── public/          # Static assets
│   │   └── package.json
│   └── api/                 # Express backend
│       ├── src/
│       │   ├── routes/      # API routes
│       │   └── index.ts     # Entry point
│       └── package.json
├── packages/
│   ├── ui/                  # Shared UI components
│   │   └── src/
│   │       └── components/
│   ├── database/            # Prisma schema
│   │   ├── prisma/
│   │   └── src/
│   ├── types/               # Shared TypeScript types
│   │   └── src/
│   └── config/              # Shared configuration
│       └── src/
├── package.json             # Root package.json
├── turbo.json              # Turbo configuration
└── tsconfig.json           # Base TypeScript config
```

## 🔐 Environment Variables

### API (.env)

```
PORT=1080
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/smartmed"
JWT_SECRET="your-secret-key"
```

### Web (.env.local)

```
API_URL=http://localhost:1080
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is part of CSE471 course work (Group 3).

## 👥 Team

- Group 3 - CSE471

## 📞 Support

For support, please contact the development team or open an issue in the repository.
