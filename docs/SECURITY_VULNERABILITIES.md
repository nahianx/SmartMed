# SmartMed Security Vulnerability Assessment

**Version:** 1.0  
**Assessment Date:** January 6, 2026  
**Status:** REVIEWED

---

## Executive Summary

This document tracks npm security vulnerabilities identified in the SmartMed codebase, their risk assessment, and remediation status.

### Vulnerability Summary

| Severity | Count | Fixed | Accepted | Action Required |
|----------|-------|-------|----------|-----------------|
| HIGH | 5 | 0 | 5 | Review mitigations |
| LOW | 5 | 0 | 5 | Monitor only |
| **Total** | **10** | **0** | **10** | |

---

## HIGH Severity Vulnerabilities

### 1. glob - Command Injection (GHSA-5j98-mcp5-4vw2)

| Field | Value |
|-------|-------|
| **Package** | glob 10.2.0 - 10.4.5 |
| **Severity** | HIGH |
| **Dependency Chain** | eslint-config-next → @next/eslint-plugin-next → glob |
| **Advisory** | https://github.com/advisories/GHSA-5j98-mcp5-4vw2 |

**Vulnerability Description:**
Command injection via `-c/--cmd` flag executes matches with `shell:true`.

**Risk Assessment:**
- **Exploitable in Production:** ❌ NO
- **Reason:** This vulnerability affects the glob CLI tool when used with the `-c/--cmd` flag. This is a development-only dependency (eslint) and is not executed in production runtime.
- **Risk Level:** LOW (despite HIGH severity)

**Decision:** ✅ ACCEPTED
- This is a dev dependency only
- Not included in production builds
- No user input reaches this code path
- Fix requires breaking changes to eslint-config-next

**Mitigation:**
- Do not use glob CLI with `-c/--cmd` flag
- Monitor for eslint-config-next updates
- Review when upgrading Next.js

---

### 2. pdfjs-dist - Arbitrary JavaScript Execution (GHSA-wgrm-67xf-hhpq)

| Field | Value |
|-------|-------|
| **Package** | pdfjs-dist <=4.1.392 |
| **Severity** | HIGH |
| **Dependency Chain** | react-pdf → pdfjs-dist |
| **Advisory** | https://github.com/advisories/GHSA-wgrm-67xf-hhpq |

**Vulnerability Description:**
Arbitrary JavaScript execution upon opening a malicious PDF.

**Risk Assessment:**
- **Exploitable in Production:** ⚠️ POTENTIAL
- **Attack Vector:** Malicious PDF uploaded as medical report
- **Affected Feature:** PDF viewing in web application
- **Risk Level:** MEDIUM

**Decision:** ✅ ACCEPTED WITH MITIGATIONS

**Mitigations Implemented:**
1. **File Upload Validation:**
   - Server validates PDF structure before storage
   - File type verification (magic bytes, not just extension)
   - File size limits enforced

2. **Access Control:**
   - Only authenticated users can upload files
   - Only authorized users (patient, their doctors) can view
   - Audit logging on all file access

3. **Content Security Policy:**
   - Strict CSP headers prevent inline script execution
   - PDF rendering in sandboxed context

4. **Monitoring:**
   - Alert on unusual PDF access patterns
   - Log all PDF rendering errors

**Future Action:**
- Upgrade react-pdf when pdfjs-dist fix is available
- Consider server-side PDF rendering as alternative
- Quarterly review of this vulnerability

---

### 3-5. tmp - Symlink Attack (GHSA-52f5-9888-hmc6)

| Field | Value |
|-------|-------|
| **Package** | tmp <=0.2.3 |
| **Severity** | HIGH (x3 instances) |
| **Dependency Chain** | @turbo/gen → node-plop → inquirer → external-editor → tmp |
| **Advisory** | https://github.com/advisories/GHSA-52f5-9888-hmc6 |

**Vulnerability Description:**
Arbitrary temporary file/directory write via symbolic link `dir` parameter.

**Risk Assessment:**
- **Exploitable in Production:** ❌ NO
- **Reason:** This is a development-only dependency (@turbo/gen is for code generation). Not used in production runtime.
- **Risk Level:** LOW (despite HIGH severity)

**Decision:** ✅ ACCEPTED
- Development-only tool
- Not included in production builds
- No user input reaches this code path
- No fix available from upstream

**Mitigation:**
- Avoid running turbo generators in shared/untrusted environments
- Monitor for tmp package updates

---

## LOW Severity Vulnerabilities

### Summary

All 5 LOW severity vulnerabilities are related to the `tmp` package dependency chain. They share the same characteristics as the HIGH severity tmp issues above.

| Package | Issue | Status |
|---------|-------|--------|
| tmp | Symlink attack variants | ACCEPTED |
| tmp | Various related issues | ACCEPTED |

**Risk Assessment:** LOW - Development dependencies only

---

## Remediation Summary

### Fixed Automatically (via `npm audit fix`)

| Package | Vulnerability | Previous | Fixed Version |
|---------|---------------|----------|---------------|
| qs | DoS via arrayLimit bypass | <6.14.1 | 6.14.1+ |
| body-parser | Depends on vulnerable qs | <=1.20.3 | 1.20.4+ |
| express | Depends on vulnerable qs | <=4.21.2 | 4.21.3+ |

### Cannot Fix Without Breaking Changes

| Package | Reason | Action |
|---------|--------|--------|
| glob | eslint-config-next not updated | Accept (dev only) |
| pdfjs-dist | react-pdf not updated | Accept with mitigations |
| tmp | No upstream fix | Accept (dev only) |

---

## Risk Acceptance Sign-Off

I have reviewed the security vulnerabilities documented above and accept the risks based on the mitigations in place.

**Security Lead / Technical Lead:**

Name: _______________________

Signature: _______________________

Date: _______________________

---

## Ongoing Monitoring

### Automated Monitoring

- [ ] Configure Dependabot for automated dependency updates
- [ ] Enable GitHub Security Alerts
- [ ] Set up Snyk monitoring (free tier)
- [ ] Weekly npm audit in CI/CD pipeline

### Manual Review Schedule

| Activity | Frequency | Owner | Next Due |
|----------|-----------|-------|----------|
| npm audit review | Weekly | DevOps | Jan 13, 2026 |
| Dependency update review | Monthly | Dev Team | Feb 1, 2026 |
| Security assessment | Quarterly | Security | Apr 1, 2026 |

### Alert Triggers

Monitor for:
- New CVEs affecting pdfjs-dist or react-pdf
- Updates to eslint-config-next with glob fix
- New fixes for tmp package

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | January 6, 2026 | Initial vulnerability assessment | Security Team |
