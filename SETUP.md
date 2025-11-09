# SmartMed Monorepo - Quick Setup Guide

## Step-by-Step Installation

### 1. Install Dependencies

From the root directory:

```bash
npm install
```

This will install all dependencies for all packages and apps.

### 2. Set Up Environment Variables

#### API Environment

```bash
cd apps/api
cp .env.example .env
```

Edit `apps/api/.env`:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/smartmed"
JWT_SECRET="your-super-secret-jwt-key-change-this"
```

#### Web Environment

```bash
cd apps/web
echo "API_URL=http://localhost:4000" > .env.local
```

### 3. Set Up Database

Make sure PostgreSQL is running, then:

```bash
cd packages/database

# Generate Prisma Client
npm run db:generate

# Push schema to database (development)
npm run db:push

# OR create migrations (recommended for production)
npm run db:migrate
```

### 4. Start Development

From the root directory:

```bash
npm run dev
```

This will start:

- ✅ Web app on http://localhost:3000
- ✅ API server on http://localhost:4000

## Verify Installation

1. **Check API Health:**
   Open http://localhost:4000/health in your browser

2. **Check Web App:**
   Open http://localhost:3000 in your browser

3. **Check Database:**
   ```bash
   cd packages/database
   npm run db:studio
   ```
   Opens Prisma Studio at http://localhost:5555

## Common Commands

```bash
# Development
npm run dev           # Start all apps in dev mode

# Building
npm run build         # Build all apps

# Code Quality
npm run lint          # Lint all packages
npm run format        # Format code with Prettier
npm run typecheck     # Run TypeScript checks

# Database
cd packages/database
npm run db:generate   # Generate Prisma Client
npm run db:push       # Push schema changes
npm run db:migrate    # Create migrations
npm run db:studio     # Open Prisma Studio

# Cleaning
npm run clean         # Remove all build artifacts and node_modules
```

## Troubleshooting

### Port Already in Use

If ports 3000 or 4000 are in use:

1. For API, change PORT in `apps/api/.env`
2. For Web, change in `apps/web/package.json` dev script: `next dev -p 3001`

### Database Connection Issues

- Ensure PostgreSQL is running
- Verify DATABASE_URL in `apps/api/.env`
- Check database credentials

### TypeScript Errors

```bash
# Regenerate types
cd packages/database
npm run db:generate

# Clean and reinstall
npm run clean
npm install
```

### Module Not Found Errors

```bash
# From root
npm install
cd packages/database
npm run db:generate
```

## Next Steps

1. **Customize the Schema**: Edit `packages/database/prisma/schema.prisma`
2. **Add Components**: Create UI components in `packages/ui/src/components/`
3. **Implement Features**: Add routes and pages to `apps/web/` and `apps/api/`
4. **Add Tests**: Set up Jest or Vitest for testing
5. **Deploy**: Set up CI/CD for production deployment

## Project Structure Overview

```
SmartMed/
├── apps/
│   ├── web/              # Next.js frontend (port 3000)
│   └── api/              # Express backend (port 4000)
├── packages/
│   ├── ui/               # Shared React components
│   ├── database/         # Prisma schema & client
│   ├── types/            # TypeScript types
│   └── config/           # Shared config
├── package.json          # Root workspace config
├── turbo.json           # Turborepo config
└── tsconfig.json        # Base TypeScript config
```

## Development Workflow

1. **Make changes** to any app or package
2. **Hot reload** automatically updates in browser
3. **Shared packages** are automatically recompiled
4. **Type checking** happens in real-time
5. **Commit** your changes with meaningful messages

## Need Help?

- Check individual README.md files in each package/app
- Review the main README.md for detailed documentation
- Check Turbo docs: https://turbo.build/repo/docs
- Check Next.js docs: https://nextjs.org/docs
- Check Prisma docs: https://www.prisma.io/docs

Happy coding! 🚀
