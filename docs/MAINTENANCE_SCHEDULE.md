# SmartMed Maintenance Schedule

**Version:** 1.0  
**Last Updated:** January 6, 2026

---

## Overview

This document defines the regular maintenance schedule for SmartMed production systems. Adherence to this schedule ensures system reliability, security, and HIPAA compliance.

---

## Maintenance Calendar

### Daily Tasks

| Task | Time | Owner | Duration |
|------|------|-------|----------|
| Review error dashboard | 9:00 AM | On-call | 15 min |
| Check system health | 9:00 AM | On-call | 10 min |
| Review support tickets | 9:00 AM | Support | 30 min |
| Monitor key metrics | Ongoing | Automated | - |

**Daily Checklist:**
- [ ] Error rate within acceptable limits (<1%)
- [ ] No critical alerts pending
- [ ] All health checks passing
- [ ] Support queue reviewed

---

### Weekly Tasks

| Task | Day | Owner | Duration |
|------|-----|-------|----------|
| npm audit review | Monday | DevOps | 30 min |
| Performance metrics review | Monday | DevOps | 30 min |
| Audit log review | Wednesday | Security | 1 hour |
| Backup verification | Friday | DevOps | 30 min |
| Dependency update review | Friday | Dev Team | 1 hour |

**Weekly Checklist:**
- [ ] npm audit run, new vulnerabilities reviewed
- [ ] Response times within SLA
- [ ] No unusual patterns in audit logs
- [ ] Backups completing successfully
- [ ] Dependencies up to date

---

### Monthly Tasks

| Task | Week | Owner | Duration |
|------|------|-------|----------|
| Database optimization | Week 1 | DBA/DevOps | 2 hours |
| Security log deep review | Week 2 | Security | 2 hours |
| Capacity planning | Week 3 | DevOps | 1 hour |
| Dependency updates | Week 4 | Dev Team | 4 hours |
| Documentation review | Week 4 | All | 1 hour |

**Monthly Maintenance Tasks:**

#### Database Optimization
```sql
-- Update statistics
ANALYZE;

-- Check for bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Reindex if needed
REINDEX DATABASE smartmed;
```

#### Audit Log Archival
```bash
# Archive logs older than 6 months to cold storage
# Script: scripts/archive-audit-logs.ts
npm run archive:audit-logs
```

---

### Quarterly Tasks

| Task | Month | Owner | Duration |
|------|-------|-------|----------|
| Backup restoration test | M1 | DevOps | 4 hours |
| Security assessment | M2 | Security | 8 hours |
| Performance load test | M2 | QA | 4 hours |
| Access review | M3 | Security | 2 hours |
| BAA renewal check | M3 | Compliance | 1 hour |
| DR drill | M3 | All | 4 hours |

**Quarterly Checklist:**
- [ ] Backup restoration tested successfully
- [ ] Security vulnerabilities assessed
- [ ] Load test completed, results documented
- [ ] User access reviewed, stale accounts removed
- [ ] BAA status verified with all vendors
- [ ] Disaster recovery drill completed

---

### Annual Tasks

| Task | Quarter | Owner | Duration |
|------|---------|-------|----------|
| Full security audit | Q1 | External | 1-2 weeks |
| HIPAA compliance review | Q1 | Compliance | 1 week |
| Infrastructure review | Q2 | DevOps | 2 days |
| Vendor assessment | Q2 | Procurement | 1 week |
| Policy review | Q3 | Legal/Compliance | 1 week |
| Team training | Q4 | HR/Dev | 2 days |

---

## Maintenance Windows

### Scheduled Maintenance

| Window | Time (UTC) | Type |
|--------|------------|------|
| Primary | Sunday 2:00-6:00 AM | Major updates |
| Secondary | Wednesday 2:00-4:00 AM | Minor updates |
| Emergency | Any time | Critical fixes |

### Maintenance Notification Process

1. **Planned maintenance (non-emergency):**
   - Notify users 72 hours in advance
   - Send reminder 24 hours before
   - Post on status page

2. **Emergency maintenance:**
   - Update status page immediately
   - Notify users ASAP
   - Post-incident communication

---

## Task Details

### npm Audit Review (Weekly)

```bash
# Run audit
npm audit

# Review output for new vulnerabilities
# Check if fixes are available
npm audit fix

# Document findings in SECURITY_VULNERABILITIES.md
```

### Backup Verification (Weekly)

1. Verify backup job completed
2. Check backup size (should be consistent)
3. Verify backup is stored in correct location
4. Log verification in backup log

### Backup Restoration Test (Quarterly)

1. Create test database instance
2. Restore latest backup to test instance
3. Verify data integrity
4. Run sample queries
5. Document results
6. Destroy test instance

### Security Log Review (Monthly)

Review audit logs for:
- Failed login attempts (threshold: >10/day unusual)
- Unauthorized access attempts
- Unusual access patterns
- Off-hours access
- Bulk data exports

### Access Review (Quarterly)

- List all user accounts
- Identify inactive accounts (no login in 90 days)
- Verify role assignments are appropriate
- Remove stale accounts
- Document review

---

## Automation

### Automated Monitoring

| Check | Frequency | Tool |
|-------|-----------|------|
| Uptime | 1 min | UptimeRobot/Pingdom |
| Health endpoint | 5 min | Monitoring service |
| Error rate | Real-time | Sentry |
| Database connections | 5 min | Database monitoring |

### Automated Maintenance

| Task | Frequency | Tool |
|------|-----------|------|
| Audit log archival | Monthly | Cron job |
| Database vacuum | Weekly | pg_cron |
| Certificate renewal | Auto | Let's Encrypt |
| Dependency updates | Weekly | Dependabot |

---

## Documentation

All maintenance activities should be documented:

1. **Before maintenance:**
   - Create maintenance ticket/record
   - Document planned changes
   - Note rollback plan

2. **After maintenance:**
   - Record completion time
   - Note any issues encountered
   - Update relevant documentation

3. **Storage:**
   - Maintenance logs: `logs/maintenance/`
   - Backup verification: `logs/backup-verification/`
   - Security reviews: `compliance/security-reviews/`

---

## Contacts

| Role | Contact | Responsibilities |
|------|---------|------------------|
| DevOps Lead | [email] | Infrastructure, backups |
| Security Lead | [email] | Security tasks |
| DBA | [email] | Database maintenance |
| On-Call | [rotation] | Daily monitoring |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 6, 2026 | Initial maintenance schedule |
