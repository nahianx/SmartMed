# SmartMed Production Deployment Guide

**Version:** 1.0  
**Last Updated:** January 6, 2026

---

## Pre-Deployment Checklist

### HIPAA Compliance (MUST COMPLETE BEFORE DEPLOY)

- [ ] PHI encryption at rest enabled (database)
- [ ] PHI encryption at rest enabled (S3 storage)
- [ ] Business Associate Agreement signed - Resend
- [ ] Business Associate Agreement signed - AWS/S3
- [ ] Business Associate Agreement signed - Database provider
- [ ] Business Associate Agreement signed - Hosting provider
- [ ] Audit log retention configured for 6 years (✅ Code updated)
- [ ] Access controls verified
- [ ] Transmission security (TLS) verified

### Security

- [ ] npm vulnerabilities reviewed (5 HIGH accepted - see SECURITY_VULNERABILITIES.md)
- [ ] Environment variables secured
- [ ] API keys rotated for production
- [ ] Rate limiting configured
- [ ] CORS configured for production domains

### Infrastructure

- [ ] Production database provisioned
- [ ] Production environment variables set
- [ ] DNS configured
- [ ] SSL certificates installed
- [ ] CDN configured (if applicable)
- [ ] Backup system configured

### Application

- [ ] All tests passing
- [ ] Build succeeds without errors
- [ ] Database migrations reviewed
- [ ] Seed data appropriate for production

---

## Deployment Steps

### Step 1: Final Verification

```bash
# Run all tests
npm run test

# Run build
npm run build

# Check for linting issues
npm run lint

# Verify no TypeScript errors
npx tsc --noEmit
```

### Step 2: Database Migration

```bash
# Generate production migration
cd packages/database
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

### Step 3: Deploy to Staging

```bash
# Deploy to staging environment
npm run deploy:staging

# Or using Vercel/Railway/etc
vercel --prod --env=staging
```

### Step 4: Staging Verification

Run these verification tests on staging:

1. **Health Check**
   ```bash
   curl https://staging-api.smartmed.com/health
   ```

2. **Authentication Flow**
   - Register new user
   - Verify email
   - Login
   - Enable MFA
   - Logout

3. **Core Flows**
   - Book appointment
   - View prescriptions
   - Update profile

4. **API Verification**
   - Import Postman collection
   - Run collection tests against staging

### Step 5: Deploy to Production

```bash
# Deploy to production
npm run deploy:production

# Or using platform-specific commands
vercel --prod
# or
railway up --environment production
```

### Step 6: Post-Deployment Verification

```bash
# Health check
curl https://api.smartmed.com/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "...",
#   "version": "1.0.0"
# }
```

---

## Environment Variables

### Required Production Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="[generate-secure-secret]"
JWT_REFRESH_SECRET="[generate-secure-secret]"

# Email (Resend)
RESEND_API_KEY="re_..."

# Storage (S3)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="smartmed-production"
AWS_REGION="us-east-1"

# Application
NODE_ENV="production"
API_URL="https://api.smartmed.com"
WEB_URL="https://smartmed.com"

# Security
CORS_ORIGINS="https://smartmed.com,https://www.smartmed.com"
RATE_LIMIT_MAX="100"
```

### Variable Checklist

- [ ] DATABASE_URL - Production database connection
- [ ] JWT_SECRET - New secret for production (min 64 chars)
- [ ] JWT_REFRESH_SECRET - New secret for production
- [ ] RESEND_API_KEY - Production Resend key
- [ ] AWS credentials - Production S3 access
- [ ] CORS_ORIGINS - Production domains only

---

## Rollback Procedure

### Quick Rollback (< 5 min)

If issues detected within first 30 minutes:

```bash
# Rollback to previous deployment
vercel rollback
# or
railway rollback
```

### Database Rollback

If migration caused issues:

```bash
# Rollback last migration
cd packages/database
npx prisma migrate resolve --rolled-back [migration_name]
```

### Full Rollback Checklist

1. [ ] Notify team of rollback
2. [ ] Execute platform rollback command
3. [ ] Verify previous version is running
4. [ ] Rollback database if needed
5. [ ] Verify application health
6. [ ] Document incident
7. [ ] Schedule post-mortem

---

## Monitoring Setup

### Post-Deployment Monitoring

#### Health Endpoints

| Endpoint | Expected | Frequency |
|----------|----------|-----------|
| `/health` | 200 OK | 30 seconds |
| `/api/health` | 200 OK | 30 seconds |

#### Key Metrics to Watch

| Metric | Warning | Critical |
|--------|---------|----------|
| Response time | > 500ms | > 2000ms |
| Error rate | > 1% | > 5% |
| CPU usage | > 70% | > 90% |
| Memory usage | > 80% | > 95% |
| Database connections | > 80% pool | > 95% pool |

#### First 24 Hours

- [ ] Monitor error tracking (Sentry/etc)
- [ ] Check application logs hourly
- [ ] Monitor database performance
- [ ] Verify email delivery working
- [ ] Verify file uploads working
- [ ] Check audit logs are being created

---

## Post-Deployment Tasks

### Immediate (0-1 hour)

- [ ] Verify health endpoint responding
- [ ] Test authentication flow
- [ ] Test core features
- [ ] Verify monitoring alerts working
- [ ] Check database connections

### First 4 Hours

- [ ] Monitor for errors/exceptions
- [ ] Verify email notifications sending
- [ ] Check audit log entries
- [ ] Monitor response times
- [ ] Review application logs

### First 24 Hours

- [ ] Full feature regression test
- [ ] Monitor user feedback channels
- [ ] Review error rates
- [ ] Check backup ran successfully
- [ ] Update status page if applicable

### First Week

- [ ] Review performance metrics
- [ ] Gather initial user feedback
- [ ] Document any issues encountered
- [ ] Plan any necessary hotfixes
- [ ] Schedule retrospective

---

## Communication Plan

### Pre-Deployment

| Audience | Message | When |
|----------|---------|------|
| Team | Deployment starting | 30 min before |
| Stakeholders | Deployment scheduled | 1 hour before |
| Users | Maintenance notice (if needed) | 24 hours before |

### During Deployment

| Event | Action |
|-------|--------|
| Deployment started | Update team channel |
| Staging verified | Notify team lead |
| Production deployed | Notify all stakeholders |
| Issues detected | Escalate immediately |

### Post-Deployment

| Outcome | Message |
|---------|---------|
| Success | "Production deployment complete, all systems operational" |
| Issues | "Deployment complete with issues, team investigating" |
| Rollback | "Deployment rolled back, investigating issues" |

---

## Emergency Contacts

| Role | Name | Contact | When to Contact |
|------|------|---------|-----------------|
| On-Call Engineer | | | Any deployment issues |
| Tech Lead | | | Critical decisions |
| DevOps | | | Infrastructure issues |
| Product Manager | | | User-facing decisions |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 6, 2026 | Initial deployment guide |
