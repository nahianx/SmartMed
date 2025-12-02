# 🚀 SmartMed Backend Server & API Testing Setup Guide

## ✅ Current Status
- **✅ Backend Server**: Running on `http://localhost:1080`
- **✅ Health Check**: Available at `http://localhost:1080/health`
- **✅ API Configuration**: Updated to use port 1080
- **✅ Postman Collection**: Ready for import
- **⚠️ Database**: Requires PostgreSQL setup with proper credentials

---

## 📋 Prerequisites Setup

### 1. PostgreSQL Database Setup

You need to set up PostgreSQL with the correct credentials. Choose one of these options:

#### Option A: Update PostgreSQL Password
```sql
-- Connect to PostgreSQL as superuser and run:
ALTER USER postgres PASSWORD 'postgres';
```

#### Option B: Create New Database User
```sql
-- Create a new user for SmartMed
CREATE USER smartmed WITH PASSWORD 'smartmed123';
CREATE DATABASE smartmed_dev OWNER smartmed;
GRANT ALL PRIVILEGES ON DATABASE smartmed_dev TO smartmed;
```

#### Option C: Use Your Existing Credentials
Update the `DATABASE_URL` in `d:\SmartMed\apps\api\.env`:
```env
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/smartmed_dev"
```

### 2. Verify PostgreSQL is Running
```powershell
# Check if PostgreSQL service is running
Get-Service postgresql*

# Or test connection
psql -U postgres -h localhost -p 5432
```

---

## 🗄️ Database Initialization

Once PostgreSQL credentials are correct, run these commands:

```powershell
# 1. Navigate to database package
cd "d:\SmartMed\packages\database"

# 2. Generate Prisma client
npm run db:generate

# 3. Push schema to database (creates tables)
npm run db:push

# 4. Optional: Run migrations
npm run db:migrate
```

---

## 🖥️ Server Status

### Current Configuration:
- **API Server Port**: `1080`
- **Health Endpoint**: `http://localhost:1080/health`
- **API Base URL**: `http://localhost:1080/api`
- **Frontend API URL**: Updated to match port 1080

### Server is Currently Running ✅
The backend server is active and responding. You can verify by checking:
```
🚀 SmartMed API server running on port 1080
📍 Health check: http://localhost:1080/health
```

---

## 🧪 Postman Testing Setup

### 1. Import Collection
1. Open Postman
2. Click **Import**
3. Select the file: `d:\SmartMed\SmartMed_Profile_API_Collection.postman_collection.json`
4. Click **Import**

### 2. Create Environment
Create a new environment in Postman with these variables:
- `baseUrl`: `http://localhost:1080/api`
- `authToken`: (leave empty, will be set automatically)
- `patientToken`: (leave empty, will be set automatically)
- `doctorId`: (will be set when testing doctor endpoints)

### 3. Testing Workflow

#### Step 1: Test Server Health
```
GET http://localhost:1080/health
```
Expected Response:
```json
{
  "status": "ok",
  "message": "SmartMed API is running",
  "timestamp": "2024-11-20T..."
}
```

#### Step 2: Database Setup (After PostgreSQL is configured)
Once database is set up, you can test database-dependent endpoints.

#### Step 3: Register Test Users
```json
// Register Doctor
POST /api/auth/register
{
  "email": "doctor@smartmed.com",
  "password": "doctor123",
  "role": "DOCTOR",
  "fullName": "Dr. John Smith"
}

// Register Patient  
POST /api/auth/register
{
  "email": "patient@smartmed.com",
  "password": "patient123", 
  "role": "PATIENT",
  "fullName": "Jane Doe"
}
```

#### Step 4: Login & Test Profile Management
1. Login as Doctor → Get auth token
2. Test profile endpoints with doctor token
3. Login as Patient → Get auth token
4. Test patient-specific endpoints

---

## 📊 Available API Endpoints

### 🔐 Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### 👤 Profile Management  
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `POST /api/profile/photo` - Upload profile photo
- `DELETE /api/profile/photo` - Remove profile photo
- `PUT /api/profile/password` - Change password
- `POST /api/profile/mfa` - Toggle MFA

### 👨‍⚕️ Doctor Endpoints
- `GET /api/doctor/search` - Search doctors (public)
- `GET /api/doctor/profile` - Get doctor profile
- `GET /api/doctor/availability` - Get availability
- `PUT /api/doctor/availability` - Update availability
- `PUT /api/doctor/clinic` - Update clinic info
- `GET /api/doctor/specializations/list` - List specializations

### 👩‍🦱 Patient Endpoints
- `GET /api/patient/profile` - Get patient profile
- `GET /api/patient/preferred-doctors` - Get preferred doctors
- `POST /api/patient/preferred-doctors/:id` - Add preferred doctor
- `DELETE /api/patient/preferred-doctors/:id` - Remove preferred doctor

---

## 🔧 Troubleshooting

### Database Connection Issues
```powershell
# Test PostgreSQL connection manually
psql -U postgres -h localhost -p 5432

# Check if SmartMed database exists
psql -U postgres -c "\l" | findstr smartmed
```

### Server Issues
```powershell
# Check if port 1080 is in use
netstat -ano | findstr :1080

# Restart server if needed
cd "d:\SmartMed\apps\api"
npm run dev
```

### API Testing Issues
1. Verify server is running on correct port
2. Check environment variables are set correctly
3. Ensure authentication tokens are valid
4. Verify database is accessible

---

## ✅ Next Steps

1. **Fix PostgreSQL credentials** in `.env` file
2. **Initialize database** with `npm run db:push`
3. **Import Postman collection** 
4. **Test health endpoint** first
5. **Register test users** via API
6. **Test all profile management endpoints**

The backend server is ready and waiting for database connection! 🎉