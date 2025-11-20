# SmartMed API Testing - Postman Collection

This directory contains comprehensive API testing resources for the SmartMed application's **Past Activity Timeline** feature and related endpoints.

## 📁 Directory Structure

```
docs/api-testing/
├── SmartMed-API-Collection.postman_collection.json  # Complete Postman collection
└── README.md                                        # This documentation
```

## 🚀 Quick Start

### 1. Import Postman Collection

1. Open **Postman**
2. Click **Import** in the top left
3. Select **File** tab
4. Choose `SmartMed-API-Collection.postman_collection.json`
5. Click **Import**

### 2. Start the Mock API Server

```bash
# Navigate to project root
cd /home/ahanaf/SmartMed

# Start the mock API server
node mock-api-server.js
```

The server will start at: `http://localhost:1080`

### 3. Verify Health Check

Send a GET request to: `http://localhost:1080/health`

Expected response:
```json
{
  "status": "ok",
  "message": "SmartMed API is running (Mock Version)",
  "timestamp": "2024-11-20T10:30:00.000Z"
}
```

## 📋 Collection Overview

### 🔧 Environment Variables (Pre-configured)

| Variable | Value | Description |
|----------|-------|-------------|
| `base_url` | `http://localhost:1080` | API server base URL |
| `patient_email` | `patient@example.com` | Test patient user |
| `doctor_email` | `doctor@example.com` | Test doctor user |
| `patient_id` | `patient-1` | Test patient ID |
| `doctor_id` | `doctor-1` | Test doctor ID |

### 📑 API Collections Included

#### 🏥 Health Check (1 endpoint)
- **Health Status** - Verify API server status

#### 🔐 Authentication (3 endpoints)
- **Login - Patient** - Patient authentication
- **Login - Doctor** - Doctor authentication  
- **Register New User** - User registration

#### 📊 Timeline API - Main Feature (8 endpoints)
- **Get All Activities** - Complete timeline
- **Date Range Filter** - Filter by date range
- **Type Filter** - Filter by activity type (appointment/prescription/report)
- **Multiple Types** - Filter by multiple types
- **Status Filter** - Filter by status (completed/cancelled/no-show)
- **Search Filter** - Text search in activities
- **Complex Filter** - Combined multiple filters
- **Doctor View** - Timeline from doctor perspective

#### 👤 Patient Management (3 endpoints)
- **Get All Patients** - List all patients
- **Get Current Patient Profile** - Patient's own profile
- **Get Patient by ID** - Specific patient details

#### 👩‍⚕️ Doctor Management (2 endpoints)
- **Get All Doctors** - List all doctors
- **Get Doctor by ID** - Specific doctor details

#### 📅 Appointment Management (6 endpoints)
- **Get All Appointments** - Patient/Doctor view
- **Get Appointment by ID** - Specific appointment
- **Create New Appointment** - Schedule appointment
- **Update Appointment** - Modify appointment
- **Cancel Appointment** - Cancel appointment

#### 📄 Report Management (4 endpoints)
- **Get Report Metadata** - Report information
- **Download Report (Inline)** - View report
- **Download Report (Attachment)** - Download report
- **Upload New Report** - Upload new report

#### 🔔 Notification Management (2 endpoints)
- **Get All Notifications** - User notifications
- **Mark Notification as Read** - Mark as read

## 🎯 Testing Scenarios

### Scenario 1: Patient Timeline Journey
1. **Login as Patient** → `POST /api/auth/login`
2. **Get Patient Profile** → `GET /api/patients/me`
3. **View Complete Timeline** → `GET /api/timeline`
4. **Filter by Appointments** → `GET /api/timeline?types=appointment`
5. **Search for Specific Activity** → `GET /api/timeline?search=blood pressure`

### Scenario 2: Doctor Workflow
1. **Login as Doctor** → `POST /api/auth/login`
2. **View All Patients** → `GET /api/patients`
3. **View Doctor's Timeline** → `GET /api/timeline` (with doctor email)
4. **Create New Appointment** → `POST /api/appointments`
5. **Upload Report** → `POST /api/reports`

### Scenario 3: Timeline Filtering
1. **Date Range Filter** → `GET /api/timeline?from=2024-11-01&to=2024-11-20`
2. **Type Filter** → `GET /api/timeline?types=appointment,prescription`
3. **Status Filter** → `GET /api/timeline?statuses=completed`
4. **Complex Filter** → `GET /api/timeline?from=2024-11-01&types=appointment&statuses=completed&limit=10`

## 🔑 Authentication

### Header-Based Authentication (Development)
For testing purposes, authentication is handled via headers:

```
x-user-email: patient@example.com  # For patient access
x-user-email: doctor@example.com   # For doctor access
```

### Available Test Users

| Email | Role | Description |
|-------|------|-------------|
| `patient@example.com` | PATIENT | Test patient user |
| `doctor@example.com` | DOCTOR | Test doctor user |

## 📊 Sample Response Formats

### Timeline Response
```json
{
  "items": [
    {
      "id": "activity-1",
      "type": "appointment",
      "date": "2024-11-15T10:00:00Z",
      "title": "Appointment with Dr. Jane Smith",
      "subtitle": "Regular checkup",
      "tags": ["Cardiology"],
      "status": "completed",
      "doctorName": "Dr. Jane Smith",
      "specialty": "Cardiology",
      "notes": "Patient reported feeling well. Blood pressure normal."
    }
  ]
}
```

### Appointment Response
```json
{
  "appointment": {
    "id": "appointment-1",
    "patientId": "patient-1",
    "doctorId": "doctor-1",
    "dateTime": "2024-11-15T10:00:00Z",
    "duration": 30,
    "status": "COMPLETED",
    "reason": "Regular checkup",
    "notes": "Patient reported feeling well.",
    "patient": {
      "id": "patient-1",
      "firstName": "John",
      "lastName": "Doe"
    },
    "doctor": {
      "id": "doctor-1",
      "firstName": "Jane",
      "lastName": "Smith",
      "specialization": "Cardiology"
    }
  }
}
```

## 🧪 Testing Tips

### 1. Use Collections Runner
- Select the entire collection
- Run all requests in sequence
- Check for consistent responses

### 2. Environment Switching
- Create separate environments for development/staging
- Update `base_url` variable accordingly

### 3. Error Testing
- Test with invalid IDs
- Test with missing headers
- Test with malformed JSON

### 4. Performance Testing
- Test with large date ranges
- Test pagination with different limits
- Monitor response times

## 🐛 Troubleshooting

### Common Issues

**1. Connection Refused**
```
Error: connect ECONNREFUSED 127.0.0.1:1080
```
**Solution**: Ensure the mock API server is running (`node mock-api-server.js`)

**2. 404 Not Found**
```
{"error":"Route not found"}
```
**Solution**: Check the endpoint URL and HTTP method

**3. 401 Unauthorized**
```
{"error":"Unauthorized"}
```
**Solution**: Add the `x-user-email` header with a valid email

**4. Empty Response**
```
{"items":[]}
```
**Solution**: Check filter parameters or try without filters

## 📝 Collection Maintenance

### Adding New Tests
1. Create new request in appropriate folder
2. Set proper headers and variables
3. Add realistic test data
4. Document expected behavior

### Updating Endpoints
1. Modify request URLs/methods
2. Update request bodies
3. Update documentation
4. Test thoroughly

## 🔗 Related Documentation

- [API Implementation](../../API-IMPLEMENTATION-COMPLETE.md)
- [Architecture Overview](../../ARCHITECTURE.md) 
- [Setup Instructions](../../SETUP.md)
- [Timeline Feature Docs](../smartmed_activity_timeline.md)

## 📞 Support

For issues or questions about API testing:
1. Check the troubleshooting section above
2. Review the main project documentation
3. Verify the mock server is running correctly
4. Check Postman console for detailed error messages