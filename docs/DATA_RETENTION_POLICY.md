# SmartMed Data Retention Policy

**Version:** 1.0  
**Date:** January 6, 2026  
**Effective Date:** [To be set upon approval]  
**Review Cycle:** Annual

---

## 1. Purpose

This policy establishes data retention periods for all information processed by SmartMed, ensuring compliance with HIPAA, state medical records laws, and other applicable regulations while supporting operational needs.

---

## 2. Scope

This policy applies to all data created, received, maintained, or transmitted by SmartMed, including:
- Electronic health records (EHR)
- Patient demographic information
- Medical documents and reports
- Prescriptions and medication records
- Audit logs and security events
- User account information
- System backups

---

## 3. Regulatory Requirements

### HIPAA Requirements
- Medical records: Minimum 6 years from date of creation or last effective date
- Audit logs: Minimum 6 years
- Policies and procedures: Minimum 6 years from date last in effect

### State-Specific Requirements
Medical record retention varies by state. The most restrictive applicable requirement should be followed:

| State | Adult Records | Minor Records | Notes |
|-------|--------------|---------------|-------|
| California | 7 years | Until minor turns 18 + 7 years | |
| New York | 6 years | Until minor turns 21 + 6 years | |
| Texas | 7 years | Until minor turns 20 | |
| Florida | 5 years | Until minor turns 22 | |
| General Federal | 6 years | 6 years from age of majority | HIPAA default |

**SmartMed Default:** 10 years for medical records (exceeds most requirements)

### DEA Requirements (Prescriptions)
- Controlled substance prescription records: Minimum 2 years
- SmartMed retains all prescriptions for 10 years (exceeds requirement)

---

## 4. Retention Schedule

### 4.1 Patient Health Information (PHI)

| Data Type | Retention Period | Legal Basis | Disposal Method |
|-----------|------------------|-------------|-----------------|
| Patient Demographics | 10 years after last activity | HIPAA + State laws | Secure deletion |
| Medical History | 10 years after last activity | State medical records laws | Secure deletion |
| Allergies | 10 years after last activity | Medical records requirement | Secure deletion |
| Prescriptions | 10 years from creation | DEA + State requirements | Secure deletion |
| Appointment Records | 10 years from date | Medical records requirement | Secure deletion |
| Medical Reports/Documents | 10 years from upload | Medical records requirement | Secure deletion |

### 4.2 Audit and Security Data

| Data Type | Retention Period | Legal Basis | Disposal Method |
|-----------|------------------|-------------|-----------------|
| Audit Logs (PHI Access) | 6 years | HIPAA Security Rule | Secure deletion |
| Security Event Logs | 6 years | HIPAA Security Rule | Secure deletion |
| Failed Login Attempts | 6 years | Security best practice | Secure deletion |
| Permission Change Logs | 6 years | HIPAA requirement | Secure deletion |

### 4.3 User Account Data

| Data Type | Retention Period | Legal Basis | Disposal Method |
|-----------|------------------|-------------|-----------------|
| Active User Accounts | Indefinite while active | Operational need | N/A |
| Inactive User Accounts | 2 years after last login | Operational need | Soft delete |
| Deleted User Accounts | Account metadata: 6 years | HIPAA audit requirement | Anonymize |

### 4.4 Transactional and Session Data

| Data Type | Retention Period | Legal Basis | Disposal Method |
|-----------|------------------|-------------|-----------------|
| Active Sessions | Until logout or expiry | Security | Automatic purge |
| Expired Sessions | 30 days | Troubleshooting | Automatic purge |
| Password Reset Tokens | Until used or 1 hour | Security | Automatic purge |
| Email Verification Tokens | Until used or 7 days | Operational | Automatic purge |
| MFA Backup Codes | Until regenerated | Security | Overwrite |

### 4.5 System and Operational Data

| Data Type | Retention Period | Legal Basis | Disposal Method |
|-----------|------------------|-------------|-----------------|
| Application Logs | 90 days | Troubleshooting | Automatic purge |
| Error Logs | 1 year | Debugging | Automatic purge |
| Performance Metrics | 1 year | Operational monitoring | Automatic purge |
| Email Sending Logs | 1 year | Delivery verification | Secure deletion |

### 4.6 Backup Data

| Backup Type | Retention Period | Storage Location | Notes |
|-------------|------------------|------------------|-------|
| Daily Database Backups | 30 days | Encrypted cloud storage | Rolling retention |
| Weekly Database Backups | 3 months | Encrypted cloud storage | Rolling retention |
| Monthly Database Backups | 1 year | Encrypted cloud storage | Rolling retention |
| Annual Database Backups | 7 years | Encrypted archive storage | Long-term compliance |
| File Storage Backups | Same as database | Encrypted cloud storage | Synchronized with DB |

---

## 5. Data Deletion Procedures

### 5.1 Automatic Deletion

The following data types are automatically purged:

| Data Type | Purge Mechanism | Frequency |
|-----------|-----------------|-----------|
| Expired Sessions | Database job | Hourly |
| Expired Tokens | Database job | Hourly |
| Old Application Logs | Log rotation | Daily |
| Expired Audit Logs | `cleanupExpiredLogs()` | Daily (scheduled) |

### 5.2 Manual Deletion Requests

**Process for User Data Deletion Requests:**

1. **Request Receipt**
   - User submits deletion request via support or in-app
   - Request logged with timestamp and requester identity

2. **Eligibility Assessment**
   - Verify requester identity
   - Identify data subject to legal holds
   - Determine deletable vs. retained data

3. **Data Categories Response**

   | Category | Action | Reason |
   |----------|--------|--------|
   | User preferences | Delete | No retention requirement |
   | Dashboard configuration | Delete | No retention requirement |
   | Notification settings | Delete | No retention requirement |
   | Appointment history | Retain | Medical records law |
   | Prescription records | Retain | DEA + State law |
   | Audit logs | Retain | HIPAA requirement |

4. **Execution**
   - Soft-delete user account (mark inactive)
   - Remove non-regulated data
   - Anonymize audit log references
   - Notify user of completion

5. **Documentation**
   - Log deletion request and actions taken
   - Retain deletion record for 6 years

### 5.3 Data Anonymization

For data that must be retained but requested for deletion:

| Data Element | Anonymization Method |
|--------------|---------------------|
| Patient Name | Replace with "Anonymized User [HASH]" |
| Email Address | Replace with "[deleted]@anonymized.local" |
| Phone Number | Replace with "000-000-0000" |
| Address | Replace with "Anonymized" |
| IP Addresses | Mask to /24 (e.g., 192.168.1.0) |

**Note:** Clinical data (prescriptions, diagnoses) cannot be anonymized and must be retained per legal requirements.

---

## 6. Data Subject Rights

### 6.1 Right to Access

Patients may request copies of their PHI. Response timeline: 30 days.

**Process:**
1. Verify requester identity
2. Compile requested records
3. Provide in requested format (electronic preferred)
4. Log access request in audit trail

### 6.2 Right to Amendment

Patients may request corrections to their PHI.

**Process:**
1. Receive amendment request
2. Review with treating provider
3. Accept or deny with explanation
4. If accepted, update records and notify recipients
5. Retain original with amendment notation

### 6.3 Right to Restriction

Patients may request restrictions on PHI use/disclosure.

**Note:** SmartMed is not required to agree to all restrictions, except for disclosures to health plans when patient paid out-of-pocket.

### 6.4 Right to Accounting of Disclosures

Patients may request a list of PHI disclosures.

**SmartMed Implementation:**
- Audit logs track all PHI access
- Report can be generated from audit system
- Covers 6-year lookback period

---

## 7. Implementation

### 7.1 Current System Status

| Feature | Implementation Status | Notes |
|---------|----------------------|-------|
| Audit log retention | ⚠️ 90 days (needs update to 6 years) | Update `retentionDate` calculation |
| Session expiry | ✅ Implemented | Token-based expiry |
| Token cleanup | ✅ Implemented | Automatic purge |
| User deletion | ⚠️ Partial | Add soft-delete workflow |
| Backup retention | ⚠️ Not configured | Set up backup lifecycle |

### 7.2 Required Changes

**Priority 1: Audit Log Retention Update**
```typescript
// In audit.service.ts - change retention calculation
const retentionDate = new Date()
retentionDate.setFullYear(retentionDate.getFullYear() + 6) // 6 years
```

**Priority 2: Backup Lifecycle Configuration**
- Configure database backup retention in cloud provider
- Set up archive storage for long-term backups
- Document restoration procedures

**Priority 3: User Deletion Workflow**
- Implement soft-delete for user accounts
- Add data export feature for patients
- Create deletion request handling process

### 7.3 Scheduled Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `cleanupExpiredSessions` | Hourly | Remove expired session records |
| `cleanupExpiredTokens` | Hourly | Remove expired reset/verification tokens |
| `cleanupExpiredAuditLogs` | Daily at 3 AM | Remove audit logs past retention date |
| `archiveOldBackups` | Weekly | Move old backups to archive storage |

---

## 8. Exceptions and Legal Holds

### 8.1 Legal Hold Process

When litigation or regulatory investigation is anticipated:

1. Legal counsel issues hold notice
2. Affected data identified and tagged
3. Automatic deletion suspended for tagged data
4. Hold lifted only by legal counsel authorization
5. Normal retention resumes after hold lifted

### 8.2 Exception Requests

Exceptions to this policy require:
- Written request with justification
- Approval by Security Officer
- Documentation of exception period
- Review at end of exception period

---

## 9. Training and Awareness

All personnel with access to PHI must:
- Receive training on this policy during onboarding
- Complete annual refresher training
- Acknowledge understanding in writing

---

## 10. Policy Violations

Violations of this policy may result in:
- Disciplinary action up to termination
- Regulatory penalties
- Legal liability

Report suspected violations to the Security Officer immediately.

---

## 11. Policy Review

This policy will be reviewed:
- Annually (mandatory)
- When significant regulatory changes occur
- After security incidents affecting data retention
- Upon material changes to business operations

---

## Document History

| Version | Date | Changes | Approved By |
|---------|------|---------|-------------|
| 1.0 | January 6, 2026 | Initial policy | [Pending] |

---

## Appendix A: Retention Period Quick Reference

```
┌────────────────────────────────────────────────────────────────┐
│                    RETENTION QUICK REFERENCE                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ● Patient Records ─────────────────────────── 10 YEARS ●    │
│  ● Prescriptions ───────────────────────────── 10 YEARS ●    │
│  ● Medical Reports ─────────────────────────── 10 YEARS ●    │
│  ● Audit Logs ──────────────────────────────── 6 YEARS  ●    │
│  ● Annual Backups ──────────────────────────── 7 YEARS  ●    │
│  ● Application Logs ────────────────────────── 90 DAYS  ●    │
│  ● Sessions ────────────────────────────────── 30 DAYS  ●    │
│  ● Temp Tokens ─────────────────────────────── 1-7 DAYS ●    │
│                                                                │
│  "When in doubt, retain for 10 years or consult legal."       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Appendix B: Related Documents

- [HIPAA Compliance Policy](./HIPAA_COMPLIANCE.md)
- [Security Incident Response Plan](./SECURITY_INCIDENT_RESPONSE.md)
- [Business Associate Agreement Requirements](./BAA_REQUIREMENTS.md)
- [Backup and Recovery Procedures](./BACKUP_RECOVERY.md) [To be created]
