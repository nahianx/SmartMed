# SmartMed Postman Collections

This directory contains Postman collections for testing SmartMed APIs.

## 🎉 Current Status - FULLY OPERATIONAL!

- **✅ API Server**: Running on `http://localhost:1079`
- **✅ Database**: PostgreSQL connected with `smartmed_dev` database
- **✅ Schema**: All tables created and ready
- **✅ Health Check**: Working at `http://localhost:1079/health`
- **✅ Ready for Testing**: All 21 endpoints operational

---

## 📁 Available Collections

### 🏥 [Profile Management API Collection](./profile-management-api.postman_collection.json)

Complete API testing collection for the SmartMed Profile Management feature.

#### 📊 Collection Contents
- **21 API Endpoints** across 5 categories
- **Automated token management** for authentication
- **Test scripts** for response validation
- **Environment variables** for easy configuration

#### 🔗 Endpoint Categories

| Category | Endpoints | Description |
|----------|-----------|-------------|
| 🔐 Authentication | 4 | Login/Register for Doctor & Patient |
| 👤 Profile Management | 6 | CRUD operations for user profiles |
| 👨‍⚕️ Doctor Features | 6 | Availability, clinic info, search |
| 👩‍🦱 Patient Features | 4 | Preferred doctors management |
| 🏥 Health Check | 1 | Server status verification |

## 🚀 Quick Setup

### 1. Import Collection
1. Open Postman
2. Click **Import** → **Files**
3. Select `profile-management-api.postman_collection.json`
4. Click **Import**

### 2. Create Environment
Create a new environment with these variables:
```json
{
  "baseUrl": "http://localhost:1079/api",
  "authToken": "",
  "patientToken": "",
  "doctorId": ""
}
```

### 3. Start Testing
1. **Health Check** - Verify server is running
2. **Register Users** - Create doctor and patient accounts
3. **Login** - Get authentication tokens (auto-saved)
4. **Profile Management** - Test CRUD operations
5. **Role-Based Features** - Test doctor/patient specific endpoints

## 🧪 Testing Workflow

### Phase 1: Server Verification
```
GET /health → Verify server is running
```

### Phase 2: User Setup
```
POST /auth/register → Create doctor account
POST /auth/register → Create patient account
POST /auth/login → Login as doctor (token auto-saved)
POST /auth/login → Login as patient (token auto-saved)
```

### Phase 3: Profile Management
```
GET /profile → Retrieve user profile
PUT /profile → Update profile information
POST /profile/photo → Upload profile photo
DELETE /profile/photo → Remove profile photo
PUT /profile/password → Change password
POST /profile/mfa → Toggle two-factor auth
```

### Phase 4: Role-Based Testing
```
# Doctor Features
GET /doctor/profile → Get doctor-specific profile
GET /doctor/availability → Get schedule
PUT /doctor/availability → Update schedule
PUT /doctor/clinic → Update clinic info
GET /doctor/search → Search doctors (public)

# Patient Features  
GET /patient/profile → Get patient-specific profile
GET /patient/preferred-doctors → Get preferred doctors list
POST /patient/preferred-doctors/:id → Add preferred doctor
DELETE /patient/preferred-doctors/:id → Remove preferred doctor
```

## 🔧 Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `baseUrl` | API base URL | `http://localhost:1079/api` |
| `authToken` | Doctor auth token | Auto-set from login |
| `patientToken` | Patient auth token | Auto-set from login |
| `doctorId` | Doctor ID for testing | Set manually or from search |

## 📝 Test Scripts

The collection includes automated test scripts that:
- ✅ Validate response status codes
- ✅ Check response data structure  
- ✅ Auto-save authentication tokens
- ✅ Verify success/error responses
- ✅ Test role-based access control

## 🚨 Prerequisites

Before using the collection:

1. **Backend Server Running** ✅
   - Start server: `cd apps/api && npm run dev`
   - Verify health: `http://localhost:1079/health`
   - **Status**: Server is currently running and operational!

2. **Database Connected** ✅
   - PostgreSQL credentials configured with password: `password`
   - Database `smartmed_dev` created and schema applied
   - **Status**: Database fully operational with all tables!

3. **Postman Environment**
   - Create environment with required variables
   - Set `baseUrl` to `http://localhost:1079/api`

## 📚 Related Documentation

- **[Backend Setup Guide](../docs/api/backend-setup.md)** - Server configuration
- **[Profile Management Docs](../docs/profile-management/README.md)** - Feature overview
- **[Migration Guide](../docs/profile-management/migration-guide.md)** - Developer setup

---

## 🔐 SmartMed Authentication API Testing Guide

### Overview

This guide provides comprehensive instructions for testing the SmartMed authentication API using the provided Postman collection. The collection includes all endpoints, authentication flows, and error scenarios.

### Quick Authentication Setup

#### 1. Import the Collection

1. Open Postman
2. Click **Import** button
3. Select `SmartMed-API-Collection.postman_collection.json`
4. The collection will appear in your Postman workspace

#### 2. Set Up Environment Variables

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

### Testing Workflows

#### 🔄 Complete Authentication Flow

**Workflow 1: Doctor Registration & Login**

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

#### 🔒 Security Testing

**Test 1: CSRF Protection**

1. **Get Valid CSRF Token**
   - Run: `Health & Status → Get CSRF Token`

2. **Test Invalid CSRF**
   - Run: `Error Testing → Invalid CSRF Token`
   - ✅ Verify: Returns 403 Forbidden

**Test 2: Authentication Requirements**

1. **Access Protected Endpoint Without Token**
   - Run: `Error Testing → Access Without Token`
   - ✅ Verify: Returns 401 Unauthorized

2. **Test Role-Based Access**
   - Login as Patient
   - Try: `Dashboard → Doctor Dashboard`
   - ✅ Verify: Returns 403 Forbidden (role mismatch)

### 📊 Response Codes

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

---

*For detailed API documentation and setup instructions, see [docs/](../docs/README.md)*
