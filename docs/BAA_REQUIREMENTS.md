# SmartMed Business Associate Agreement Requirements

**Version:** 1.0  
**Date:** January 6, 2026  
**Status:** Pre-Production Assessment

---

## Overview

Under HIPAA, a Business Associate Agreement (BAA) must be established with any third party that creates, receives, maintains, or transmits Protected Health Information (PHI) on behalf of a covered entity. This document identifies all third-party services used by SmartMed that require BAAs before processing real patient data.

---

## Summary of Required BAAs

| Service | Vendor | PHI Involved | BAA Status | Priority |
|---------|--------|--------------|------------|----------|
| Email Service | Resend | Yes | ❌ Not Signed | CRITICAL |
| Cloud Database | [TBD Provider] | Yes | ❌ Not Signed | CRITICAL |
| Cloud Hosting | [TBD Provider] | Yes | ❌ Not Signed | CRITICAL |
| File Storage | AWS S3 / MinIO | Yes | ❌ Not Signed | CRITICAL |
| Backup Service | [TBD Provider] | Yes | ❌ Not Signed | HIGH |
| Error Tracking | [TBD - Sentry/etc] | Maybe | ⚠️ Review | MEDIUM |

---

## Detailed Service Analysis

### 1. Email Service - Resend

**Current Provider:** [Resend](https://resend.com)

**PHI Transmitted:**
- Patient names
- Appointment details
- Prescription notifications
- Email verification links

**Assessment:**
- Resend is a transactional email service
- ⚠️ Standard accounts may not offer BAA
- Need to verify HIPAA compliance status

**Alternatives if BAA Not Available:**
| Provider | BAA Available | Notes |
|----------|--------------|-------|
| Amazon SES | ✅ Yes | Requires AWS BAA |
| SendGrid | ✅ Yes (Enterprise) | Twilio BAA covers SendGrid |
| Mailchimp Transactional | ✅ Yes | Request from sales |
| Postmark | ✅ Yes | Available on request |

**Action Required:**
1. Contact Resend to request BAA
2. If unavailable, migrate to HIPAA-compliant provider
3. Sign BAA before production launch

---

### 2. Cloud Database Provider

**Current Provider:** [To Be Determined]

**PHI Stored:**
- All patient records
- Prescriptions and diagnoses
- Appointment history
- Medical reports metadata
- Audit logs

**Assessment:**
This is the most critical BAA requirement. The database contains all PHI.

**HIPAA-Compliant Database Options:**

| Provider | Service | BAA Process | Notes |
|----------|---------|-------------|-------|
| **AWS** | RDS PostgreSQL | AWS BAA | Encryption at rest required |
| **Google Cloud** | Cloud SQL | GCP BAA | Configure encryption |
| **Microsoft Azure** | Azure Database | Azure BAA | TDE available |
| **DigitalOcean** | Managed Database | DO BAA | Available for teams |
| **Supabase** | Postgres | Supabase BAA | Pro plan and above |
| **PlanetScale** | MySQL | ❌ Not Yet | MySQL only |
| **Neon** | Postgres | ⚠️ Verify | Contact for BAA |

**Recommended:** AWS RDS PostgreSQL with BAA + encryption at rest

**Action Required:**
1. Select production database provider
2. Request and sign BAA
3. Configure encryption at rest
4. Enable audit logging at database level

---

### 3. Cloud Hosting Provider

**Current Provider:** [To Be Determined]

**PHI Access:**
- Transient access during request processing
- Memory may contain PHI temporarily
- Logs may capture request metadata

**HIPAA-Compliant Hosting Options:**

| Provider | Service | BAA Available | Notes |
|----------|---------|---------------|-------|
| **AWS** | EC2, ECS, Lambda | ✅ Yes | Sign AWS BAA |
| **Google Cloud** | Compute, Cloud Run | ✅ Yes | Sign GCP BAA |
| **Microsoft Azure** | VMs, App Service | ✅ Yes | Sign Azure BAA |
| **Heroku** | Heroku Shield | ✅ Yes | Shield tier only |
| **Vercel** | Serverless | ⚠️ Contact | May need Enterprise |
| **Render** | Web Services | ⚠️ Verify | Contact for HIPAA |
| **Railway** | Containers | ❌ Not available | Not HIPAA compliant |

**Action Required:**
1. Select production hosting provider with BAA support
2. Sign BAA before deploying production workloads
3. Document shared responsibility model

---

### 4. File Storage (S3/Object Storage)

**Current Configuration:** AWS S3 or S3-compatible (MinIO)

**PHI Stored:**
- Medical reports (lab results, imaging)
- Prescription PDFs (if cached)
- Patient-uploaded documents

**Assessment:**
- AWS S3 can be covered under AWS BAA
- If using MinIO self-hosted, no BAA needed (you control)
- Third-party S3-compatible services need individual assessment

**Configuration Requirements for AWS S3:**
- [x] Server-side encryption enabled (SSE-S3 or SSE-KMS)
- [ ] Bucket policies restrict public access
- [ ] Access logging enabled
- [ ] Versioning enabled for data integrity
- [ ] Lifecycle policies for retention

**Action Required:**
1. If using AWS S3: Sign AWS BAA, enable encryption
2. If using MinIO: Document self-hosted security controls
3. If using other provider: Verify BAA availability

---

### 5. Backup Service

**Current Provider:** [To Be Determined]

**PHI Involved:**
- Database backups contain all PHI
- File storage backups contain medical documents

**Options:**

| Approach | BAA Requirement | Notes |
|----------|-----------------|-------|
| Database provider backups | Covered by DB BAA | Preferred |
| AWS Backup | Covered by AWS BAA | Centralized |
| Third-party backup | Needs separate BAA | Additional cost |
| Self-managed | No BAA needed | More responsibility |

**Action Required:**
1. Document backup strategy
2. Ensure backup storage covered by BAA
3. Test backup encryption

---

### 6. Error Tracking and Monitoring

**Potential Providers:** Sentry, Datadog, New Relic, Bugsnag

**PHI Risk:**
- Error messages may contain PHI
- Stack traces could expose patient data
- Request payloads might be logged

**Mitigation Strategies:**
1. **Data Scrubbing:** Configure to scrub sensitive fields
2. **Field Filtering:** Exclude PHI fields from capture
3. **Self-Hosted:** Use self-hosted Sentry (no BAA needed)

**Provider BAA Status:**

| Provider | BAA Available | Notes |
|----------|--------------|-------|
| Sentry | ✅ Yes (Business) | Must configure PHI scrubbing |
| Datadog | ✅ Yes | Enterprise tier |
| New Relic | ✅ Yes | Contact sales |
| Bugsnag | ⚠️ Verify | Contact for HIPAA |

**Recommendation:**
Use Sentry with BAA + aggressive data scrubbing, OR self-host Sentry.

**Action Required:**
1. Select monitoring provider
2. If sending any request data, sign BAA
3. Configure PHI scrubbing before production

---

## Services That Do NOT Require BAAs

The following services do not process PHI and do not require BAAs:

| Service | Purpose | PHI Status | Notes |
|---------|---------|------------|-------|
| RxNav API (NIH) | Drug interaction data | No PHI sent | Only drug names queried |
| GitHub | Source code hosting | No PHI | Code only, no patient data |
| npm Registry | Package management | No PHI | Dependencies only |
| DNS Providers | Domain resolution | No PHI | No patient data transmitted |
| CDN (static assets) | Image/CSS delivery | No PHI | No PHI in static files |

---

## BAA Template Provisions

When reviewing vendor BAAs, ensure they include:

### Required Provisions
- [ ] Permitted uses and disclosures of PHI
- [ ] Prohibition on unauthorized disclosure
- [ ] Appropriate safeguards requirement
- [ ] Reporting of security incidents/breaches
- [ ] Subcontractor obligations
- [ ] Access to PHI for amendment
- [ ] Accounting of disclosures
- [ ] Compliance with HHS requirements
- [ ] Termination provisions

### Recommended Provisions
- [ ] Cyber insurance requirements
- [ ] Indemnification clauses
- [ ] Audit rights
- [ ] Breach notification timeline (< 72 hours)
- [ ] Data deletion upon termination
- [ ] Encryption requirements

---

## BAA Tracking Checklist

### Pre-Production Launch

| Vendor | Service | BAA Requested | BAA Signed | Expiration | Notes |
|--------|---------|---------------|------------|------------|-------|
| [DB Provider] | Database | ☐ | ☐ | | |
| [Host Provider] | Hosting | ☐ | ☐ | | |
| Resend / Alt | Email | ☐ | ☐ | | |
| AWS / Alt | File Storage | ☐ | ☐ | | |
| [Monitoring] | Error Tracking | ☐ | ☐ | | |

### BAA Maintenance

- **Review Cycle:** Annual
- **Renewal Reminder:** 60 days before expiration
- **Storage Location:** [Document management system TBD]
- **Access:** Limited to Security Officer and Legal

---

## Action Plan

### Week 1 (Critical Path)
1. [ ] Finalize production infrastructure choices
2. [ ] Request BAAs from selected providers
3. [ ] Review BAA terms with legal counsel

### Week 2
4. [ ] Sign all critical BAAs (database, hosting, storage)
5. [ ] Configure provider security settings
6. [ ] Document BAA terms and expiration dates

### Week 3
7. [ ] Sign remaining BAAs (email, monitoring)
8. [ ] Set up calendar reminders for renewals
9. [ ] Create BAA tracking system

### Ongoing
- Annual BAA review
- Vendor security assessment
- Compliance documentation updates

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | January 6, 2026 | Initial BAA requirements assessment | Security Team |

---

## References

- [HHS Business Associates Guidance](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/business-associates/index.html)
- [HIPAA Business Associate Agreement Provisions](https://www.law.cornell.edu/cfr/text/45/164.504)
- [SmartMed HIPAA Compliance](./HIPAA_COMPLIANCE.md)
