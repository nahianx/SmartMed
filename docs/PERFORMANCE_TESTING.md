# SmartMed Performance Testing Report

**Version:** 1.0  
**Date:** January 6, 2026  
**Status:** Framework Ready

---

## Executive Summary

This document establishes the performance testing framework for SmartMed, including metrics, budgets, testing methodology, and optimization recommendations. Healthcare applications must meet strict performance standards to ensure reliable access to critical medical information.

### Performance Budget Summary

| Metric | Budget | Healthcare Requirement |
|--------|--------|------------------------|
| LCP (Largest Contentful Paint) | < 2.5s | Critical for emergency access |
| FID (First Input Delay) | < 100ms | Immediate response required |
| CLS (Cumulative Layout Shift) | < 0.1 | Prevent mis-clicks on medical data |
| TTI (Time to Interactive) | < 3.5s | Quick access to patient info |
| Total Bundle Size (gzipped) | < 300KB | Mobile network reliability |
| API Response Time (p95) | < 500ms | Real-time medical decisions |

---

## Table of Contents

1. [Performance Metrics](#1-performance-metrics)
2. [Testing Tools Setup](#2-testing-tools-setup)
3. [Lighthouse Audits](#3-lighthouse-audits)
4. [Core Web Vitals Analysis](#4-core-web-vitals-analysis)
5. [Bundle Analysis](#5-bundle-analysis)
6. [API Performance](#6-api-performance)
7. [Database Performance](#7-database-performance)
8. [Load Testing](#8-load-testing)
9. [Performance Budgets](#9-performance-budgets)
10. [Optimization Recommendations](#10-optimization-recommendations)

---

## 1. Performance Metrics

### 1.1 Key Metrics Definitions

| Metric | Definition | Target | Measurement |
|--------|------------|--------|-------------|
| **LCP** | Time until largest content element visible | < 2.5s | Lighthouse, CrUX |
| **FID** | Delay from first interaction to response | < 100ms | CrUX, RUM |
| **CLS** | Visual stability score | < 0.1 | Lighthouse, CrUX |
| **TTFB** | Time to first byte from server | < 200ms | WebPageTest |
| **TTI** | Time until page fully interactive | < 3.5s | Lighthouse |
| **TBT** | Total blocking time during load | < 200ms | Lighthouse |
| **FCP** | First contentful paint | < 1.8s | Lighthouse |

### 1.2 Healthcare-Specific Requirements

| Scenario | Performance Requirement | Rationale |
|----------|------------------------|-----------|
| Emergency Patient Lookup | < 2s TTI | Critical care decisions |
| Prescription Retrieval | < 3s full load | Pharmacy workflows |
| Dashboard Load | < 4s complete | Provider efficiency |
| Mobile on 3G | < 5s usable | Rural healthcare access |
| Queue Position Update | < 100ms latency | Real-time accuracy |

---

## 2. Testing Tools Setup

### 2.1 Required Tools

```bash
# Install global testing tools
npm install -g lighthouse
npm install -g clinic
npm install -g autocannon

# Project dependencies
npm install --save-dev @next/bundle-analyzer
npm install --save-dev web-vitals
```

### 2.2 Lighthouse Configuration

Create `lighthouserc.js` in project root:

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/login',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/appointments',
        'http://localhost:3000/prescriptions',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### 2.3 Bundle Analyzer Configuration

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // existing config
});
```

Run bundle analyzer:
```bash
ANALYZE=true npm run build
```

---

## 3. Lighthouse Audits

### 3.1 Testing Procedure

```bash
# Single page audit
lighthouse http://localhost:3000 --output=html --output-path=./reports/lighthouse-home.html

# Multiple pages with config
lhci autorun --config=lighthouserc.js

# Mobile simulation
lighthouse http://localhost:3000 --preset=perf --emulated-form-factor=mobile
```

### 3.2 Pages to Audit

| Page | URL | Priority | Notes |
|------|-----|----------|-------|
| Home | `/` | HIGH | First impression |
| Login | `/login` | HIGH | Entry point |
| Dashboard | `/dashboard` | HIGH | Main interface |
| Appointments | `/appointments` | HIGH | Frequent use |
| New Appointment | `/appointments/new` | HIGH | Critical flow |
| Prescriptions | `/prescriptions` | HIGH | Medical data |
| Patient Profile | `/profile` | MEDIUM | Settings |
| Doctor Search | `/doctors` | HIGH | Discovery |
| Queue | `/queue` | MEDIUM | Real-time |

### 3.3 Lighthouse Report Template

```markdown
## Lighthouse Audit Results

**Page:** [URL]
**Date:** [Date]
**Device:** [Desktop/Mobile]

### Scores
- Performance: __/100
- Accessibility: __/100
- Best Practices: __/100
- SEO: __/100

### Core Web Vitals
- LCP: ___ms
- FID: ___ms (simulated as TBT)
- CLS: ___

### Opportunities
| Opportunity | Savings | Priority |
|------------|---------|----------|
| [Issue] | [Savings] | [Priority] |

### Diagnostics
| Issue | Details |
|-------|---------|
| [Diagnostic] | [Details] |
```

---

## 4. Core Web Vitals Analysis

### 4.1 Real User Monitoring Setup

```typescript
// apps/web/src/lib/vitals.ts
import { getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';

type MetricName = 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB';

interface Metric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

function sendToAnalytics(metric: Metric) {
  // Send to your analytics endpoint
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    page: window.location.pathname,
    timestamp: Date.now(),
  });

  // Use sendBeacon for reliability
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', body);
  } else {
    fetch('/api/analytics/vitals', {
      method: 'POST',
      body,
      keepalive: true,
    });
  }
}

export function initVitals() {
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getLCP(sendToAnalytics);
  getFCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}
```

### 4.2 Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤ 2.5s | 2.5s - 4s | > 4s |
| FID | ≤ 100ms | 100ms - 300ms | > 300ms |
| CLS | ≤ 0.1 | 0.1 - 0.25 | > 0.25 |
| FCP | ≤ 1.8s | 1.8s - 3s | > 3s |
| TTFB | ≤ 200ms | 200ms - 600ms | > 600ms |

### 4.3 Measurement Schedule

| Activity | Frequency | Tool |
|----------|-----------|------|
| Lighthouse CI | Every PR | GitHub Actions |
| RUM Collection | Continuous | web-vitals |
| CrUX Analysis | Monthly | PageSpeed Insights |
| Manual Audit | Bi-weekly | Lighthouse DevTools |

---

## 5. Bundle Analysis

### 5.1 Current Bundle Status

*Run analysis to populate*

```bash
# Generate bundle report
ANALYZE=true npm run build --workspace=apps/web
```

### 5.2 Bundle Size Budget

| Bundle | Budget (gzipped) | Status |
|--------|------------------|--------|
| **Main (Framework)** | < 100KB | ⏳ TBD |
| **Vendor Chunk** | < 150KB | ⏳ TBD |
| **Per-Route Average** | < 50KB | ⏳ TBD |
| **Total Initial** | < 300KB | ⏳ TBD |

### 5.3 Common Bundle Optimizations

| Issue | Solution | Impact |
|-------|----------|--------|
| Large icons | Use react-icons/specific | ~50KB savings |
| Date library | Use date-fns instead of moment | ~70KB savings |
| UI Library | Tree-shake unused components | Variable |
| Charts | Lazy load chart components | ~100KB deferred |
| PDF generation | Dynamic import on demand | ~200KB deferred |

### 5.4 Code Splitting Strategy

```typescript
// Dynamic imports for heavy components
const PrescriptionPDF = dynamic(
  () => import('@/components/PrescriptionPDF'),
  { loading: () => <Skeleton />, ssr: false }
);

const AppointmentCalendar = dynamic(
  () => import('@/components/AppointmentCalendar'),
  { loading: () => <CalendarSkeleton /> }
);

const DataChart = dynamic(
  () => import('@/components/DataChart'),
  { ssr: false }
);
```

---

## 6. API Performance

### 6.1 API Response Time Targets

| Endpoint Category | Target p50 | Target p95 | Target p99 |
|-------------------|------------|------------|------------|
| Auth (login) | 200ms | 400ms | 600ms |
| Read operations | 100ms | 300ms | 500ms |
| Write operations | 150ms | 400ms | 700ms |
| Search/filter | 200ms | 500ms | 800ms |
| File upload | 500ms | 1500ms | 3000ms |
| Report generation | 300ms | 800ms | 1500ms |

### 6.2 API Testing with Autocannon

```bash
# Install autocannon globally
npm install -g autocannon

# Test GET endpoint
autocannon -c 50 -d 30 http://localhost:4000/api/health

# Test authenticated endpoint (with token)
autocannon -c 50 -d 30 -H "Authorization=Bearer TOKEN" http://localhost:4000/api/appointments

# More detailed options
autocannon \
  --connections 100 \
  --duration 60 \
  --json \
  http://localhost:4000/api/doctors > api-load-test.json
```

### 6.3 API Performance Template

```markdown
## API Endpoint Performance Test

**Endpoint:** [Method] [Path]
**Date:** [Date]
**Connections:** [Number]
**Duration:** [Seconds]

### Results
- Requests/sec: ___
- Latency (p50): ___ms
- Latency (p95): ___ms
- Latency (p99): ___ms
- Errors: ___
- Timeouts: ___

### Analysis
[Observations and recommendations]
```

### 6.4 Key API Endpoints to Test

| Endpoint | Method | Priority | Notes |
|----------|--------|----------|-------|
| `/api/health` | GET | HIGH | Baseline |
| `/api/auth/login` | POST | HIGH | Auth flow |
| `/api/appointments` | GET | HIGH | List load |
| `/api/appointments` | POST | HIGH | Booking |
| `/api/prescriptions` | GET | HIGH | Medical data |
| `/api/doctors` | GET | HIGH | Search |
| `/api/patients/me` | GET | HIGH | Profile |
| `/api/queue/position` | GET | HIGH | Real-time |
| `/api/notifications` | GET | MEDIUM | Updates |

---

## 7. Database Performance

### 7.1 Query Performance Targets

| Query Type | Target | Notes |
|------------|--------|-------|
| Single record by ID | < 10ms | Indexed lookup |
| List with pagination | < 50ms | With includes |
| Complex search | < 100ms | Full-text or filtered |
| Aggregations | < 200ms | Dashboard stats |
| Report generation | < 500ms | Complex joins |

### 7.2 Database Monitoring Queries

```sql
-- Check slow queries (PostgreSQL)
SELECT 
  query,
  calls,
  total_time / 1000 as total_seconds,
  mean_time / 1000 as mean_seconds
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Table sizes
SELECT 
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Index usage
SELECT 
  schemaname, tablename, indexname,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 7.3 Prisma Query Optimization

```typescript
// Enable query logging in development
// apps/api/src/config/prisma.ts
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'warn', 'error']
    : ['error'],
});

// Use select to minimize data transfer
const patients = await prisma.patient.findMany({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    // Only select needed fields
  },
  where: { /* ... */ },
  take: 20,
});

// Batch related queries with include
const appointments = await prisma.appointment.findMany({
  include: {
    patient: { select: { firstName: true, lastName: true } },
    doctor: { select: { firstName: true, lastName: true } },
  },
});
```

---

## 8. Load Testing

### 8.1 Load Test Scenarios

| Scenario | Users | Duration | Description |
|----------|-------|----------|-------------|
| **Baseline** | 10 | 5 min | Normal operation |
| **Standard** | 50 | 15 min | Expected peak |
| **Peak** | 100 | 15 min | Double expected |
| **Stress** | 200 | 10 min | Breaking point |
| **Soak** | 50 | 2 hours | Memory leaks |

### 8.2 K6 Load Test Script

```javascript
// load-test.js
import http from 'k6/http';
import { sleep, check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');

export const options = {
  stages: [
    { duration: '2m', target: 20 },  // Ramp up
    { duration: '5m', target: 50 },  // Hold
    { duration: '2m', target: 100 }, // Peak
    { duration: '3m', target: 50 },  // Ramp down
    { duration: '2m', target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:4000';

export default function () {
  // Login flow
  const loginStart = Date.now();
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, 
    JSON.stringify({
      email: 'test@example.com',
      password: 'password123',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  loginDuration.add(Date.now() - loginStart);
  
  check(loginRes, {
    'login succeeded': (r) => r.status === 200,
    'has token': (r) => r.json('accessToken') !== undefined,
  });
  
  errorRate.add(loginRes.status !== 200);
  
  if (loginRes.status === 200) {
    const token = loginRes.json('accessToken');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    
    // Get appointments
    const appointmentsRes = http.get(`${BASE_URL}/api/appointments`, { headers });
    check(appointmentsRes, {
      'appointments loaded': (r) => r.status === 200,
    });
    
    // Get prescriptions
    const prescriptionsRes = http.get(`${BASE_URL}/api/prescriptions`, { headers });
    check(prescriptionsRes, {
      'prescriptions loaded': (r) => r.status === 200,
    });
  }
  
  sleep(1);
}
```

Run with: `k6 run load-test.js`

### 8.3 Load Test Results Template

```markdown
## Load Test Results

**Scenario:** [Name]
**Date:** [Date]
**Duration:** [Duration]
**Virtual Users:** [Min-Max]

### Summary
- Total Requests: ___
- Requests/sec: ___
- Success Rate: ___%
- Error Rate: ___%

### Latency
| Metric | Value |
|--------|-------|
| p50 | ___ms |
| p95 | ___ms |
| p99 | ___ms |
| Max | ___ms |

### Thresholds
| Threshold | Target | Actual | Pass/Fail |
|-----------|--------|--------|-----------|
| p95 < 500ms | 500ms | ___ms | ✅/❌ |
| Error rate < 1% | 1% | ___% | ✅/❌ |

### Observations
[Analysis and recommendations]
```

---

## 9. Performance Budgets

### 9.1 Budget Definitions

```json
{
  "budgets": {
    "frontend": {
      "lighthouse": {
        "performance": 80,
        "firstContentfulPaint": 1800,
        "largestContentfulPaint": 2500,
        "totalBlockingTime": 200,
        "cumulativeLayoutShift": 0.1,
        "speedIndex": 3400
      },
      "bundle": {
        "mainChunk": "100KB",
        "totalInitial": "300KB",
        "perRouteAverage": "50KB"
      }
    },
    "api": {
      "responseTime": {
        "p50": 100,
        "p95": 500,
        "p99": 1000
      },
      "throughput": {
        "minimum": 100
      }
    },
    "database": {
      "queryTime": {
        "simple": 10,
        "complex": 100,
        "report": 500
      }
    }
  }
}
```

### 9.2 Budget Enforcement in CI

```yaml
# .github/workflows/performance.yml
name: Performance Budget Check

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build --workspace=apps/web
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: './lighthouserc.js'
          uploadArtifacts: true
          temporaryPublicStorage: true

  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - name: Check bundle size
        uses: preactjs/compressed-size-action@v2
        with:
          repo-token: "${{ secrets.GITHUB_TOKEN }}"
```

---

## 10. Optimization Recommendations

### 10.1 Quick Wins (High Impact, Low Effort)

| Optimization | Impact | Effort | Metric Improved |
|--------------|--------|--------|-----------------|
| Enable Gzip/Brotli | HIGH | LOW | TTFB, Bundle size |
| Add image optimization | HIGH | LOW | LCP |
| Lazy load below-fold | MEDIUM | LOW | TTI |
| Preconnect critical origins | MEDIUM | LOW | TTFB |
| Cache static assets | HIGH | LOW | Repeat visits |

### 10.2 Medium-Term Improvements

| Optimization | Impact | Effort | Metric Improved |
|--------------|--------|--------|-----------------|
| Code splitting by route | HIGH | MEDIUM | TTI, Bundle |
| Virtualize long lists | HIGH | MEDIUM | TTI, Memory |
| Service Worker caching | HIGH | MEDIUM | Offline, Speed |
| Database query optimization | HIGH | MEDIUM | API latency |
| Connection pooling | MEDIUM | MEDIUM | API throughput |

### 10.3 Long-Term Investments

| Optimization | Impact | Effort | Metric Improved |
|--------------|--------|--------|-----------------|
| CDN for static assets | HIGH | HIGH | Global latency |
| Read replicas | HIGH | HIGH | Database scale |
| Redis caching layer | HIGH | HIGH | API latency |
| Edge computing | MEDIUM | HIGH | Global latency |
| Micro-frontends | MEDIUM | HIGH | Team scalability |

### 10.4 Healthcare-Specific Optimizations

| Scenario | Optimization | Rationale |
|----------|--------------|-----------|
| Emergency access | Prefetch critical data | Reduce TTI |
| Offline clinics | Service worker + IndexedDB | Unreliable networks |
| Mobile usage | Compress images aggressively | Data costs |
| Complex forms | Chunk validation | Responsive UX |
| Long sessions | Efficient state management | Memory stability |

---

## 11. Performance Testing Schedule

| Phase | Activity | Duration | Status |
|-------|----------|----------|--------|
| 1 | Lighthouse baseline audit | 1 day | ⏳ Pending |
| 2 | Bundle analysis | 0.5 days | ⏳ Pending |
| 3 | API performance testing | 1 day | ⏳ Pending |
| 4 | Database query analysis | 0.5 days | ⏳ Pending |
| 5 | Load testing | 1 day | ⏳ Pending |
| 6 | Optimization implementation | TBD | ⏳ Pending |
| 7 | Performance regression testing | 1 day | ⏳ Pending |

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | January 6, 2026 | Initial performance testing framework | QA Team |
