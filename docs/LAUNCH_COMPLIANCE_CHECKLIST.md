# SmartMed Launch Compliance Checklist

**Version:** 1.0  
**Last Updated:** January 6, 2026  
**Status:** PRE-LAUNCH VERIFICATION

---

## CRITICAL COMPLIANCE REQUIREMENTS

All items in this checklist MUST be verified and signed off before production launch. Healthcare applications handling PHI require HIPAA compliance.

---

## 1. PHI Encryption at Rest

### Database Encryption

| Item | Status | Verified By | Date | Notes |
|------|--------|-------------|------|-------|
| Database encryption enabled | ☐ | | | |
| Encryption type (TDE/AES-256) | ☐ | | | |
| Encryption key management | ☐ | | | |
| Dashboard verification screenshot | ☐ | | | |

**Required Actions:**
- [ ] For managed database (AWS RDS, DigitalOcean, etc.):
  - Enable "Encryption at Rest" in database settings
  - Use AES-256 encryption
  - Document key management (provider-managed vs customer-managed)
- [ ] For self-hosted PostgreSQL:
  - Enable pgcrypto extension for column-level encryption, OR
  - Configure full-disk encryption (LUKS), OR
  - Use PostgreSQL TDE if available

**Evidence Location:** `compliance/encryption/database_encryption_verification.png`

### S3 File Storage Encryption

| Item | Status | Verified By | Date | Notes |
|------|--------|-------------|------|-------|
| S3 server-side encryption enabled | ☐ | | | |
| Encryption type (SSE-S3/SSE-KMS) | ☐ | | | |
| Default encryption for new objects | ☐ | | | |
| Bucket policy verification | ☐ | | | |

**Required Actions:**
- [ ] Enable default encryption on S3 bucket
- [ ] Use SSE-S3 (Amazon managed) or SSE-KMS (customer managed)
- [ ] Verify encryption in S3 bucket properties
- [ ] Set bucket policy to require encrypted uploads

**Evidence Location:** `compliance/encryption/s3_encryption_verification.png`

---

## 2. Business Associate Agreements (BAAs)

### Required BAAs

| Vendor | Service | PHI Processed | BAA Status | Date Signed | Renewal Date |
|--------|---------|---------------|------------|-------------|--------------|
| Resend | Email | Prescriptions, appointments | ☐ Not Signed | | |
| AWS S3 | File storage | Medical reports | ☐ Not Signed | | |
| Database Provider | Database hosting | All PHI | ☐ Not Signed | | |
| Hosting Provider | Infrastructure | All PHI | ☐ Not Signed | | |

**Required Actions for Each Vendor:**
- [ ] Verify vendor offers HIPAA-compliant service tier
- [ ] Locate BAA document (usually under Legal/Compliance)
- [ ] Upgrade to HIPAA-compliant tier if required
- [ ] Execute BAA (digital signature or formal process)
- [ ] Store signed copy in `compliance/baa/` folder
- [ ] Record compliance contact information

**CRITICAL:** Cannot launch without BAAs for all PHI-processing vendors.

**Signed BAA Location:** `compliance/baa/`

---

## 3. Audit Log Retention

| Item | Status | Verified By | Date | Notes |
|------|--------|-------------|------|-------|
| Retention period set to 6 years | ✅ | DevOps | Jan 6, 2026 | Updated in audit.service.ts |
| Archival strategy implemented | ☐ | | | |
| Archived logs searchable | ☐ | | | |
| Cost analysis completed | ☐ | | | |

**Implementation Details:**
- Retention updated from 90 days to 2190 days (6 years)
- File: `apps/api/src/services/audit.service.ts`
- Constant: `HIPAA_RETENTION_DAYS = 2190`

**Archival Strategy:**
- [ ] Recent logs (0-6 months): Database (fast access)
- [ ] Older logs (6 months - 6 years): Cold storage (S3 Glacier)
- [ ] Automated archival job: Monthly
- [ ] Retention policy documented

---

## 4. Access Controls

| Item | Status | Verified By | Date | Notes |
|------|--------|-------------|------|-------|
| RBAC implemented | ✅ | | | UserRole enum |
| Unique user IDs | ✅ | | | UUID-based |
| Password policy enforced | ✅ | | | 8+ chars, complexity |
| MFA available | ✅ | | | TOTP-based |
| Session management | ✅ | | | JWT + refresh tokens |
| Automatic logout | ✅ | | | 15min access token |

---

## 5. Transmission Security

| Item | Status | Verified By | Date | Notes |
|------|--------|-------------|------|-------|
| TLS 1.2+ enforced | ☐ | | | |
| Valid SSL certificate | ☐ | | | |
| HSTS enabled | ☐ | | | |
| Secure cookies (HttpOnly, Secure) | ✅ | | | |

---

## 6. Security Monitoring

| Item | Status | Verified By | Date | Notes |
|------|--------|-------------|------|-------|
| Audit logging enabled | ✅ | | | 40+ action types |
| Failed login tracking | ✅ | | | |
| PHI access logging | ✅ | | | |
| Security alerts configured | ☐ | | | |

---

## Pre-Launch Sign-Off

### Technical Lead Verification

I verify that all critical HIPAA compliance requirements have been addressed and the system is ready for production launch.

| Requirement | Verified |
|-------------|----------|
| PHI encryption at rest enabled | ☐ |
| All BAAs signed | ☐ |
| Audit log retention = 6 years | ✅ |
| Access controls implemented | ✅ |
| Transmission security configured | ☐ |

**Technical Lead Name:** _______________________

**Signature:** _______________________

**Date:** _______________________

---

### Compliance Officer Verification (if applicable)

I verify that SmartMed meets HIPAA compliance requirements for handling Protected Health Information.

**Compliance Officer Name:** _______________________

**Signature:** _______________________

**Date:** _______________________

---

## Post-Launch Compliance Tasks

| Task | Frequency | Owner | Next Due |
|------|-----------|-------|----------|
| Audit log review | Monthly | | |
| Access review | Quarterly | | |
| BAA renewal check | Annual | | |
| Security assessment | Annual | | |
| HIPAA training | Annual | | |
| Backup restoration test | Quarterly | | |

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | January 6, 2026 | Initial launch compliance checklist | DevOps Team |
