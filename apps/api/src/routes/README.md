# API Routes Documentation

This document describes the organization and structure of API route files in the SmartMed backend.

## Route Organization Pattern

Routes are organized following these principles:

1. **Single Responsibility**: Each route file handles routes for a specific domain/feature
2. **File Size Limit**: Route files should stay under 500 lines
3. **Subdirectories for Complex Features**: Features with many routes are split into subdirectories with multiple sub-routers

## Directory Structure

```
routes/
├── README.md                          # This file
├── admin.routes.ts                    # Admin operations
├── auth.routes.ts                     # Authentication (login, register)
├── calendar.routes.ts                 # Calendar integration (ICS, Google)
├── consultation.routes.ts             # Doctor consultation context
├── dashboard.routes.ts                # Dashboard data endpoints
├── doctor.routes.ts                   # Doctor profile & search
├── healthTips.routes.ts               # Health tips management
├── mfa.routes.ts                      # Multi-factor authentication
├── notification.routes.ts             # Notification CRUD
├── notification-preferences.routes.ts # Notification settings
├── patient.routes.ts                  # Patient profile management
├── prescription.routes.ts             # Prescription management
├── profile.routes.ts                  # User profile settings
├── public.routes.ts                   # Public endpoints (no auth)
├── push.routes.ts                     # Push notification registration
├── queue.routes.ts                    # Appointment queue management
├── report.routes.ts                   # Medical reports
├── timeline.routes.ts                 # Activity timeline
│
├── appointments/                      # Appointment feature (refactored)
│   ├── index.ts                       # Main router, mounts sub-routers
│   ├── shared.ts                      # Shared utilities & types
│   ├── booking.routes.ts              # Create & validate appointments
│   ├── management.routes.ts           # Accept, reject, complete, cancel
│   └── query.routes.ts                # Search, list, get by ID
│
└── drugs/                             # Drug feature (refactored)
    ├── index.ts                       # Main router, mounts sub-routers
    ├── search.routes.ts               # Drug search & lookup
    ├── interaction.routes.ts          # Drug interaction checking
    └── allergy.routes.ts              # Patient allergy management
```

## Refactoring Pattern

When a route file exceeds 500 lines, follow this pattern to split it:

### 1. Create a Subdirectory

```bash
mkdir routes/feature-name
```

### 2. Extract Shared Utilities

Create `shared.ts` for types, constants, and helper functions used across sub-routers:

```typescript
// routes/feature-name/shared.ts
export type DbClient = PrismaClient | Prisma.TransactionClient

export const COMMON_CONSTANT = [...] 

export async function sharedHelper(db: DbClient, ...args) {
  // Implementation
}
```

### 3. Create Logically Grouped Sub-Routers

Group routes by operation type or sub-feature:

```typescript
// routes/feature-name/crud.routes.ts
import { Router } from 'express'
import { sharedHelper } from './shared'

const router = Router()

router.get('/', ...)
router.post('/', ...)
router.put('/:id', ...)
router.delete('/:id', ...)

export default router
```

### 4. Create Index File

The index file mounts all sub-routers and exports the combined router:

```typescript
// routes/feature-name/index.ts
import { Router } from 'express'
import crudRoutes from './crud.routes'
import searchRoutes from './search.routes'

const router = Router()

// Mount sub-routers (order matters for path matching!)
// More specific paths first, catch-all patterns last
router.use('/search', searchRoutes)
router.use('/', crudRoutes)

export default router

// Export sub-routers for testing
export { crudRoutes, searchRoutes }
```

### 5. Update Main App

Update `src/index.ts` to import from the new subdirectory:

```typescript
// Before
import featureRoutes from './routes/feature.routes'

// After
import featureRoutes from './routes/feature-name'  // imports index.ts
```

## Route Naming Conventions

| Pattern | Example | Description |
|---------|---------|-------------|
| `{resource}.routes.ts` | `patient.routes.ts` | Simple routes for a resource |
| `{action}.routes.ts` | `booking.routes.ts` | Routes grouped by action |
| `{sub-feature}.routes.ts` | `interaction.routes.ts` | Routes for a sub-feature |

## Best Practices

### DO ✅

- Keep route files under 500 lines
- Group related routes together
- Use middleware for common operations
- Include JSDoc comments for complex endpoints
- Export sub-routers for testing

### DON'T ❌

- Change endpoint paths during refactoring
- Mix unrelated routes in one file
- Put business logic in route handlers (use services)
- Forget to update main router imports

## Adding New Routes

1. **New simple feature**: Create `routes/feature.routes.ts`
2. **New sub-feature of existing domain**: Add to existing subdirectory
3. **New complex feature**: Create subdirectory with multiple sub-routers

## Testing Refactored Routes

After refactoring, verify:

1. All endpoints respond with same status codes
2. Request/response bodies are unchanged
3. Middleware chain executes in same order
4. Authentication/authorization still works
5. Rate limiting still applies

Run full test suite:

```bash
cd apps/api
npm test
```

## Common Issues

### Path Matching Order

Sub-routers are matched in order. Specific paths must come before catch-all patterns:

```typescript
// ✅ Correct
router.use('/search', searchRoutes)  // /appointments/search
router.use('/', crudRoutes)          // /appointments/:id

// ❌ Wrong - /search would match :id in crud routes
router.use('/', crudRoutes)
router.use('/search', searchRoutes)
```

### Middleware Application

Middleware applied to the main router affects all sub-routers:

```typescript
// In index.ts - applies to ALL sub-routes
router.use(authenticate)

// In sub-router - applies only to that sub-router's routes
router.use(specificMiddleware)
```

### Import Paths

When importing from parent directory in sub-routers:

```typescript
// Sub-router importing from parent
import { AuthenticatedRequest } from '../../types/auth'
import { validateSchema } from '../../middleware/validation'
```
