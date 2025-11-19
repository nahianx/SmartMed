# SmartMed Postman Collections

This directory contains Postman collections for testing SmartMed APIs.

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
  "baseUrl": "http://localhost:1080/api",
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
| `baseUrl` | API base URL | `http://localhost:1080/api` |
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

1. **Backend Server Running**
   - Start server: `cd apps/api && npm run dev`
   - Verify health: `http://localhost:1080/health`

2. **Database Connected**
   - Configure PostgreSQL credentials in `.env`
   - Run: `cd packages/database && npm run db:push`

3. **Postman Environment**
   - Create environment with required variables
   - Set `baseUrl` to match your server URL

## 📚 Related Documentation

- **[Backend Setup Guide](../docs/api/backend-setup.md)** - Server configuration
- **[Profile Management Docs](../docs/profile-management/README.md)** - Feature overview
- **[Migration Guide](../docs/profile-management/migration-guide.md)** - Developer setup

---

*For detailed API documentation and setup instructions, see [docs/](../docs/README.md)*