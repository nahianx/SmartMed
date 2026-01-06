# SmartMed Database Migration Guide

**Version:** 1.0  
**Last Updated:** January 6, 2026

---

## Overview

This guide covers database migration procedures for SmartMed, including schema migrations, data migrations, and production deployment strategies.

---

## Table of Contents

1. [Prisma Migration Basics](#1-prisma-migration-basics)
2. [Development Workflow](#2-development-workflow)
3. [Production Migration](#3-production-migration)
4. [Rollback Procedures](#4-rollback-procedures)
5. [Data Migration Patterns](#5-data-migration-patterns)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Prisma Migration Basics

### Migration Commands

```bash
# Create a new migration (development)
npx prisma migrate dev --name <migration-name>

# Apply pending migrations (production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Reset database (WARNING: destroys all data)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate
```

### Migration File Structure

```
packages/database/prisma/
├── schema.prisma           # Database schema
└── migrations/
    ├── 20240101000000_init/
    │   └── migration.sql
    ├── 20240115120000_add_mfa/
    │   └── migration.sql
    └── migration_lock.toml
```

### Schema Changes

When modifying `schema.prisma`:

```prisma
// Add a new field
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  lastLoginAt DateTime?  // New optional field
}

// Add a new model
model AuditLog {
  id        String   @id @default(uuid())
  action    String
  timestamp DateTime @default(now())
}

// Add a relation
model Appointment {
  id        String  @id @default(uuid())
  reminder  AppointmentReminder?  // New relation
}

model AppointmentReminder {
  id            String      @id @default(uuid())
  appointmentId String      @unique
  appointment   Appointment @relation(fields: [appointmentId], references: [id])
}
```

---

## 2. Development Workflow

### Creating a Migration

1. **Modify the schema**
   ```prisma
   // packages/database/prisma/schema.prisma
   model User {
     // ... existing fields
     lastLoginAt DateTime?  // Add new field
   }
   ```

2. **Generate migration**
   ```bash
   cd packages/database
   npx prisma migrate dev --name add_last_login
   ```

3. **Review generated SQL**
   ```sql
   -- prisma/migrations/20260106000000_add_last_login/migration.sql
   ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMP(3);
   ```

4. **Test the migration**
   ```bash
   npm run test:database
   ```

5. **Commit changes**
   ```bash
   git add prisma/
   git commit -m "feat(db): add lastLoginAt field to User model"
   ```

### Migration Naming Convention

Use descriptive names following this pattern:

| Type | Example |
|------|---------|
| Add field | `add_last_login_to_users` |
| Add table | `create_audit_logs` |
| Add index | `add_index_appointments_date` |
| Remove field | `remove_deprecated_field` |
| Modify field | `change_status_to_enum` |
| Add relation | `add_doctor_patient_relation` |

---

## 3. Production Migration

### Pre-Migration Checklist

| Step | Status | Notes |
|------|--------|-------|
| Backup database | ☐ | Full backup before migration |
| Review migration SQL | ☐ | Check for destructive operations |
| Test in staging | ☐ | Run migration in staging first |
| Schedule maintenance window | ☐ | If downtime required |
| Notify stakeholders | ☐ | Communicate expected downtime |
| Prepare rollback plan | ☐ | Know how to revert |

### Step-by-Step Production Migration

#### 1. Create Backup

```bash
# PostgreSQL backup
pg_dump -h production-host -U user -d smartmed \
  -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
pg_restore --list backup_20260106_120000.dump | head -20
```

#### 2. Check Migration Status

```bash
# SSH to production server or use CI/CD
npx prisma migrate status

# Expected output:
# 2 migrations found in prisma/migrations
# 
# Your local migration history and the migrations table from your database are in sync.
# No pending migrations to apply.
```

#### 3. Apply Migration

```bash
# Apply all pending migrations
npx prisma migrate deploy

# Expected output:
# Applying migration `20260106000000_add_last_login`
# 
# The following migration(s) have been applied:
# - 20260106000000_add_last_login
```

#### 4. Verify Migration

```bash
# Check migration was applied
npx prisma migrate status

# Verify schema
npx prisma db pull --print

# Run health check
curl https://api.smartmed.com/api/health
```

### Zero-Downtime Migrations

For changes that don't require downtime:

1. **Additive changes** (safe)
   - Adding optional columns
   - Adding new tables
   - Adding new indexes

2. **Non-additive changes** (require strategy)
   - Removing columns
   - Renaming columns
   - Changing column types
   - Removing tables

#### Zero-Downtime Strategy

**Adding a new required field:**

```sql
-- Step 1: Add as nullable
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Step 2: Backfill data (in application or script)
UPDATE users SET phone = '' WHERE phone IS NULL;

-- Step 3: Add NOT NULL constraint
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

**Renaming a column:**

```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);

-- Step 2: Copy data
UPDATE users SET full_name = name;

-- Step 3: Update application to use both columns

-- Step 4: Remove old column (after deployment)
ALTER TABLE users DROP COLUMN name;
```

### Migration Script Template

```bash
#!/bin/bash
# deploy-migration.sh

set -e

echo "=== SmartMed Database Migration ==="
echo "Starting at: $(date)"

# Configuration
BACKUP_DIR="/backups"
DB_HOST="${DATABASE_HOST}"
DB_NAME="${DATABASE_NAME}"

# Step 1: Create backup
echo "Creating backup..."
BACKUP_FILE="${BACKUP_DIR}/smartmed_$(date +%Y%m%d_%H%M%S).dump"
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -f $BACKUP_FILE

if [ $? -ne 0 ]; then
    echo "ERROR: Backup failed!"
    exit 1
fi
echo "Backup created: $BACKUP_FILE"

# Step 2: Check pending migrations
echo "Checking pending migrations..."
npx prisma migrate status

# Step 3: Apply migrations
echo "Applying migrations..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
    echo "ERROR: Migration failed! Rolling back..."
    pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME -c $BACKUP_FILE
    exit 1
fi

# Step 4: Verify
echo "Verifying migration..."
npx prisma migrate status

echo "=== Migration Complete ==="
echo "Finished at: $(date)"
```

---

## 4. Rollback Procedures

### Automatic Rollback (Prisma)

Prisma does not support automatic rollback. Manual rollback is required.

### Manual Rollback Steps

#### 1. Restore from Backup

```bash
# Drop and recreate database (if full reset needed)
psql -h host -U user -c "DROP DATABASE smartmed;"
psql -h host -U user -c "CREATE DATABASE smartmed;"

# Restore from backup
pg_restore -h host -U user -d smartmed backup_file.dump
```

#### 2. Mark Migration as Rolled Back

```sql
-- Remove migration record from tracking table
DELETE FROM _prisma_migrations 
WHERE migration_name = '20260106000000_add_last_login';
```

#### 3. Revert Schema (Manual SQL)

```sql
-- Example: Revert column addition
ALTER TABLE users DROP COLUMN last_login_at;

-- Example: Revert table creation
DROP TABLE audit_logs;

-- Example: Revert index
DROP INDEX idx_appointments_date;
```

### Rollback Decision Matrix

| Issue | Severity | Action |
|-------|----------|--------|
| Migration failed mid-execution | HIGH | Restore from backup |
| Application errors after migration | MEDIUM | Rollback migration, fix, redeploy |
| Performance degradation | MEDIUM | Add indexes, optimize, or rollback |
| Data corruption | CRITICAL | Restore from backup immediately |

---

## 5. Data Migration Patterns

### Seeding Data

```typescript
// packages/database/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  await prisma.user.upsert({
    where: { email: 'admin@smartmed.com' },
    update: {},
    create: {
      email: 'admin@smartmed.com',
      fullName: 'System Admin',
      role: 'ADMIN',
      passwordHash: await hashPassword('change-me-immediately'),
    },
  });

  // Seed specializations
  const specializations = [
    'Cardiology',
    'Dermatology',
    'General Practice',
    'Neurology',
    'Pediatrics',
  ];

  for (const name of specializations) {
    await prisma.specialization.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('Seeding complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

### Data Backfill Script

```typescript
// scripts/backfill-patient-uuid.ts
import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

async function backfill() {
  const batchSize = 1000;
  let offset = 0;
  let processed = 0;

  while (true) {
    const patients = await prisma.patient.findMany({
      where: { externalId: null },
      take: batchSize,
      skip: offset,
    });

    if (patients.length === 0) break;

    await prisma.$transaction(
      patients.map((patient) =>
        prisma.patient.update({
          where: { id: patient.id },
          data: { externalId: uuid() },
        })
      )
    );

    processed += patients.length;
    offset += batchSize;
    console.log(`Processed ${processed} patients`);
  }

  console.log(`Backfill complete. Total: ${processed}`);
}

backfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Large Table Migration

For tables with millions of rows:

```sql
-- Create new table with correct schema
CREATE TABLE users_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Copy data in batches
INSERT INTO users_new (id, email, full_name, created_at)
SELECT id, email, name as full_name, created_at
FROM users
WHERE id > $last_id
ORDER BY id
LIMIT 10000;

-- Swap tables (during maintenance window)
BEGIN;
ALTER TABLE users RENAME TO users_old;
ALTER TABLE users_new RENAME TO users;
COMMIT;

-- Clean up (after verification)
DROP TABLE users_old;
```

---

## 6. Troubleshooting

### Common Issues

#### Migration Drift

**Symptom:** `prisma migrate status` shows schema drift

**Solution:**
```bash
# Sync local schema with database
npx prisma db pull

# Or reset migration history (dev only!)
npx prisma migrate reset
```

#### Failed Migration

**Symptom:** Migration failed partway through

**Solution:**
1. Check migration status
2. Identify which statements succeeded
3. Manually complete or rollback
4. Mark migration appropriately

```sql
-- Check current state
\d users  -- View table structure

-- Manually fix or rollback as needed
ALTER TABLE users DROP COLUMN IF EXISTS broken_column;
```

#### Lock Timeout

**Symptom:** Migration hangs on `ALTER TABLE`

**Solution:**
```sql
-- Find blocking queries
SELECT pid, query, state 
FROM pg_stat_activity 
WHERE state != 'idle';

-- Terminate blocking connection (carefully!)
SELECT pg_terminate_backend(pid);
```

#### Shadow Database Issues

**Symptom:** "Could not connect to shadow database"

**Solution:**
```bash
# Create shadow database manually
psql -c "CREATE DATABASE smartmed_shadow;"

# Or use direct creation URL
DATABASE_URL="..." SHADOW_DATABASE_URL="..." npx prisma migrate dev
```

### Health Checks After Migration

```sql
-- Check row counts
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'prescriptions', COUNT(*) FROM prescriptions;

-- Check for orphaned records
SELECT COUNT(*) FROM appointments 
WHERE patient_id NOT IN (SELECT id FROM patients);

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'appointments';
```

---

## Quick Reference

### Commands

| Action | Command |
|--------|---------|
| Create migration | `npx prisma migrate dev --name <name>` |
| Apply migrations | `npx prisma migrate deploy` |
| Check status | `npx prisma migrate status` |
| Reset database | `npx prisma migrate reset` |
| Generate client | `npx prisma generate` |
| Pull schema | `npx prisma db pull` |
| Push schema | `npx prisma db push` |
| Open studio | `npx prisma studio` |

### Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@host:5432/smartmed
SHADOW_DATABASE_URL=postgresql://user:pass@host:5432/smartmed_shadow
```

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | January 6, 2026 | Initial migration guide | Database Team |
