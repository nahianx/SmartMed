const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 1080;

// Mock data
const mockData = {
  users: [
    { id: "user-1", email: "patient@example.com", role: "PATIENT" },
    { id: "user-2", email: "doctor@example.com", role: "DOCTOR" }
  ],
  patients: [
    { id: "patient-1", userId: "user-1", firstName: "John", lastName: "Doe" }
  ],
  doctors: [
    { id: "doctor-1", userId: "user-2", firstName: "Jane", lastName: "Smith", specialization: "Cardiology" }
  ],
  activities: [
    {
      id: "activity-1",
      type: "appointment",
      date: "2024-11-15T10:00:00Z",
      title: "Appointment with Dr. Jane Smith",
      subtitle: "Regular checkup",
      tags: ["Cardiology"],
      status: "completed",
      doctorName: "Dr. Jane Smith",
      specialty: "Cardiology",
      notes: "Patient reported feeling well. Blood pressure normal."
    },
    {
      id: "activity-2",
      type: "prescription",
      date: "2024-11-10T14:30:00Z",
      title: "Prescription from Dr. Jane Smith",
      subtitle: "Blood pressure medication",
      tags: ["Cardiology"],
      status: "completed",
      doctorName: "Dr. Jane Smith",
      specialty: "Cardiology",
      medications: [
        { name: "Lisinopril", dose: "10mg", frequency: "Once daily", duration: "30 days" },
        { name: "Amlodipine", dose: "5mg", frequency: "Once daily", duration: "30 days" }
      ]
    },
    {
      id: "activity-3",
      type: "report",
      date: "2024-11-05T09:15:00Z",
      title: "Blood Test Results",
      subtitle: "Complete Blood Count",
      tags: ["Lab Test"],
      status: null,
      doctorName: "Dr. Jane Smith",
      specialty: "Cardiology",
      fileName: "cbc_results.pdf",
      fileSize: "2.5 MB",
      reportId: "report-1"
    },
    {
      id: "activity-4",
      type: "appointment",
      date: "2024-11-01T16:00:00Z",
      title: "Appointment with Dr. Jane Smith",
      subtitle: "Follow-up consultation",
      tags: ["Cardiology"],
      status: "completed",
      doctorName: "Dr. Jane Smith",
      specialty: "Cardiology",
      notes: "Discussed test results. Patient responding well to treatment."
    }
  ],
  appointments: [
    {
      id: "appointment-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      dateTime: "2024-11-15T10:00:00Z",
      duration: 30,
      status: "COMPLETED",
      reason: "Regular checkup",
      notes: "Patient reported feeling well. Blood pressure normal.",
      patient: { id: "patient-1", firstName: "John", lastName: "Doe" },
      doctor: { id: "doctor-1", firstName: "Jane", lastName: "Smith", specialization: "Cardiology" }
    }
  ],
  reports: [
    {
      id: "report-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      fileName: "cbc_results.pdf",
      fileSize: 2621440,
      mimeType: "application/pdf",
      uploadedAt: "2024-11-05T09:15:00Z",
      notes: "Complete blood count results - all values within normal range"
    }
  ],
  notifications: [
    {
      id: "notif-1",
      userId: "user-1",
      type: "APPOINTMENT_REMINDER_24H",
      title: "Appointment Reminder",
      body: "You have an appointment with Dr. Jane Smith tomorrow at 10:00 AM",
      readAt: null,
      createdAt: "2024-11-19T10:00:00Z"
    }
  ]
};

// Middleware
app.use(cors());
app.use(express.json());

// Simple auth middleware to mock user authentication
app.use((req, res, next) => {
  const userEmail = req.header('x-user-email') || 'patient@example.com';
  const user = mockData.users.find(u => u.email === userEmail);
  req.user = user;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SmartMed API is running (Mock Version)',
    timestamp: new Date().toISOString(),
  });
});

// Timeline API - Main feature endpoint
app.get('/api/timeline', (req, res) => {
  const { from, to, types, statuses, search, limit } = req.query;
  let activities = [...mockData.activities];
  
  // Filter by date range
  if (from) {
    const fromDate = new Date(from);
    activities = activities.filter(a => new Date(a.date) >= fromDate);
  }
  
  if (to) {
    const toDate = new Date(to);
    activities = activities.filter(a => new Date(a.date) <= toDate);
  }
  
  // Filter by types
  if (types) {
    const typeArray = types.split(',').map(t => t.trim().toLowerCase());
    activities = activities.filter(a => typeArray.includes(a.type));
  }
  
  // Filter by statuses
  if (statuses) {
    const statusArray = statuses.split(',').map(s => s.trim().toLowerCase());
    activities = activities.filter(a => a.status && statusArray.includes(a.status));
  }
  
  // Filter by search
  if (search) {
    const searchTerm = search.toLowerCase();
    activities = activities.filter(a => 
      a.title.toLowerCase().includes(searchTerm) ||
      a.subtitle.toLowerCase().includes(searchTerm) ||
      (a.notes && a.notes.toLowerCase().includes(searchTerm))
    );
  }
  
  // Limit results
  const maxLimit = Math.min(parseInt(limit) || 50, 100);
  activities = activities.slice(0, maxLimit);
  
  res.json({ items: activities });
});

// Patient routes
app.get('/api/patients', (req, res) => {
  res.json({ patients: mockData.patients });
});

app.get('/api/patients/me', (req, res) => {
  if (!req.user || req.user.role !== 'PATIENT') {
    return res.status(403).json({ error: 'Only patients have a /me resource' });
  }
  
  const patient = mockData.patients.find(p => p.userId === req.user.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient profile not found' });
  }
  
  res.json({ patient });
});

app.get('/api/patients/:id', (req, res) => {
  const patient = mockData.patients.find(p => p.id === req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  res.json({ patient });
});

// Doctor routes  
app.get('/api/doctors', (req, res) => {
  res.json({ doctors: mockData.doctors });
});

app.get('/api/doctors/:id', (req, res) => {
  const doctor = mockData.doctors.find(d => d.id === req.params.id);
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found' });
  }
  res.json({ doctor });
});

// Appointment routes
app.get('/api/appointments', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  let appointments = mockData.appointments;
  
  if (req.user.role === 'PATIENT') {
    const patient = mockData.patients.find(p => p.userId === req.user.id);
    if (patient) {
      appointments = appointments.filter(a => a.patientId === patient.id);
    }
  } else if (req.user.role === 'DOCTOR') {
    const doctor = mockData.doctors.find(d => d.userId === req.user.id);
    if (doctor) {
      appointments = appointments.filter(a => a.doctorId === doctor.id);
    }
  }
  
  res.json({ appointments });
});

app.get('/api/appointments/:id', (req, res) => {
  const appointment = mockData.appointments.find(a => a.id === req.params.id);
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  res.json({ appointment });
});

// Create appointment
app.post('/api/appointments', (req, res) => {
  const { patientId, doctorId, dateTime, duration, reason, notes } = req.body;
  
  const newAppointment = {
    id: `appointment-${Date.now()}`,
    patientId,
    doctorId,
    dateTime,
    duration,
    status: "SCHEDULED",
    reason,
    notes,
    patient: mockData.patients.find(p => p.id === patientId),
    doctor: mockData.doctors.find(d => d.id === doctorId)
  };
  
  mockData.appointments.push(newAppointment);
  res.status(201).json({ message: 'Appointment created successfully', appointment: newAppointment });
});

// Update appointment
app.put('/api/appointments/:id', (req, res) => {
  const appointmentIndex = mockData.appointments.findIndex(a => a.id === req.params.id);
  if (appointmentIndex === -1) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  mockData.appointments[appointmentIndex] = {
    ...mockData.appointments[appointmentIndex],
    ...req.body
  };
  
  res.json({ message: 'Appointment updated successfully', appointment: mockData.appointments[appointmentIndex] });
});

// Cancel appointment
app.delete('/api/appointments/:id', (req, res) => {
  const appointmentIndex = mockData.appointments.findIndex(a => a.id === req.params.id);
  if (appointmentIndex === -1) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  mockData.appointments[appointmentIndex].status = 'CANCELLED';
  res.json({ message: 'Appointment cancelled successfully', appointment: mockData.appointments[appointmentIndex] });
});

// Report routes
app.get('/api/reports/:id', (req, res) => {
  const report = mockData.reports.find(r => r.id === req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json(report);
});

app.get('/api/reports/:id/download', (req, res) => {
  const report = mockData.reports.find(r => r.id === req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  res.setHeader('Content-Type', report.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${report.fileName}"`);
  res.send('Mock PDF content for testing');
});

// Upload report
app.post('/api/reports', (req, res) => {
  const { patientId, doctorId, appointmentId, notes } = req.body;
  
  const newReport = {
    id: `report-${Date.now()}`,
    patientId,
    doctorId,
    appointmentId,
    fileName: 'mock_report.pdf',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    uploadedAt: new Date().toISOString(),
    notes
  };
  
  mockData.reports.push(newReport);
  res.status(201).json(newReport);
});

// Notification routes
app.get('/api/notifications', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const notifications = mockData.notifications.filter(n => n.userId === req.user.id);
  res.json({ items: notifications });
});

app.post('/api/notifications/:id/read', (req, res) => {
  const notification = mockData.notifications.find(n => n.id === req.params.id);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  
  notification.readAt = new Date().toISOString();
  res.json({ success: true });
});

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = mockData.users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({
    message: 'Login successful',
    user,
    token: 'mock-jwt-token-123'
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, role } = req.body;
  
  const newUser = {
    id: `user-${Date.now()}`,
    email,
    role: role || 'PATIENT'
  };
  
  mockData.users.push(newUser);
  res.status(201).json({
    message: 'User registered successfully',
    user: newUser
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SmartMed Mock API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Timeline API: http://localhost:${PORT}/api/timeline`);
});