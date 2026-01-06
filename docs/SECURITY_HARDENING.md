# SmartMed Security Hardening Guide

**Version:** 1.0  
**Last Updated:** January 6, 2026  
**Classification:** Internal - Security Sensitive

---

## Overview

This guide provides comprehensive security hardening procedures for SmartMed production deployment. As a healthcare application handling PHI (Protected Health Information), security is paramount.

---

## Table of Contents

1. [Server Hardening](#1-server-hardening)
2. [Application Security](#2-application-security)
3. [Database Security](#3-database-security)
4. [Network Security](#4-network-security)
5. [Authentication & Access Control](#5-authentication--access-control)
6. [Encryption](#6-encryption)
7. [Logging & Monitoring](#7-logging--monitoring)
8. [Incident Response Preparation](#8-incident-response-preparation)
9. [Compliance Checklist](#9-compliance-checklist)

---

## 1. Server Hardening

### 1.1 Operating System

#### Update Management

```bash
# Enable automatic security updates (Ubuntu)
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Check for updates manually
sudo apt update && sudo apt upgrade -y
```

#### Remove Unnecessary Services

```bash
# List all services
systemctl list-unit-files --type=service

# Disable unnecessary services
sudo systemctl disable <service-name>
sudo systemctl stop <service-name>

# Common services to disable if not needed:
# - telnet, ftp, rsh, rlogin
# - cups (printing)
# - bluetooth
# - avahi-daemon
```

#### Firewall Configuration

```bash
# Ubuntu UFW setup
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow only required ports
sudo ufw allow 22/tcp    # SSH (consider changing port)
sudo ufw allow 80/tcp    # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp   # HTTPS

# Enable firewall
sudo ufw enable
sudo ufw status verbose
```

### 1.2 SSH Hardening

```bash
# /etc/ssh/sshd_config
Port 2222                        # Change default port
PermitRootLogin no              # Disable root login
PasswordAuthentication no       # Use keys only
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
AllowUsers deploy               # Whitelist users
```

### 1.3 File System Security

```bash
# Set proper permissions
chmod 700 /home/deploy
chmod 600 /home/deploy/.ssh/authorized_keys

# Restrict /tmp
mount -o remount,noexec,nosuid,nodev /tmp

# Hide process information
mount -o remount,hidepid=2 /proc
```

### 1.4 Server Hardening Checklist

| Item | Status | Notes |
|------|--------|-------|
| OS updated to latest | ☐ | |
| Automatic updates enabled | ☐ | |
| Unnecessary services disabled | ☐ | |
| Firewall configured | ☐ | |
| SSH hardened | ☐ | |
| Root login disabled | ☐ | |
| Fail2ban installed | ☐ | |
| SELinux/AppArmor enabled | ☐ | |
| Audit logging enabled | ☐ | |
| NTP configured | ☐ | |

---

## 2. Application Security

### 2.1 Environment Variables

```bash
# Secure environment file permissions
chmod 600 .env
chown deploy:deploy .env

# Never commit secrets to git
echo ".env" >> .gitignore
echo "*.pem" >> .gitignore
echo "*.key" >> .gitignore
```

### 2.2 Security Headers

Configure in Express.js middleware:

```typescript
// src/middleware/security.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const securityMiddleware = [
  // Helmet for security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Tighten for production
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", process.env.API_URL],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-site' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  }),

  // Rate limiting
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }),
];
```

### 2.3 Input Validation

```typescript
// Use Zod for all input validation
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

// Sanitize HTML in user inputs
import DOMPurify from 'isomorphic-dompurify';

const sanitizedInput = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: [], // No HTML allowed
  ALLOWED_ATTR: [],
});
```

### 2.4 Dependency Security

```bash
# Audit dependencies regularly
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated

# Use Snyk for continuous monitoring
npx snyk test
npx snyk monitor
```

### 2.5 Application Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| All inputs validated | ☐ | |
| Output encoding implemented | ☐ | |
| CSRF protection enabled | ☐ | |
| Security headers configured | ☐ | |
| Rate limiting active | ☐ | |
| Dependencies audited | ☐ | |
| Error messages sanitized | ☐ | No stack traces in production |
| Debug mode disabled | ☐ | |
| Secrets in env vars | ☐ | |
| No hardcoded credentials | ☐ | |

---

## 3. Database Security

### 3.1 PostgreSQL Hardening

```sql
-- Create application user with minimal privileges
CREATE USER smartmed_app WITH PASSWORD 'strong-password';
GRANT CONNECT ON DATABASE smartmed TO smartmed_app;
GRANT USAGE ON SCHEMA public TO smartmed_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO smartmed_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO smartmed_app;

-- Revoke public access
REVOKE ALL ON DATABASE smartmed FROM PUBLIC;
```

### 3.2 PostgreSQL Configuration

```ini
# postgresql.conf security settings

# Connection settings
listen_addresses = 'localhost'  # Only local connections
port = 5432
max_connections = 100

# Authentication
password_encryption = scram-sha-256

# SSL
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'

# Logging
log_connections = on
log_disconnections = on
log_statement = 'ddl'  # Log all DDL statements
log_duration = off
```

### 3.3 pg_hba.conf Configuration

```
# TYPE  DATABASE    USER           ADDRESS         METHOD
local   all         postgres                       peer
host    smartmed    smartmed_app   10.0.0.0/8     scram-sha-256
host    all         all            0.0.0.0/0       reject
```

### 3.4 Database Encryption

```sql
-- Enable pgcrypto for field-level encryption
CREATE EXTENSION pgcrypto;

-- Example: Encrypt sensitive field
UPDATE patients 
SET ssn_encrypted = pgp_sym_encrypt(ssn, 'encryption-key')
WHERE ssn IS NOT NULL;
```

### 3.5 Database Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| Dedicated DB user (non-root) | ☐ | |
| Strong password policy | ☐ | |
| SSL connections enforced | ☐ | |
| Network access restricted | ☐ | |
| Connection pooling enabled | ☐ | |
| Query logging enabled | ☐ | |
| Backups encrypted | ☐ | |
| Backup access restricted | ☐ | |
| Public schema access revoked | ☐ | |
| No default passwords | ☐ | |

---

## 4. Network Security

### 4.1 TLS Configuration

```nginx
# nginx TLS configuration
server {
    listen 443 ssl http2;
    server_name api.smartmed.com;

    # Modern SSL configuration
    ssl_certificate /etc/letsencrypt/live/api.smartmed.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.smartmed.com/privkey.pem;
    
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern configuration - TLS 1.3 only
    ssl_protocols TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
}
```

### 4.2 CORS Configuration

```typescript
// Strict CORS for production
const corsOptions = {
  origin: process.env.FRONTEND_URL, // Only allow frontend domain
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 600, // 10 minutes
};

app.use(cors(corsOptions));
```

### 4.3 VPC/Network Segmentation

```
┌─────────────────────────────────────────────────────────────┐
│                        VPC (10.0.0.0/16)                    │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              Public Subnet (10.0.1.0/24)            │  │
│   │   ┌─────────────┐  ┌─────────────┐                  │  │
│   │   │     ALB     │  │   Bastion   │                  │  │
│   │   └──────┬──────┘  └─────────────┘                  │  │
│   └──────────┼──────────────────────────────────────────┘  │
│              │                                              │
│   ┌──────────┼──────────────────────────────────────────┐  │
│   │          │   Private Subnet (10.0.2.0/24)           │  │
│   │   ┌──────▼──────┐  ┌─────────────┐                  │  │
│   │   │  API Server │  │  Web Server │                  │  │
│   │   └──────┬──────┘  └─────────────┘                  │  │
│   └──────────┼──────────────────────────────────────────┘  │
│              │                                              │
│   ┌──────────┼──────────────────────────────────────────┐  │
│   │          │   Database Subnet (10.0.3.0/24)          │  │
│   │   ┌──────▼──────┐  ┌─────────────┐                  │  │
│   │   │  PostgreSQL │  │    Redis    │                  │  │
│   │   └─────────────┘  └─────────────┘                  │  │
│   └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Network Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| TLS 1.2/1.3 only | ☐ | |
| Strong cipher suites | ☐ | |
| HSTS enabled | ☐ | |
| Certificate auto-renewal | ☐ | |
| WAF configured | ☐ | |
| DDoS protection | ☐ | |
| VPC segmentation | ☐ | |
| Security groups configured | ☐ | |
| Database not public | ☐ | |
| Internal traffic encrypted | ☐ | |

---

## 5. Authentication & Access Control

### 5.1 Password Policy

```typescript
// Enforce strong passwords
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
  preventReuse: 5, // Remember last 5 passwords
  maxAge: 90, // Days before requiring change
};

// bcrypt configuration
const BCRYPT_ROUNDS = 12; // Minimum for production
```

### 5.2 JWT Configuration

```typescript
// Short-lived access tokens
const JWT_CONFIG = {
  accessTokenExpiry: '15m',      // 15 minutes
  refreshTokenExpiry: '7d',      // 7 days
  algorithm: 'RS256',            // Use RSA for production
  issuer: 'smartmed',
  audience: 'smartmed-api',
};

// Token validation
const verifyToken = (token: string) => {
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'smartmed',
    audience: 'smartmed-api',
    clockTolerance: 30, // 30 seconds tolerance
  });
};
```

### 5.3 Session Security

```typescript
// Secure cookie configuration
const cookieOptions = {
  httpOnly: true,        // Prevent XSS access
  secure: true,          // HTTPS only
  sameSite: 'strict',    // Prevent CSRF
  domain: '.smartmed.com',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
```

### 5.4 MFA Configuration

```typescript
// TOTP configuration
const MFA_CONFIG = {
  issuer: 'SmartMed',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  window: 1,  // Allow 1 period before/after
};

// Rate limit MFA attempts
const mfaRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many MFA attempts',
});
```

### 5.5 Access Control Checklist

| Item | Status | Notes |
|------|--------|-------|
| Strong password policy | ☐ | |
| Account lockout enabled | ☐ | After 5 failed attempts |
| MFA available | ☐ | |
| MFA required for admins | ☐ | |
| Session timeout configured | ☐ | |
| Token rotation enabled | ☐ | |
| RBAC implemented | ☐ | |
| Least privilege applied | ☐ | |
| Service accounts secured | ☐ | |
| API keys rotated regularly | ☐ | |

---

## 6. Encryption

### 6.1 Encryption Standards

| Data Type | At Rest | In Transit | Algorithm |
|-----------|---------|------------|-----------|
| Passwords | Hashed | HTTPS | bcrypt (12+ rounds) |
| PHI | Encrypted | HTTPS | AES-256-GCM |
| MFA secrets | Encrypted | HTTPS | AES-256-GCM |
| Session tokens | Hashed | HTTPS | SHA-256 |
| Backups | Encrypted | Encrypted | AES-256 |
| Logs | Encrypted | Encrypted | AES-256 |

### 6.2 Key Management

```typescript
// Key derivation for field-level encryption
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';

const ENCRYPTION_KEY = process.env.PHI_ENCRYPTION_KEY; // 32 bytes

async function encryptPHI(data: string): Promise<string> {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function decryptPHI(encryptedData: string): Promise<string> {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  const decipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 6.3 Key Rotation

```bash
# Generate new encryption key
NEW_KEY=$(openssl rand -hex 32)

# Key rotation steps:
# 1. Add new key to environment (KEY_V2)
# 2. Deploy application with dual-key support
# 3. Re-encrypt all data with new key
# 4. Remove old key
```

### 6.4 Encryption Checklist

| Item | Status | Notes |
|------|--------|-------|
| TLS 1.3 for transit | ☐ | |
| Database encryption (TDE) | ☐ | |
| S3 encryption enabled | ☐ | |
| Backup encryption | ☐ | |
| Key rotation process | ☐ | |
| HSM for key storage | ☐ | Optional but recommended |
| No hardcoded keys | ☐ | |
| PHI field encryption | ☐ | |

---

## 7. Logging & Monitoring

### 7.1 Security Logging

```typescript
// Log security-relevant events
interface SecurityLog {
  timestamp: Date;
  event: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details: Record<string, any>;
}

const securityEvents = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'LOGOUT',
  'PASSWORD_CHANGE',
  'PASSWORD_RESET_REQUEST',
  'MFA_ENABLED',
  'MFA_DISABLED',
  'SESSION_EXPIRED',
  'TOKEN_REFRESH',
  'PERMISSION_DENIED',
  'SUSPICIOUS_ACTIVITY',
  'PHI_ACCESS',
  'PHI_EXPORT',
];
```

### 7.2 Audit Logging

```typescript
// HIPAA-compliant audit logging
const auditLog = async (entry: AuditEntry) => {
  await prisma.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      details: entry.details,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      timestamp: new Date(),
      // Calculate retention date (6 years for HIPAA)
      retentionDate: addYears(new Date(), 6),
    },
  });
};
```

### 7.3 Alerting Rules

| Event | Threshold | Alert Level | Action |
|-------|-----------|-------------|--------|
| Failed logins | 5 in 15 min | Warning | Notify security |
| Failed logins | 10 in 15 min | Critical | Lock account, notify |
| Unusual access time | Off-hours | Warning | Review |
| Mass data export | > 100 records | Warning | Review |
| PHI access | Bulk access | Warning | Review |
| Admin actions | Any | Info | Log |
| Permission denied | > 10/min | Warning | Investigate |

### 7.4 Monitoring Checklist

| Item | Status | Notes |
|------|--------|-------|
| Centralized logging | ☐ | |
| Log retention (6 years) | ☐ | HIPAA requirement |
| Security alerting | ☐ | |
| Failed login monitoring | ☐ | |
| PHI access logging | ☐ | |
| Admin action logging | ☐ | |
| Real-time dashboards | ☐ | |
| Incident response alerts | ☐ | |
| Log integrity protection | ☐ | |
| Regular log review | ☐ | |

---

## 8. Incident Response Preparation

### 8.1 Response Team Contacts

| Role | Primary | Backup | Contact |
|------|---------|--------|---------|
| Security Lead | | | |
| Technical Lead | | | |
| Legal Counsel | | | |
| Communications | | | |

### 8.2 Incident Classification

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| P1 | Active breach | Immediate | Data exfiltration |
| P2 | Potential breach | < 1 hour | Suspicious activity |
| P3 | Security issue | < 4 hours | Vulnerability found |
| P4 | Low risk | < 24 hours | Policy violation |

### 8.3 Response Procedures

See [SECURITY_INCIDENT_RESPONSE.md](./SECURITY_INCIDENT_RESPONSE.md) for detailed procedures.

### 8.4 Preparation Checklist

| Item | Status | Notes |
|------|--------|-------|
| Incident response plan | ☐ | |
| Contact list current | ☐ | |
| Forensics tools ready | ☐ | |
| Backup isolation procedure | ☐ | |
| Communication templates | ☐ | |
| Legal contacts ready | ☐ | |
| Breach notification process | ☐ | |
| Post-incident review process | ☐ | |

---

## 9. Compliance Checklist

### 9.1 HIPAA Technical Safeguards

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Access Control | ☐ | RBAC, unique user IDs |
| Audit Controls | ☐ | Comprehensive logging |
| Integrity | ☐ | Input validation, checksums |
| Authentication | ☐ | MFA, strong passwords |
| Transmission Security | ☐ | TLS 1.3, encrypted APIs |

### 9.2 Security Assessment Schedule

| Activity | Frequency | Last Done | Next Due |
|----------|-----------|-----------|----------|
| Vulnerability scan | Monthly | | |
| Penetration test | Annual | | |
| Code review | Continuous | | |
| Dependency audit | Weekly | | |
| Access review | Quarterly | | |
| Backup test | Monthly | | |
| DR test | Annual | | |

### 9.3 Documentation Requirements

| Document | Status | Last Updated |
|----------|--------|--------------|
| Security policies | ☐ | |
| Incident response plan | ☐ | |
| Business continuity plan | ☐ | |
| Risk assessment | ☐ | |
| Vendor assessments | ☐ | |
| Training records | ☐ | |

---

## Final Security Sign-Off

| Reviewer | Role | Date | Signature |
|----------|------|------|-----------|
| | Security Lead | | |
| | Infrastructure | | |
| | Compliance | | |
| | CISO | | |

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | January 6, 2026 | Initial security hardening guide | Security Team |
