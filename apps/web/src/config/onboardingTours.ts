/**
 * Onboarding Tour Configuration
 * 
 * Role-specific guided tours for new users to learn the SmartMed platform.
 * Tours are shown on first login and can be restarted from settings.
 */

export interface TourStep {
  target: string // CSS selector for the element to highlight
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  spotlightClicks?: boolean // Allow clicks on the highlighted element
  disableBeacon?: boolean // Don't show the pulse beacon
}

export interface Tour {
  id: string
  name: string
  steps: TourStep[]
  roles: Array<'PATIENT' | 'DOCTOR' | 'NURSE' | 'ADMIN'>
}

// Common welcome step for all roles
const welcomeStep: TourStep = {
  target: 'body',
  title: 'Welcome to SmartMed! 🏥',
  content: 'Let\'s take a quick tour to help you get started with the platform. You can restart this tour anytime from your profile settings.',
  placement: 'center',
  disableBeacon: true,
}

// Patient Tour
export const patientTour: Tour = {
  id: 'patient-onboarding',
  name: 'Patient Onboarding Tour',
  roles: ['PATIENT'],
  steps: [
    welcomeStep,
    {
      target: '[data-tour="dashboard"]',
      title: 'Your Dashboard',
      content: 'This is your personal health dashboard. Here you can see your upcoming appointments, recent prescriptions, and health tips.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="appointments"]',
      title: 'Appointments',
      content: 'View and manage your appointments. You can book new appointments, reschedule existing ones, or cancel if needed.',
      placement: 'right',
    },
    {
      target: '[data-tour="book-appointment"]',
      title: 'Book an Appointment',
      content: 'Click here to schedule a new appointment with a doctor. You can search for doctors by specialty or name.',
      placement: 'bottom',
      spotlightClicks: true,
    },
    {
      target: '[data-tour="prescriptions"]',
      title: 'Your Prescriptions',
      content: 'Access your prescription history here. You can view details, download PDFs, and share prescriptions with pharmacies.',
      placement: 'right',
    },
    {
      target: '[data-tour="health-tips"]',
      title: 'Health Tips',
      content: 'Get personalized health tips and reminders based on your profile and medical history.',
      placement: 'left',
    },
    {
      target: '[data-tour="profile"]',
      title: 'Your Profile',
      content: 'Manage your personal information, emergency contacts, and medical history. Keeping this updated helps your doctors provide better care.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="notifications"]',
      title: 'Notifications',
      content: 'Stay informed with appointment reminders, prescription updates, and important health alerts.',
      placement: 'bottom',
    },
    {
      target: 'body',
      title: 'You\'re All Set! 🎉',
      content: 'You\'re ready to start using SmartMed. If you have any questions, check out the Help section or contact support.',
      placement: 'center',
    },
  ],
}

// Doctor Tour
export const doctorTour: Tour = {
  id: 'doctor-onboarding',
  name: 'Doctor Onboarding Tour',
  roles: ['DOCTOR'],
  steps: [
    welcomeStep,
    {
      target: '[data-tour="dashboard"]',
      title: 'Doctor Dashboard',
      content: 'Your command center for managing patients. See today\'s schedule, pending appointments, and patient queue at a glance.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="appointments"]',
      title: 'Appointment Management',
      content: 'View all your appointments. Accept or reject pending requests, mark appointments as complete, and manage your schedule.',
      placement: 'right',
    },
    {
      target: '[data-tour="queue"]',
      title: 'Patient Queue',
      content: 'Manage your real-time patient queue. See who\'s waiting, call patients in, and track wait times.',
      placement: 'right',
      spotlightClicks: true,
    },
    {
      target: '[data-tour="prescriptions"]',
      title: 'Create Prescriptions',
      content: 'Write and manage prescriptions with drug interaction checking. Prescriptions are automatically saved and can be shared securely.',
      placement: 'right',
    },
    {
      target: '[data-tour="patient-search"]',
      title: 'Patient Search',
      content: 'Quickly find patients by name, phone number, or ID. Access their complete medical history and previous visits.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="availability"]',
      title: 'Set Your Availability',
      content: 'Configure your working hours and break times. Patients can only book appointments during your available slots.',
      placement: 'left',
    },
    {
      target: '[data-tour="reports"]',
      title: 'View Reports',
      content: 'Access lab reports, imaging results, and other medical documents uploaded for your patients.',
      placement: 'right',
    },
    {
      target: '[data-tour="notifications"]',
      title: 'Stay Updated',
      content: 'Receive notifications for new appointment requests, patient check-ins, and urgent matters.',
      placement: 'bottom',
    },
    {
      target: 'body',
      title: 'Ready to Practice! 🩺',
      content: 'You\'re all set to start seeing patients. For technical support, visit the Help section or contact the admin team.',
      placement: 'center',
    },
  ],
}

// Nurse Tour
export const nurseTour: Tour = {
  id: 'nurse-onboarding',
  name: 'Nurse Onboarding Tour',
  roles: ['NURSE'],
  steps: [
    welcomeStep,
    {
      target: '[data-tour="dashboard"]',
      title: 'Nurse Dashboard',
      content: 'Your central hub for patient care coordination. Monitor patient queues and assist doctors with their schedules.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="queue"]',
      title: 'Patient Queue Management',
      content: 'Check in patients, update their status, and manage the waiting room flow. Keep doctors informed about patient arrivals.',
      placement: 'right',
      spotlightClicks: true,
    },
    {
      target: '[data-tour="vitals"]',
      title: 'Record Vitals',
      content: 'Enter patient vitals like blood pressure, temperature, and weight before they see the doctor.',
      placement: 'right',
    },
    {
      target: '[data-tour="appointments"]',
      title: 'Appointment Overview',
      content: 'View the day\'s appointments across all doctors. Help reschedule appointments and coordinate care.',
      placement: 'right',
    },
    {
      target: '[data-tour="patient-search"]',
      title: 'Find Patients',
      content: 'Search for patients to check in, verify information, or update their records.',
      placement: 'bottom',
    },
    {
      target: 'body',
      title: 'You\'re Ready! 💪',
      content: 'Start managing patient flow and supporting the care team. Reach out to admin if you need any help.',
      placement: 'center',
    },
  ],
}

// Admin Tour
export const adminTour: Tour = {
  id: 'admin-onboarding',
  name: 'Admin Onboarding Tour',
  roles: ['ADMIN'],
  steps: [
    welcomeStep,
    {
      target: '[data-tour="dashboard"]',
      title: 'Admin Dashboard',
      content: 'Overview of the entire clinic. Monitor active users, appointment stats, and system health.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="users"]',
      title: 'User Management',
      content: 'Add, edit, or deactivate user accounts. Manage doctors, nurses, and patient profiles.',
      placement: 'right',
      spotlightClicks: true,
    },
    {
      target: '[data-tour="permissions"]',
      title: 'Role & Permissions',
      content: 'Configure what each role can access and do. Set up custom permissions for specific users.',
      placement: 'right',
    },
    {
      target: '[data-tour="reports"]',
      title: 'Analytics & Reports',
      content: 'Generate reports on appointments, patient visits, and clinic performance metrics.',
      placement: 'right',
    },
    {
      target: '[data-tour="settings"]',
      title: 'System Settings',
      content: 'Configure clinic hours, appointment durations, notification preferences, and other system-wide settings.',
      placement: 'left',
    },
    {
      target: '[data-tour="audit-logs"]',
      title: 'Audit Logs',
      content: 'Review all system activities for compliance and security. Track who did what and when.',
      placement: 'right',
    },
    {
      target: 'body',
      title: 'Admin Ready! ⚙️',
      content: 'You have full control over the SmartMed platform. Contact technical support for advanced configurations.',
      placement: 'center',
    },
  ],
}

// Get tour by role
export function getTourForRole(role: string): Tour | null {
  switch (role.toUpperCase()) {
    case 'PATIENT':
      return patientTour
    case 'DOCTOR':
      return doctorTour
    case 'NURSE':
      return nurseTour
    case 'ADMIN':
      return adminTour
    default:
      return null
  }
}

// All tours
export const allTours: Tour[] = [patientTour, doctorTour, nurseTour, adminTour]

// Storage key for tour completion status
export const TOUR_STORAGE_KEY = 'smartmed_tours_completed'

// Check if user has completed the tour
export function hasCompletedTour(tourId: string): boolean {
  if (typeof window === 'undefined') return false
  
  const completed = localStorage.getItem(TOUR_STORAGE_KEY)
  if (!completed) return false
  
  try {
    const completedTours: string[] = JSON.parse(completed)
    return completedTours.includes(tourId)
  } catch {
    return false
  }
}

// Mark tour as completed
export function markTourCompleted(tourId: string): void {
  if (typeof window === 'undefined') return
  
  const completed = localStorage.getItem(TOUR_STORAGE_KEY)
  let completedTours: string[] = []
  
  try {
    if (completed) {
      completedTours = JSON.parse(completed)
    }
  } catch {
    // Invalid JSON, start fresh
  }
  
  if (!completedTours.includes(tourId)) {
    completedTours.push(tourId)
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completedTours))
  }
}

// Reset tour completion (for "restart tour" feature)
export function resetTourCompletion(tourId?: string): void {
  if (typeof window === 'undefined') return
  
  if (tourId) {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY)
    if (completed) {
      try {
        let completedTours: string[] = JSON.parse(completed)
        completedTours = completedTours.filter(id => id !== tourId)
        localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completedTours))
      } catch {
        // Invalid JSON, ignore
      }
    }
  } else {
    // Reset all tours
    localStorage.removeItem(TOUR_STORAGE_KEY)
  }
}
