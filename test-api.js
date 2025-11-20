#!/usr/bin/env node
/**
 * SmartMed API Test Script
 * Tests all available REST endpoints on port 1080
 */

const BASE_URL = 'http://localhost:1080';

// Test configuration
const TEST_USER_EMAIL = 'test-patient@example.com';
const TEST_DOCTOR_EMAIL = 'test-doctor@example.com';

// Helper function to make HTTP requests
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n🔗 ${options.method || 'GET'} ${endpoint}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': options.userEmail || TEST_USER_EMAIL,
        ...options.headers
      },
      ...options
    });
    
    const data = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }
    
    console.log(`✅ Status: ${response.status}`);
    if (response.status < 400) {
      console.log(`📄 Response:`, JSON.stringify(jsonData, null, 2).substring(0, 500) + (JSON.stringify(jsonData).length > 500 ? '...' : ''));
    } else {
      console.log(`❌ Error:`, jsonData);
    }
    
    return { response, data: jsonData };
  } catch (error) {
    console.log(`💥 Network Error:`, error.message);
    return { error };
  }
}

async function testAPI() {
  console.log('🚀 SmartMed API Test Suite');
  console.log('============================\n');

  // Health Check
  console.log('🏥 HEALTH CHECK');
  console.log('===============');
  await makeRequest('/health');

  // Authentication Routes
  console.log('\n\n🔐 AUTHENTICATION ROUTES');
  console.log('========================');
  
  // Login
  await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'password123'
    })
  });
  
  // Register
  await makeRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: 'newuser@example.com',
      password: 'password123',
      role: 'PATIENT'
    })
  });

  // Patient Routes
  console.log('\n\n👤 PATIENT ROUTES');
  console.log('=================');
  
  // Get all patients (will fail without DB but shows endpoint structure)
  await makeRequest('/api/patients', {
    userEmail: TEST_USER_EMAIL
  });
  
  // Get current patient
  await makeRequest('/api/patients/me', {
    userEmail: TEST_USER_EMAIL
  });
  
  // Get patient by ID
  await makeRequest('/api/patients/test-uuid', {
    userEmail: TEST_USER_EMAIL
  });

  // Doctor Routes
  console.log('\n\n👩‍⚕️ DOCTOR ROUTES');
  console.log('=================');
  
  // Get all doctors
  await makeRequest('/api/doctors');
  
  // Get doctor by ID
  await makeRequest('/api/doctors/test-uuid');
  
  // Create doctor
  await makeRequest('/api/doctors', {
    method: 'POST',
    body: JSON.stringify({
      firstName: 'Jane',
      lastName: 'Smith',
      specialization: 'Cardiology',
      licenseNumber: 'DOC123456'
    })
  });

  // Appointment Routes
  console.log('\n\n📅 APPOINTMENT ROUTES');
  console.log('=====================');
  
  // Get appointments
  await makeRequest('/api/appointments', {
    userEmail: TEST_USER_EMAIL
  });
  
  // Get appointment by ID
  await makeRequest('/api/appointments/test-uuid', {
    userEmail: TEST_USER_EMAIL
  });
  
  // Create appointment
  await makeRequest('/api/appointments', {
    method: 'POST',
    userEmail: TEST_USER_EMAIL,
    body: JSON.stringify({
      patientId: 'test-patient-uuid',
      doctorId: 'test-doctor-uuid',
      dateTime: '2025-11-25T10:00:00.000Z',
      duration: 30,
      reason: 'Regular checkup',
      notes: 'Patient feeling well'
    })
  });

  // Timeline Routes
  console.log('\n\n📋 TIMELINE ROUTES');
  console.log('==================');
  
  // Get timeline
  await makeRequest('/api/timeline?limit=10', {
    userEmail: TEST_USER_EMAIL
  });
  
  // Get timeline with filters
  await makeRequest('/api/timeline?types=appointment&from=2025-11-01&to=2025-11-30', {
    userEmail: TEST_USER_EMAIL
  });

  // Report Routes
  console.log('\n\n📄 REPORT ROUTES');
  console.log('=================');
  
  // Get report metadata (will fail without valid UUID)
  await makeRequest('/api/reports/test-uuid', {
    userEmail: TEST_USER_EMAIL
  });
  
  // Test report upload endpoint structure (multipart)
  console.log('\n🔗 POST /api/reports (File Upload)');
  console.log('📝 Note: This endpoint requires multipart/form-data with PDF file');
  console.log('📝 Sample curl: curl -X POST -H "x-user-email: user@example.com" -F "file=@report.pdf" -F "patientId=uuid" http://localhost:1080/api/reports');

  // Notification Routes
  console.log('\n\n🔔 NOTIFICATION ROUTES');
  console.log('======================');
  
  // Get notifications
  await makeRequest('/api/notifications', {
    userEmail: TEST_USER_EMAIL
  });
  
  // Mark notification as read
  await makeRequest('/api/notifications/test-uuid/read', {
    method: 'POST',
    userEmail: TEST_USER_EMAIL
  });

  // Test different user roles
  console.log('\n\n👨‍⚕️ DOCTOR USER ENDPOINTS');
  console.log('==========================');
  
  // Doctor accessing appointments
  await makeRequest('/api/appointments', {
    userEmail: TEST_DOCTOR_EMAIL
  });
  
  // Doctor accessing timeline
  await makeRequest('/api/timeline', {
    userEmail: TEST_DOCTOR_EMAIL
  });

  console.log('\n\n✅ API TEST COMPLETED');
  console.log('=====================');
  console.log('🌐 Server running on: http://localhost:1080');
  console.log('🏥 Health check: http://localhost:1080/health');
  console.log('📖 All endpoints documented above');
  console.log('\n📝 Notes:');
  console.log('- Database connection errors are expected without PostgreSQL setup');
  console.log('- Auth stub allows testing with x-user-email header');
  console.log('- File uploads require multipart/form-data content type');
  console.log('- Some endpoints require valid UUIDs for full functionality');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testAPI().catch(console.error);
}

module.exports = { testAPI, makeRequest };