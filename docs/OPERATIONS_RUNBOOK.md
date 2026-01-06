# SmartMed Operations Runbook

**Version:** 1.0  
**Last Updated:** January 6, 2026

---

## Quick Reference

| Situation | Action | Page |
|-----------|--------|------|
| Application down | [System Down Procedure](#system-down) | §2.1 |
| Database issue | [Database Troubleshooting](#database-issues) | §2.2 |
| High error rate | [Error Investigation](#high-error-rate) | §2.3 |
| Security incident | [Security Response](#security-incident) | §2.4 |
| Rollback needed | [Rollback Procedure](#rollback) | §3.1 |

---

## 1. System Architecture Overview

```
User Request → Load Balancer → Web App (Next.js)
                    ↓
                API Server (Express)
                    ↓
            ┌───────┼───────┐
            ↓       ↓       ↓
        PostgreSQL Redis   S3
```

### Key Components

| Component | Purpose | Health Check |
|-----------|---------|--------------|
| Web App | Frontend UI | `https://smartmed.com/` |
| API Server | Backend services | `https://api.smartmed.com/api/health` |
| PostgreSQL | Primary database | Prisma connection |
| Redis | Queue & cache | BullMQ connection |
| S3 | File storage | AWS SDK |

---

## 2. Incident Response Procedures

### 2.1 System Down {#system-down}

**Symptoms:** Users cannot access application, health checks failing

**Immediate Actions:**

1. **Verify the outage**
   ```bash
   curl -I https://smartmed.com
   curl -I https://api.smartmed.com/api/health
   ```

2. **Check hosting provider status page**
   - AWS: https://health.aws.amazon.com/
   - Vercel: https://www.vercel-status.com/
   - Database provider status page

3. **Check deployment status**
   - Review recent deployments
   - Check CI/CD pipeline for failures

4. **Check logs**
   ```bash
   # Application logs
   vercel logs --follow  # or equivalent
   
   # Database logs
   # Check database provider dashboard
   ```

5. **If recent deployment caused issue:**
   - [Execute Rollback](#rollback)

6. **If infrastructure issue:**
   - Contact hosting provider support
   - Update status page for users

**Escalation:**
- 0-5 min: On-call engineer investigates
- 5-15 min: Escalate to technical lead
- 15+ min: Escalate to management, consider rollback

---

### 2.2 Database Issues {#database-issues}

**Symptoms:** Slow queries, connection errors, data not saving

**Investigation Steps:**

1. **Check database connectivity**
   ```bash
   npx prisma db pull  # Verify connection
   ```

2. **Check connection pool**
   - Review active connections
   - Check for connection leaks
   - Verify pool size is appropriate

3. **Check slow queries**
   ```sql
   -- PostgreSQL slow query log
   SELECT query, calls, mean_time, total_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

4. **Check database resources**
   - CPU utilization
   - Memory usage
   - Disk I/O
   - Storage capacity

5. **Common fixes:**
   - Restart application to reset connections
   - Kill long-running queries
   - Add missing indexes
   - Scale up database resources

---

### 2.3 High Error Rate {#high-error-rate}

**Symptoms:** Error rate > 2%, spike in error tracking dashboard

**Investigation Steps:**

1. **Identify error pattern**
   - Check error tracking dashboard (Sentry)
   - Group by error type
   - Identify affected endpoints

2. **Review recent changes**
   - Check recent deployments
   - Review code changes
   - Check config changes

3. **Check dependencies**
   - External API status (RxNav, etc.)
   - Email service (Resend)
   - File storage (S3)

4. **Mitigation options:**
   - Rollback if deployment-related
   - Disable affected feature temporarily
   - Scale up if resource-related
   - Contact external service if third-party

---

### 2.4 Security Incident {#security-incident}

**Symptoms:** Unusual access patterns, potential data breach, security alerts

**Immediate Actions:**

1. **Assess severity**
   - P1 (Active breach): Immediate action
   - P2 (Potential breach): < 1 hour response
   - P3 (Vulnerability): < 4 hours response

2. **For P1 incidents:**
   - Notify security lead immediately
   - Consider isolating affected systems
   - Preserve evidence (logs, screenshots)
   - Do NOT delete logs

3. **Contain the threat:**
   - Disable compromised accounts
   - Revoke affected tokens
   - Block suspicious IPs

4. **Document everything:**
   - Timeline of events
   - Actions taken
   - Evidence collected

5. **Follow SECURITY_INCIDENT_RESPONSE.md**

---

## 3. Operational Procedures

### 3.1 Rollback Procedure {#rollback}

**When to rollback:**
- Critical bug in production
- System stability issues
- Security vulnerability discovered

**Steps:**

1. **Notify team**
   ```
   @team Initiating rollback to [version]. Reason: [reason]
   ```

2. **Application rollback**
   ```bash
   # Git-based rollback
   git revert HEAD  # Revert last commit
   # OR
   git reset --hard [previous-tag]
   git push --force origin main
   
   # Deploy previous version
   # Via CI/CD or manual deploy
   ```

3. **Database rollback (if needed)**
   ```bash
   # CAUTION: Only if migration caused data issues
   # First, backup current state
   pg_dump -h host -U user smartmed > pre_rollback_backup.sql
   
   # Restore from backup
   pg_restore -h host -U user -d smartmed backup.dump
   ```

4. **Verify rollback**
   - Check health endpoints
   - Run smoke tests
   - Monitor error rates

5. **Post-rollback**
   - Investigate root cause
   - Fix issue in development
   - Plan re-deployment

---

### 3.2 Deployment Procedure

**Pre-deployment:**
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Staging tested
- [ ] Rollback plan ready

**Deployment steps:**
1. Tag release: `git tag v1.x.x`
2. Push to main branch
3. Monitor CI/CD pipeline
4. Verify health checks
5. Run smoke tests
6. Monitor for 30 minutes

**Post-deployment:**
- Monitor error rates
- Check user feedback
- Document deployment

---

### 3.3 Database Maintenance

**Daily:**
- Monitor connections
- Check error logs

**Weekly:**
- Review slow queries
- Check storage usage

**Monthly:**
- Update statistics: `ANALYZE;`
- Review index usage
- Archive old audit logs

**Quarterly:**
- Test backup restoration
- Review and optimize queries
- Capacity planning

---

## 4. Contact Information

### Internal Team

| Role | Name | Contact | Hours |
|------|------|---------|-------|
| On-Call Engineer | Rotation | [pager] | 24/7 |
| Technical Lead | | [email] | Business |
| Security Lead | | [email] | Business |

### External Contacts

| Service | Support Link | SLA |
|---------|--------------|-----|
| Hosting Provider | [support URL] | Varies |
| Database Provider | [support URL] | Varies |
| Email (Resend) | support@resend.com | Business |
| AWS Support | [console] | Varies |

---

## 5. Monitoring Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Application Health | [URL] | Uptime, latency |
| Error Tracking | [Sentry URL] | Errors, stack traces |
| Database | [Provider URL] | DB performance |
| Logs | [URL] | Application logs |

---

## 6. Useful Commands

```bash
# Check API health
curl https://api.smartmed.com/api/health

# Database connection test
npx prisma db pull

# View recent logs
# [Provider-specific command]

# Run database migrations
npx prisma migrate deploy

# Clear Redis cache (if needed)
redis-cli FLUSHDB

# Generate Prisma client after schema changes
npx prisma generate
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 6, 2026 | Initial runbook |
