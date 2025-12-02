# SmartMed API Testing Guide

## Overview

This guide provides comprehensive instructions for testing the SmartMed authentication API using the provided Postman collection. The collection includes all endpoints, authentication flows, and error scenarios.

## Quick Setup

### 1. Import the Collection

1. Open Postman
2. Click **Import** button
3. Select `SmartMed-API-Collection.postman_collection.json`
4. The collection will appear in your Postman workspace

### 2. Set Up Environment Variables

The collection uses the following variables (automatically managed):

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `baseUrl` | API base URL | `http://localhost:3001` |
| `accessToken` | JWT access token | (auto-set after login) |
| `refreshToken` | Refresh token | (auto-set after login) |
| `csrfToken` | CSRF protection token | (auto-set after first request) |
| `doctorId` | Doctor user ID | (auto-set after registration) |
| `patientId` | Patient user ID | (auto-set after registration) |
| `resetToken` | Password reset token | (manual - from email) |
| `verificationToken` | Email verification token | (manual - from email) |

### 3. Start Your API Server

```bash
# Make sure your SmartMed API is running
cd d:/SmartMed/apps/api
npm run dev
```

The API should be available at `http://localhost:3001`

## Testing Workflows

### 🔄 Complete Authentication Flow

#### **Workflow 1: Doctor Registration & Login**

1. **Get CSRF Token**
   - Run: `Health & Status → Get CSRF Token`
   - ✅ Verify: `csrfToken` variable is set

2. **Register Doctor**
   - Run: `Authentication → Register Doctor`
   - ✅ Verify: Returns 201 status with user data
   - ✅ Verify: `doctorId` and `accessToken` variables are set

3. **Login Doctor**
   - Run: `Authentication → Login Doctor`
   - ✅ Verify: Returns 200 status with new access token
   - ✅ Verify: `accessToken` variable is updated

4. **Access Doctor Dashboard**
   - Run: `Dashboard → Doctor Dashboard`
   - ✅ Verify: Returns doctor-specific data

5. **Logout**
   - Run: `Authentication → Logout`
   - ✅ Verify: Returns 200 status

#### **Workflow 2: Patient Registration & Login**

1. **Register Patient**
   - Run: `Authentication → Register Patient`
   - ✅ Verify: Returns 201 status
   - ✅ Verify: `patientId` variable is set

2. **Login Patient**
   - Run: `Authentication → Login Patient`
   - ✅ Verify: Returns 200 status

3. **Access Patient Dashboard**
   - Run: `Dashboard → Patient Dashboard`
   - ✅ Verify: Returns patient-specific data

#### **Workflow 3: Password Reset Flow**

1. **Request Password Reset**
   - Run: `Password Management → Request Password Reset`
   - ✅ Verify: Returns 200 status
   - 📧 Check email for reset token

2. **Set Reset Token**
   - Manually set `resetToken` variable from email
   - In Postman: Environment → Variables → `resetToken`

3. **Complete Password Reset**
   - Run: `Password Management → Complete Password Reset`
   - ✅ Verify: Returns 200 status

4. **Login with New Password**
   - Update password in login request
   - Run: `Authentication → Login Doctor/Patient`

#### **Workflow 4: Email Verification Flow**

1. **After Registration** (verification email sent automatically)
   - 📧 Check email for verification token

2. **Set Verification Token**
   - Manually set `verificationToken` variable from email

3. **Verify Email**
   - Run: `Email Verification → Verify Email`
   - ✅ Verify: Returns 200 status

4. **Resend Verification** (if needed)
   - Run: `Email Verification → Resend Verification Email`

### 🔒 Security Testing

#### **Test 1: CSRF Protection**

1. **Get Valid CSRF Token**
   - Run: `Health & Status → Get CSRF Token`

2. **Test Invalid CSRF**
   - Run: `Error Testing → Invalid CSRF Token`
   - ✅ Verify: Returns 403 Forbidden

#### **Test 2: Authentication Requirements**

1. **Access Protected Endpoint Without Token**
   - Run: `Error Testing → Access Without Token`
   - ✅ Verify: Returns 401 Unauthorized

2. **Test Role-Based Access**
   - Login as Patient
   - Try: `Dashboard → Doctor Dashboard`
   - ✅ Verify: Returns 403 Forbidden (role mismatch)

#### **Test 3: Rate Limiting**

1. **Trigger Rate Limit**
   - Run: `Error Testing → Rate Limit Test` 
   - Repeat quickly 5+ times
   - ✅ Verify: Eventually returns 429 Too Many Requests

#### **Test 4: Input Validation**

1. **Test Invalid Login**
   - Run: `Error Testing → Invalid Login`
   - ✅ Verify: Returns 401 with proper error message

2. **Test Duplicate Registration**
   - Run: `Error Testing → Duplicate Registration`
   - ✅ Verify: Returns 409 Conflict

### 🎯 Advanced Testing Scenarios

#### **Scenario 1: Token Refresh Flow**

1. **Login and Get Token**
   - Run any login request
   - Wait 15+ minutes (token expiry)

2. **Test Expired Token**
   - Try accessing protected endpoint
   - Should receive 401 response

3. **Refresh Token**
   - Run: `Authentication → Refresh Token`
   - ✅ Verify: New access token received

4. **Use New Token**
   - Retry protected endpoint
   - ✅ Verify: Access granted with new token

#### **Scenario 2: Google OAuth Testing**

1. **Get Google ID Token**
   - Use Google's OAuth 2.0 Playground
   - Or implement frontend Google Sign-In

2. **Update Request**
   - Replace `GOOGLE_ID_TOKEN_HERE` in `Google OAuth Login`
   - Set appropriate role (DOCTOR/PATIENT)

3. **Test OAuth Flow**
   - Run: `Authentication → Google OAuth Login`
   - ✅ Verify: User created/logged in successfully

#### **Scenario 3: Admin Endpoints Testing**

**Note:** Admin endpoints require ADMIN role. You'll need to:

1. **Create Admin User** (via database or seed script)
2. **Login as Admin**
3. **Test Admin Functions**:
   - Get All Users
   - Get User by ID
   - Update User
   - Delete User

## Test Data Management

### 🧹 Cleanup Between Tests

Use these strategies to maintain clean test data:

#### **Option 1: Database Reset**
```sql
-- Reset database to clean state
TRUNCATE TABLE "UserSession", "PasswordReset", "EmailVerification", "User" RESTART IDENTITY CASCADE;
```

#### **Option 2: Unique Test Data**
The collection uses random data generators:
- `{{$randomFirstName}}` - Random first name
- `{{$randomLastName}}` - Random last name  
- `{{$randomEmail}}` - Random email address

#### **Option 3: Test User Accounts**

Create dedicated test accounts:

```json
{
  "email": "doctor.test@smartmed.com",
  "password": "SecurePass123!",
  "fullName": "Test Doctor",
  "role": "DOCTOR"
}
```

```json
{
  "email": "patient.test@smartmed.com", 
  "password": "SecurePass123!",
  "fullName": "Test Patient",
  "role": "PATIENT"
}
```

### 📊 Response Validation

#### **Automatic Tests**

The collection includes automatic tests for:
- ✅ Response status codes
- ✅ Response time (< 5 seconds)
- ✅ JSON structure validation
- ✅ Variable extraction

#### **Custom Validation Examples**

Add these to individual request **Tests** tab:

```javascript
// Test user registration response
pm.test("User registration successful", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('user');
    pm.expect(jsonData.user).to.have.property('email');
    pm.expect(jsonData.user.role).to.be.oneOf(['DOCTOR', 'PATIENT']);
});

// Test login response
pm.test("Login provides access token", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('accessToken');
    pm.expect(jsonData.accessToken).to.be.a('string');
    pm.expect(jsonData.accessToken.length).to.be.above(20);
});

// Test dashboard data
pm.test("Dashboard returns user-specific data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('user');
    pm.expect(jsonData).to.have.property('stats');
});
```

## Collection Structure

### 📁 Folder Organization

```
SmartMed Authentication API/
├── 📁 Health & Status
│   ├── Health Check
│   └── Get CSRF Token
├── 📁 Authentication  
│   ├── Register Doctor
│   ├── Register Patient
│   ├── Login Doctor
│   ├── Login Patient
│   ├── Google OAuth Login
│   ├── Logout
│   └── Refresh Token
├── 📁 Password Management
│   ├── Request Password Reset
│   ├── Complete Password Reset
│   └── Change Password
├── 📁 Email Verification
│   ├── Verify Email
│   └── Resend Verification Email
├── 📁 User Management
│   ├── Get Current User
│   ├── Update User Profile
│   └── Check Email Availability
├── 📁 Dashboard
│   ├── Doctor Dashboard
│   └── Patient Dashboard
├── 📁 Admin
│   ├── Get All Users (Admin)
│   ├── Get User by ID (Admin)
│   ├── Update User (Admin)
│   └── Delete User (Admin)
└── 📁 Error Testing
    ├── Invalid Login
    ├── Duplicate Registration
    ├── Access Without Token
    ├── Invalid CSRF Token
    └── Rate Limit Test
```

## Troubleshooting

### 🚫 Common Issues

#### **Issue: CSRF Token Missing**
```
Error: 403 - CSRF token missing or invalid
```
**Solution:**
1. Run `Get CSRF Token` request first
2. Ensure `X-CSRF-Token` header is included in requests

#### **Issue: Access Token Expired**
```
Error: 401 - Token expired
```
**Solution:**
1. Run `Refresh Token` request
2. Or login again to get new token

#### **Issue: Connection Refused**
```
Error: connect ECONNREFUSED 127.0.0.1:3001
```
**Solution:**
1. Start the API server: `npm run dev` in `apps/api`
2. Verify server is running on port 3001

#### **Issue: Database Connection Error**
```
Error: Can't reach database server
```
**Solution:**
1. Start PostgreSQL database
2. Check database connection string
3. Run database migrations

#### **Issue: Email Tokens Not Working**
```
Error: Invalid or expired token
```
**Solution:**
1. Ensure email service is configured
2. Check email for actual tokens
3. Verify token hasn't expired (typically 1 hour)

### 🔍 Debug Mode

Enable verbose logging in requests:

```javascript
// Add to Pre-request Script
console.log('Request URL:', pm.request.url.toString());
console.log('Request Headers:', pm.request.headers.all());
console.log('Request Body:', pm.request.body);

// Add to Tests
console.log('Response Status:', pm.response.code);
console.log('Response Headers:', pm.response.headers.all());
console.log('Response Body:', pm.response.text());
```

### 📞 API Response Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 200 | Success | Request completed successfully |
| 201 | Created | User/resource created successfully |
| 400 | Bad Request | Invalid request data or missing fields |
| 401 | Unauthorized | Missing/invalid access token |
| 403 | Forbidden | Insufficient permissions or CSRF failure |
| 404 | Not Found | Endpoint or resource doesn't exist |
| 409 | Conflict | Duplicate email or resource exists |
| 422 | Unprocessable Entity | Validation errors in request data |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

## Running Automated Tests

### 🔄 Collection Runner

1. **Right-click collection** → **Run Collection**
2. **Select requests** to run (or run all)
3. **Set iterations** (1 for most tests)
4. **Run** and review results

### 📈 Monitoring & Reporting

1. **View Results** in Collection Runner
2. **Export Results** as JSON/HTML
3. **Set up Monitors** for continuous testing

### 🎯 Newman CLI (Optional)

Run collection from command line:

```bash
# Install Newman
npm install -g newman

# Run collection
newman run SmartMed-API-Collection.postman_collection.json \
  --environment SmartMed-Environment.postman_environment.json \
  --reporters html \
  --reporter-html-export test-results.html
```

## Best Practices

### ✅ Testing Best Practices

1. **Run Health Check First** - Always verify API is running
2. **Get CSRF Token** - Required for most POST/PUT requests
3. **Test Happy Path** - Verify normal flows work
4. **Test Error Cases** - Verify proper error handling
5. **Clean Up** - Remove test data between runs
6. **Use Realistic Data** - Test with production-like data
7. **Test Security** - Verify authentication and authorization
8. **Monitor Performance** - Check response times

### 🔐 Security Testing Checklist

- [ ] CSRF protection working
- [ ] Authentication required for protected endpoints
- [ ] Role-based access control enforced
- [ ] Rate limiting prevents abuse
- [ ] Input validation prevents injection
- [ ] Tokens expire appropriately
- [ ] Logout clears sessions properly
- [ ] Password policies enforced

### 📝 Documentation

Always document:
- Test scenarios covered
- Expected vs actual results
- Issues discovered
- Performance benchmarks
- Security verification

This comprehensive testing suite ensures your SmartMed authentication API is robust, secure, and ready for production use!