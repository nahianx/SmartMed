# SmartMed API Quick Test Script

## Prerequisites Setup

### 1. Import Postman Files

1. **Import Collection:**
   - Open Postman
   - Click **Import** → Select `SmartMed-API-Collection.postman_collection.json`

2. **Import Environment:**
   - Click **Import** → Select `SmartMed-Development.postman_environment.json`
   - Select the **SmartMed Development Environment** from the environment dropdown

### 2. Start API Server

```bash
# Navigate to API directory
cd d:/SmartMed/apps/api

# Start development server
npm run dev
```

Verify server is running: http://localhost:3001/api/health

## 🚀 Quick Start Testing

### **Test Sequence 1: Basic Flow (5 minutes)**

Run these requests in order:

1. ✅ **Health & Status** → **Get CSRF Token**
2. ✅ **Authentication** → **Register Doctor** 
3. ✅ **Authentication** → **Login Doctor**
4. ✅ **User Management** → **Get Current User**
5. ✅ **Dashboard** → **Doctor Dashboard**
6. ✅ **Authentication** → **Logout**

**Expected Result:** All requests return 200/201 status codes

### **Test Sequence 2: Patient Flow (3 minutes)**

1. ✅ **Authentication** → **Register Patient**
2. ✅ **Authentication** → **Login Patient** 
3. ✅ **Dashboard** → **Patient Dashboard**

### **Test Sequence 3: Security Tests (3 minutes)**

1. ✅ **Error Testing** → **Access Without Token** (expect 401)
2. ✅ **Error Testing** → **Invalid Login** (expect 401) 
3. ✅ **Error Testing** → **Invalid CSRF Token** (expect 403)

## 🔧 Manual Variable Setup

If automatic variable setting fails, manually set these in Environment:

| Variable | How to Get | Example |
|----------|------------|---------|
| `csrfToken` | From "Get CSRF Token" response | `abc123...` |
| `accessToken` | From any login response | `eyJhbGc...` |
| `doctorId` | From doctor registration response | `550e8400...` |
| `resetToken` | From password reset email | `def456...` |
| `verificationToken` | From verification email | `ghi789...` |

## 🐛 Troubleshooting

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Connection refused | Start API server: `npm run dev` |
| CSRF token missing | Run "Get CSRF Token" first |
| 401 Unauthorized | Login and check accessToken variable |
| Database error | Check PostgreSQL is running |
| Email tokens invalid | Check email and copy exact token |

### Debug Steps

1. **Check Server Status:**
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Verify Environment:**
   - Environment should be "SmartMed Development Environment"
   - Check variable values in Environment settings

3. **Check Logs:**
   - API server console for error messages
   - Postman console for request/response details

## 📊 Test Results Validation

### Success Criteria

| Endpoint | Expected Status | Key Response Fields |
|----------|----------------|---------------------|
| Health Check | 200 | `status: "healthy"` |
| Get CSRF | 200 | `csrfToken` |
| Register | 201 | `user.id`, `accessToken` |
| Login | 200 | `accessToken`, `user` |
| Dashboard | 200 | `user`, `stats` |
| Logout | 200 | `message` |

### Error Testing

| Test | Expected Status | Expected Error |
|------|----------------|----------------|
| Invalid Login | 401 | "Invalid credentials" |
| No Auth Token | 401 | "Authentication required" |
| Wrong Role | 403 | "Insufficient permissions" |
| Invalid CSRF | 403 | "CSRF token invalid" |
| Rate Limit | 429 | "Too many requests" |

## 🎯 Advanced Testing

### Load Testing Sequence

1. Run Collection Runner with:
   - Iterations: 10
   - Delay: 100ms
   - Data file with test users

2. Monitor for:
   - Response time < 2000ms
   - No 5xx errors
   - Consistent behavior

### Security Validation

1. **Authentication Tests:**
   - ✅ Protected endpoints require valid tokens
   - ✅ Expired tokens rejected
   - ✅ Role-based access enforced

2. **Input Validation Tests:**
   - ✅ SQL injection prevented
   - ✅ XSS attacks blocked
   - ✅ Invalid data rejected

3. **Rate Limiting Tests:**
   - ✅ Login attempts limited
   - ✅ Password reset limited
   - ✅ Registration limited

## 📈 Performance Benchmarks

### Target Performance

| Metric | Target | Acceptable |
|--------|---------|------------|
| Health Check | < 50ms | < 100ms |
| Registration | < 500ms | < 1000ms |
| Login | < 300ms | < 600ms |
| Dashboard | < 200ms | < 500ms |
| Database Query | < 100ms | < 200ms |

### Monitoring

Use Postman's built-in performance tests:

```javascript
pm.test("Response time is less than 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

## 🚀 Production Readiness Checklist

Before deploying to production, verify:

- [ ] All authentication flows working
- [ ] CSRF protection active
- [ ] Rate limiting configured
- [ ] Input validation working
- [ ] Error handling proper
- [ ] Logging implemented
- [ ] Performance acceptable
- [ ] Security headers set
- [ ] Database backups configured
- [ ] Monitoring alerts set up

## 📝 Test Documentation

### Recording Test Results

1. **Export Collection Results** (JSON/HTML)
2. **Document Issues Found**
3. **Track Performance Metrics**
4. **Verify Security Compliance**

### Continuous Testing

Set up Postman Monitors for:
- Daily health checks
- Weekly full test suite
- Performance regression detection
- Security vulnerability scanning

---

**Happy Testing! 🎉**

Your SmartMed authentication API is now ready for comprehensive testing with this Postman collection.