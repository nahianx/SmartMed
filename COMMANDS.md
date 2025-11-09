# SmartMed - Quick Reference Commands

## 🚀 Getting Started

```bash
# Install all dependencies
npm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
echo "API_URL=http://localhost:4000" > apps/web/.env.local

# Generate Prisma client and set up database
cd packages/database
npm run db:generate
npm run db:push
cd ../..

# Start development
npm run dev
```

## 📦 Package Management

```bash
# Install a dependency in a specific app/package
npm install <package-name> -w apps/web
npm install <package-name> -w apps/api
npm install <package-name> -w packages/ui

# Install a dev dependency
npm install -D <package-name> -w apps/web

# Install a dependency in all workspaces
npm install <package-name> --workspaces
```

## 🔧 Development Commands

```bash
# Start all apps in development mode
npm run dev

# Start only the web app
npm run dev --workspace=apps/web

# Start only the API
npm run dev --workspace=apps/api

# Build all apps
npm run build

# Build specific app
npm run build --workspace=apps/web

# Run tests (when added)
npm run test

# Run linting
npm run lint

# Format all code
npm run format

# Type checking
npm run typecheck
```

## 🗄️ Database Commands

```bash
cd packages/database

# Generate Prisma Client (after schema changes)
npm run db:generate

# Push schema changes to database (development)
npm run db:push

# Create a new migration
npm run db:migrate

# Open Prisma Studio (GUI for database)
npm run db:studio

# Reset database (careful!)
npx prisma migrate reset

# Seed database (after creating seed script)
npx prisma db seed
```

## 🧪 Testing Commands (to be implemented)

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for specific package
npm run test --workspace=apps/api
```

## 🔍 Code Quality

```bash
# Lint all code
npm run lint

# Lint and fix issues
npm run lint -- --fix

# Format all code
npm run format

# Check TypeScript types
npm run typecheck

# Run all quality checks
npm run lint && npm run typecheck
```

## 🧹 Cleaning

```bash
# Clean all build artifacts
npm run clean

# Remove all node_modules (requires reinstall)
rm -rf node_modules apps/*/node_modules packages/*/node_modules

# Clean and reinstall everything
npm run clean
npm install
```

## 📝 Git Commands

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit: SmartMed monorepo setup"

# Create development branch
git checkout -b develop

# Create feature branch
git checkout -b feature/patient-portal

# Add remote and push
git remote add origin <your-repo-url>
git push -u origin main
```

## 🚢 Deployment (to be configured)

```bash
# Build for production
npm run build

# Start production server (after build)
cd apps/web
npm run start

cd apps/api
npm run start

# Environment-specific builds
NODE_ENV=production npm run build
```

## 🔑 Environment Variables

### Development

```bash
# apps/api/.env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/smartmed"
JWT_SECRET="dev-secret-change-in-production"

# apps/web/.env.local
API_URL=http://localhost:4000
```

### Production (example)

```bash
# apps/api/.env.production
PORT=4000
NODE_ENV=production
DATABASE_URL="postgresql://user:password@prod-host:5432/smartmed"
JWT_SECRET="strong-random-secret"

# apps/web/.env.production
API_URL=https://api.smartmed.com
```

## 📊 Monitoring & Debugging

```bash
# Check API health
curl http://localhost:4000/health

# View API logs (when running)
# Logs appear in terminal where npm run dev was run

# Check database connections
cd packages/database
npx prisma studio

# Check Next.js build analysis
cd apps/web
npm run build -- --analyze
```

## 🛠️ Turbo-specific Commands

```bash
# Run a command across all workspaces
npx turbo run build
npx turbo run test
npx turbo run lint

# Run with cache
npx turbo run build --cache-dir=.turbo

# Run without cache
npx turbo run build --force

# Clear Turbo cache
rm -rf .turbo
```

## 📚 Documentation

```bash
# Generate API documentation (when configured)
npm run docs:api

# Generate TypeScript documentation (when configured)
npm run docs:types

# Serve documentation locally
npm run docs:serve
```

## 🔧 Troubleshooting Commands

```bash
# Check Node and npm versions
node --version
npm --version

# Verify workspace setup
npm ls --workspaces

# Check for outdated packages
npm outdated --workspaces

# Update packages
npm update --workspaces

# Fix package-lock.json issues
rm package-lock.json
rm -rf node_modules
npm install

# Regenerate Prisma Client
cd packages/database
rm -rf node_modules/.prisma
npm run db:generate

# Check for port conflicts
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :4000

# Mac/Linux
lsof -i :3000
lsof -i :4000
```

## 📦 Adding New Packages/Apps

```bash
# Create new app
mkdir -p apps/mobile
cd apps/mobile
npm init -y

# Create new package
mkdir -p packages/utils
cd packages/utils
npm init -y

# Update root package.json workspaces if needed
```

## 🎯 Useful Aliases (add to your shell profile)

```bash
# .bashrc or .zshrc
alias sm-dev="npm run dev"
alias sm-build="npm run build"
alias sm-clean="npm run clean"
alias sm-lint="npm run lint"
alias sm-db="cd packages/database && npm run db:studio"
```

## 📱 Quick Navigation

```bash
# Root
cd ~/SmartMed

# Apps
cd apps/web
cd apps/api

# Packages
cd packages/ui
cd packages/database
cd packages/types
cd packages/config
```

## 🆘 Emergency Commands

```bash
# Kill processes on ports (if stuck)
# Windows
npx kill-port 3000 4000

# Mac/Linux
kill -9 $(lsof -t -i:3000)
kill -9 $(lsof -t -i:4000)

# Complete reset
npm run clean
rm -rf node_modules
rm package-lock.json
npm install
cd packages/database
npm run db:generate
cd ../..
npm run dev
```

## 📖 Learn More

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

**Pro Tip**: Save this file as a reference and bookmark commonly used commands!
