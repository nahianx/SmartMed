# SmartMed API

Express.js REST API backend for the SmartMed Healthcare Management System.

## Features

- RESTful API endpoints
- JWT authentication
- PostgreSQL database with Prisma ORM
- Request validation with Zod
- Error handling middleware
- CORS enabled
- Security headers with Helmet

## Tech Stack

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT for authentication
- Bcrypt for password hashing

## Development

```bash
# Install dependencies (from root)
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

The API will be available at http://localhost:1080

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
PORT=1080
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/smartmed"
JWT_SECRET="your-secret-key-change-in-production"
```

## API Endpoints

### Health Check

- `GET /health` - Check API status

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Patients

- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get patient by ID
- `POST /api/patients` - Create new patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Doctors

- `GET /api/doctors` - Get all doctors
- `GET /api/doctors/:id` - Get doctor by ID
- `POST /api/doctors` - Create new doctor

### Appointments

- `GET /api/appointments` - Get all appointments
- `GET /api/appointments/:id` - Get appointment by ID
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

## Project Structure

```
src/
├── routes/              # API route handlers
│   ├── auth.routes.ts
│   ├── patient.routes.ts
│   ├── doctor.routes.ts
│   └── appointment.routes.ts
└── index.ts            # Main application entry point
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Tests

- `npm run test` - Run Jest tests for this API
- From the monorepo root: `npm run test --workspace @smartmed/api`
