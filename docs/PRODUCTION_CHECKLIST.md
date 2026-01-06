# SmartMed Production Deployment Checklist

**Version:** 1.0  
**Last Updated:** January 6, 2026

---

## Pre-Deployment Checklist

This checklist must be completed before deploying SmartMed to production. Healthcare applications have strict requirements for security, reliability, and compliance.

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Security Configuration](#2-security-configuration)
3. [Database Setup](#3-database-setup)
4. [Infrastructure](#4-infrastructure)
5. [Monitoring & Logging](#5-monitoring--logging)
6. [Compliance](#6-compliance)
7. [Pre-Launch Verification](#7-pre-launch-verification)
8. [Go-Live Checklist](#8-go-live-checklist)

---

## 1. Environment Setup

### 1.1 Environment Variables

All required environment variables must be set with production values:

```bash
# ====================
# REQUIRED VARIABLES
# ====================

# Server Configuration
NODE_ENV=production
PORT=4000

# Database (Use connection pooling for production)
DATABASE_URL=postgresql://user:password@host:5432/smartmed?sslmode=require&connection_limit=20

# Authentication (MUST change from defaults!)
JWT_SECRET=<generate-256-bit-random-string>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# MFA (MUST be set for production)
MFA_ENCRYPTION_KEY=<generate-32-byte-hex-key>

# OAuth
GOOGLE_CLIENT_ID=<production-client-id>
GOOGLE_CLIENT_SECRET=<production-client-secret>

# Email Service
RESEND_API_KEY=<production-api-key>
EMAIL_FROM=noreply@smartmed.com

# File Storage
AWS_ACCESS_KEY_ID=<production-access-key>
AWS_SECRET_ACCESS_KEY=<production-secret-key>
AWS_S3_BUCKET=smartmed-production-files
AWS_REGION=us-east-1

# Redis (for queues and sessions)
REDIS_URL=redis://:password@redis-host:6379

# Frontend URL (for CORS)
FRONTEND_URL=https://smartmed.com

# API URL
API_URL=https://api.smartmed.com

# ====================
# SECURITY VARIABLES
# ====================

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Session
SESSION_SECRET=<generate-random-string>
COOKIE_DOMAIN=.smartmed.com
COOKIE_SECURE=true
```

### 1.2 Secrets Generation

```bash
# Generate JWT_SECRET (256 bits)
openssl rand -base64 32

# Generate MFA_ENCRYPTION_KEY (32 bytes hex)
openssl rand -hex 32

# Generate SESSION_SECRET
openssl rand -base64 48
```

### 1.3 Environment Checklist

| Variable | Set? | Production Value? | Notes |
|----------|------|-------------------|-------|
| NODE_ENV | ☐ | ☐ Must be "production" | |
| DATABASE_URL | ☐ | ☐ SSL enabled | |
| JWT_SECRET | ☐ | ☐ Changed from default | |
| MFA_ENCRYPTION_KEY | ☐ | ☐ Properly generated | |
| GOOGLE_CLIENT_ID | ☐ | ☐ Production OAuth | |
| RESEND_API_KEY | ☐ | ☐ Production key | |
| AWS credentials | ☐ | ☐ IAM role preferred | |
| REDIS_URL | ☐ | ☐ Authenticated | |
| FRONTEND_URL | ☐ | ☐ Production domain | |

---

## 2. Security Configuration

### 2.1 SSL/TLS Setup

| Item | Status | Notes |
|------|--------|-------|
| SSL certificate obtained | ☐ | Let's Encrypt or commercial |
| Certificate auto-renewal | ☐ | Certbot or similar |
| HTTPS enforced | ☐ | Redirect HTTP → HTTPS |
| HSTS enabled | ☐ | Strict-Transport-Security header |
| TLS 1.2+ only | ☐ | Disable older protocols |

### 2.2 Security Headers

Ensure these headers are set (via Helmet.js or reverse proxy):

```nginx
# Nginx example
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### 2.3 Security Checklist

| Security Measure | Status | Notes |
|-----------------|--------|-------|
| HTTPS enabled | ☐ | |
| Security headers configured | ☐ | |
| CORS properly restricted | ☐ | Only allow production domain |
| Rate limiting enabled | ☐ | |
| Input validation active | ☐ | |
| SQL injection protection | ☐ | Prisma parameterized queries |
| XSS protection | ☐ | |
| CSRF protection | ☐ | |
| Secure cookies configured | ☐ | HttpOnly, Secure, SameSite |
| Default admin password changed | ☐ | |
| Debug mode disabled | ☐ | |
| Error details hidden | ☐ | Don't expose stack traces |

---

## 3. Database Setup

### 3.1 Database Configuration

| Item | Status | Notes |
|------|--------|-------|
| Production database created | ☐ | |
| SSL connection required | ☐ | `?sslmode=require` |
| Connection pooling configured | ☐ | PgBouncer or built-in |
| Database user created (non-root) | ☐ | Principle of least privilege |
| Password strength verified | ☐ | Min 24 characters |
| Network access restricted | ☐ | VPC/firewall rules |
| Backup strategy in place | ☐ | Daily automated backups |
| Point-in-time recovery enabled | ☐ | For disaster recovery |

### 3.2 Database Migrations

```bash
# Run migrations in production
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

### 3.3 Database Indexes

Ensure these indexes exist for performance:

```sql
-- User lookups
CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);

-- Appointment queries
CREATE INDEX IF NOT EXISTS idx_appointment_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointment_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointment_date ON appointments(scheduled_at);

-- Audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);

-- Queue queries
CREATE INDEX IF NOT EXISTS idx_queue_doctor ON queue_entries(doctor_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue_entries(status);
```

---

## 4. Infrastructure

### 4.1 Server Requirements

| Resource | Minimum | Recommended | Notes |
|----------|---------|-------------|-------|
| CPU | 2 cores | 4 cores | Per instance |
| RAM | 4 GB | 8 GB | |
| Storage | 50 GB SSD | 100 GB SSD | |
| Bandwidth | 100 Mbps | 1 Gbps | |

### 4.2 Architecture Checklist

| Component | Status | Notes |
|-----------|--------|-------|
| Load balancer configured | ☐ | AWS ALB, nginx, etc. |
| Auto-scaling configured | ☐ | For handling traffic spikes |
| Health check endpoints | ☐ | `/api/health` |
| Database failover | ☐ | Multi-AZ or replica |
| Redis high availability | ☐ | Cluster or Sentinel |
| CDN for static assets | ☐ | CloudFront, Cloudflare |
| DDoS protection | ☐ | |

### 4.3 Docker Production Config

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  api:
    image: smartmed-api:latest
    restart: always
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  web:
    image: smartmed-web:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
```

---

## 5. Monitoring & Logging

### 5.1 Monitoring Setup

| Item | Status | Provider/Tool |
|------|--------|---------------|
| Application metrics | ☐ | Prometheus, DataDog |
| Error tracking | ☐ | Sentry |
| Uptime monitoring | ☐ | Pingdom, UptimeRobot |
| Log aggregation | ☐ | ELK, CloudWatch Logs |
| Database monitoring | ☐ | pg_stat_statements |
| Alert configuration | ☐ | PagerDuty, Slack |

### 5.2 Key Metrics to Monitor

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| API response time (p95) | > 500ms | Warning |
| API response time (p95) | > 1000ms | Critical |
| Error rate | > 1% | Warning |
| Error rate | > 5% | Critical |
| CPU usage | > 70% | Warning |
| CPU usage | > 90% | Critical |
| Memory usage | > 80% | Warning |
| Database connections | > 80% pool | Warning |
| Disk usage | > 80% | Warning |

### 5.3 Health Check Endpoint

```bash
# Verify health endpoint
curl https://api.smartmed.com/api/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2026-01-06T12:00:00Z",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected"
}
```

### 5.4 Logging Configuration

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Application logs | 30 days | CloudWatch/ELK |
| Access logs | 90 days | S3/CloudWatch |
| Error logs | 1 year | S3/CloudWatch |
| Audit logs | 6 years | S3 (HIPAA requirement) |

---

## 6. Compliance

### 6.1 HIPAA Requirements

| Requirement | Status | Documentation |
|-------------|--------|---------------|
| BAA with hosting provider | ☐ | [BAA_REQUIREMENTS.md](./docs/BAA_REQUIREMENTS.md) |
| BAA with database provider | ☐ | |
| BAA with email provider | ☐ | |
| Data encryption at rest | ☐ | |
| Data encryption in transit | ☐ | |
| Audit logging enabled | ☐ | |
| Access controls implemented | ☐ | |
| Incident response plan | ☐ | [SECURITY_INCIDENT_RESPONSE.md](./docs/SECURITY_INCIDENT_RESPONSE.md) |
| Data retention policy | ☐ | [DATA_RETENTION_POLICY.md](./docs/DATA_RETENTION_POLICY.md) |

### 6.2 Privacy Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| Privacy policy published | ☐ | |
| Terms of service published | ☐ | |
| Cookie consent implemented | ☐ | |
| Data subject rights process | ☐ | |
| Breach notification process | ☐ | |

---

## 7. Pre-Launch Verification

### 7.1 Functionality Testing

| Test | Status | Notes |
|------|--------|-------|
| User registration | ☐ | Both patient and doctor |
| Email verification | ☐ | Emails received |
| Login/logout | ☐ | |
| Password reset | ☐ | |
| MFA setup | ☐ | |
| Appointment booking | ☐ | End-to-end flow |
| Prescription creation | ☐ | |
| Queue system | ☐ | Real-time updates |
| File uploads | ☐ | S3 integration |
| Notifications | ☐ | Email and in-app |

### 7.2 Performance Testing

| Test | Status | Result |
|------|--------|--------|
| Load test (100 users) | ☐ | |
| Load test (500 users) | ☐ | |
| Stress test | ☐ | |
| Database query performance | ☐ | |
| API response times | ☐ | |

### 7.3 Security Testing

| Test | Status | Notes |
|------|--------|-------|
| Penetration test | ☐ | |
| Vulnerability scan | ☐ | |
| OWASP Top 10 review | ☐ | |
| Dependency audit | ☐ | `npm audit` |
| SSL configuration | ☐ | SSL Labs test |

---

## 8. Go-Live Checklist

### 8.1 Final Verification (24 hours before)

| Item | Status | Owner |
|------|--------|-------|
| All tests passing | ☐ | QA |
| Database backup tested | ☐ | DevOps |
| Rollback plan documented | ☐ | DevOps |
| On-call schedule set | ☐ | Team Lead |
| Stakeholders notified | ☐ | PM |
| DNS TTL lowered | ☐ | DevOps |

### 8.2 Deployment Day

| Step | Status | Time | Notes |
|------|--------|------|-------|
| Team standby confirmed | ☐ | T-1h | |
| Final backup taken | ☐ | T-30m | |
| Deploy to production | ☐ | T | |
| Run database migrations | ☐ | T+5m | |
| Verify health checks | ☐ | T+10m | |
| Smoke tests pass | ☐ | T+15m | |
| Monitor for 1 hour | ☐ | T+1h | |
| DNS update (if needed) | ☐ | T+1h | |
| Announce launch | ☐ | T+2h | |

### 8.3 Post-Launch

| Item | Status | Timeline |
|------|--------|----------|
| Monitor error rates | ☐ | First 24 hours |
| Review performance metrics | ☐ | First 24 hours |
| Customer support ready | ☐ | Day 1 |
| First backup verified | ☐ | Day 1 |
| Post-mortem (if issues) | ☐ | Day 2 |

### 8.4 Rollback Procedure

If critical issues are discovered:

1. **Immediate (< 30 min post-deploy)**
   ```bash
   # Revert to previous deployment
   kubectl rollout undo deployment/smartmed-api
   # or
   docker-compose down && docker-compose -f docker-compose.previous.yml up -d
   ```

2. **Database rollback (if migrations caused issues)**
   ```bash
   # Restore from backup
   pg_restore -h host -U user -d smartmed backup_pre_deploy.dump
   ```

3. **Communication**
   - Notify stakeholders
   - Update status page
   - Document issue for post-mortem

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Development Lead | | | |
| Security Officer | | | |
| DevOps Lead | | | |
| Product Manager | | | |
| Compliance Officer | | | |

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | January 6, 2026 | Initial production checklist | DevOps Team |
