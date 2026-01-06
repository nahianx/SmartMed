/**
 * Widget Registry
 * 
 * Defines all available widgets and default layouts for each role.
 */

import { WidgetDefinition, WidgetConfig, WidgetRole } from '../types/widgets'

// ============================================================================
// PATIENT WIDGETS
// ============================================================================

export const PATIENT_WIDGETS: WidgetDefinition[] = [
  {
    id: 'patient-upcoming-appointments',
    title: 'Upcoming Appointments',
    description: 'View your scheduled appointments and book new ones',
    component: 'UpcomingAppointmentsWidget',
    category: 'appointments',
    defaultSize: 'large',
    minSize: 'medium',
    maxSize: 'full',
    allowedRoles: ['PATIENT'],
    icon: 'Calendar',
    removable: false,
    defaultOrder: 1,
  },
  {
    id: 'patient-queue-tracker',
    title: 'Queue Tracker',
    description: 'Track your position in the doctor\'s queue',
    component: 'QueueTrackerWidget',
    category: 'queue',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
    allowedRoles: ['PATIENT'],
    icon: 'Users',
    removable: true,
    defaultOrder: 2,
  },
  {
    id: 'patient-recent-prescriptions',
    title: 'Recent Prescriptions',
    description: 'View your recent prescriptions and medications',
    component: 'RecentPrescriptionsWidget',
    category: 'prescriptions',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
    allowedRoles: ['PATIENT'],
    icon: 'ClipboardList',
    removable: true,
    defaultOrder: 3,
  },
  {
    id: 'patient-health-tips',
    title: 'Health Tips',
    description: 'Personalized health tips and reminders',
    component: 'HealthTipsWidget',
    category: 'health',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
    allowedRoles: ['PATIENT'],
    icon: 'Heart',
    removable: true,
    defaultOrder: 4,
  },
  {
    id: 'patient-activity-timeline',
    title: 'Activity Timeline',
    description: 'Your recent medical activity and history',
    component: 'ActivityTimelineWidget',
    category: 'activity',
    defaultSize: 'large',
    minSize: 'medium',
    maxSize: 'full',
    allowedRoles: ['PATIENT'],
    icon: 'Activity',
    removable: true,
    defaultOrder: 5,
  },
  {
    id: 'patient-doctor-availability',
    title: 'Doctor Availability',
    description: 'See which doctors are available today',
    component: 'DoctorAvailabilityWidget',
    category: 'general',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
    allowedRoles: ['PATIENT'],
    icon: 'Stethoscope',
    removable: true,
    defaultOrder: 6,
  },
  {
    id: 'patient-status-cards',
    title: 'Quick Stats',
    description: 'Overview of visits, doctors, and profile status',
    component: 'PatientStatusCardsWidget',
    category: 'stats',
    defaultSize: 'full',
    minSize: 'large',
    maxSize: 'full',
    allowedRoles: ['PATIENT'],
    icon: 'BarChart3',
    removable: false,
    defaultOrder: 0,
  },
]

// ============================================================================
// DOCTOR WIDGETS
// ============================================================================

export const DOCTOR_WIDGETS: WidgetDefinition[] = [
  {
    id: 'doctor-queue-panel',
    title: 'Patient Queue',
    description: 'Manage your current patient queue',
    component: 'DoctorQueuePanelWidget',
    category: 'queue',
    defaultSize: 'large',
    minSize: 'medium',
    maxSize: 'full',
    allowedRoles: ['DOCTOR'],
    icon: 'Users',
    removable: false,
    defaultOrder: 1,
  },
  {
    id: 'doctor-appointments',
    title: 'Today\'s Appointments',
    description: 'View and manage your appointments',
    component: 'DoctorAppointmentsWidget',
    category: 'appointments',
    defaultSize: 'large',
    minSize: 'medium',
    maxSize: 'full',
    allowedRoles: ['DOCTOR'],
    icon: 'Calendar',
    removable: false,
    defaultOrder: 2,
  },
  {
    id: 'doctor-stats',
    title: 'Today\'s Stats',
    description: 'Quick overview of patients and appointments',
    component: 'DoctorStatsWidget',
    category: 'stats',
    defaultSize: 'full',
    minSize: 'large',
    maxSize: 'full',
    allowedRoles: ['DOCTOR'],
    icon: 'BarChart3',
    removable: false,
    defaultOrder: 0,
  },
  {
    id: 'doctor-recent-prescriptions',
    title: 'Recent Prescriptions',
    description: 'Prescriptions you\'ve written recently',
    component: 'DoctorPrescriptionsWidget',
    category: 'prescriptions',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
    allowedRoles: ['DOCTOR'],
    icon: 'ClipboardList',
    removable: true,
    defaultOrder: 3,
  },
  {
    id: 'doctor-activity-timeline',
    title: 'Activity Timeline',
    description: 'Recent activity in your practice',
    component: 'DoctorTimelineWidget',
    category: 'activity',
    defaultSize: 'large',
    minSize: 'medium',
    maxSize: 'full',
    allowedRoles: ['DOCTOR'],
    icon: 'Activity',
    removable: true,
    defaultOrder: 4,
  },
  {
    id: 'doctor-notifications',
    title: 'Notifications',
    description: 'Important alerts and messages',
    component: 'NotificationsWidget',
    category: 'general',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
    allowedRoles: ['DOCTOR'],
    icon: 'Bell',
    removable: true,
    defaultOrder: 5,
  },
]

// ============================================================================
// ADMIN WIDGETS
// ============================================================================

export const ADMIN_WIDGETS: WidgetDefinition[] = [
  {
    id: 'admin-user-stats',
    title: 'User Statistics',
    description: 'Overview of all users in the system',
    component: 'AdminUserStatsWidget',
    category: 'stats',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
    allowedRoles: ['ADMIN'],
    icon: 'Users',
    removable: false,
    defaultOrder: 1,
  },
  {
    id: 'admin-appointment-stats',
    title: 'Appointment Statistics',
    description: 'System-wide appointment metrics',
    component: 'AdminAppointmentStatsWidget',
    category: 'stats',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
    allowedRoles: ['ADMIN'],
    icon: 'Calendar',
    removable: false,
    defaultOrder: 2,
  },
  {
    id: 'admin-management-cards',
    title: 'Management Actions',
    description: 'Quick access to admin functions',
    component: 'AdminManagementCardsWidget',
    category: 'admin',
    defaultSize: 'full',
    minSize: 'large',
    maxSize: 'full',
    allowedRoles: ['ADMIN'],
    icon: 'Settings',
    removable: false,
    defaultOrder: 0,
  },
  {
    id: 'admin-recent-activity',
    title: 'Recent Activity',
    description: 'Recent system-wide activity',
    component: 'AdminRecentActivityWidget',
    category: 'activity',
    defaultSize: 'large',
    minSize: 'medium',
    maxSize: 'full',
    allowedRoles: ['ADMIN'],
    icon: 'Activity',
    removable: true,
    defaultOrder: 3,
  },
  {
    id: 'admin-audit-logs',
    title: 'Audit Logs',
    description: 'Recent security and audit events',
    component: 'AdminAuditLogsWidget',
    category: 'admin',
    defaultSize: 'large',
    minSize: 'medium',
    maxSize: 'full',
    allowedRoles: ['ADMIN'],
    icon: 'Shield',
    removable: true,
    defaultOrder: 4,
  },
]

// ============================================================================
// COMBINED REGISTRY
// ============================================================================

export const ALL_WIDGETS: WidgetDefinition[] = [
  ...PATIENT_WIDGETS,
  ...DOCTOR_WIDGETS,
  ...ADMIN_WIDGETS,
]

/**
 * Get widgets available for a specific role
 */
export function getWidgetsForRole(role: WidgetRole): WidgetDefinition[] {
  return ALL_WIDGETS.filter(w => w.allowedRoles.includes(role))
}

/**
 * Get a widget definition by ID
 */
export function getWidgetById(id: string): WidgetDefinition | undefined {
  return ALL_WIDGETS.find(w => w.id === id)
}

// ============================================================================
// DEFAULT LAYOUTS
// ============================================================================

export const DEFAULT_PATIENT_LAYOUT: WidgetConfig[] = [
  { widgetId: 'patient-status-cards', order: 0, visible: true, size: 'full', colSpan: 4 },
  { widgetId: 'patient-queue-tracker', order: 1, visible: true, size: 'medium', colSpan: 2 },
  { widgetId: 'patient-doctor-availability', order: 2, visible: true, size: 'medium', colSpan: 2 },
  { widgetId: 'patient-upcoming-appointments', order: 3, visible: true, size: 'large', colSpan: 2 },
  { widgetId: 'patient-recent-prescriptions', order: 4, visible: true, size: 'medium', colSpan: 1 },
  { widgetId: 'patient-health-tips', order: 5, visible: true, size: 'medium', colSpan: 1 },
  { widgetId: 'patient-activity-timeline', order: 6, visible: true, size: 'large', colSpan: 4 },
]

export const DEFAULT_DOCTOR_LAYOUT: WidgetConfig[] = [
  { widgetId: 'doctor-stats', order: 0, visible: true, size: 'full', colSpan: 4 },
  { widgetId: 'doctor-queue-panel', order: 1, visible: true, size: 'large', colSpan: 2 },
  { widgetId: 'doctor-appointments', order: 2, visible: true, size: 'large', colSpan: 2 },
  { widgetId: 'doctor-recent-prescriptions', order: 3, visible: true, size: 'medium', colSpan: 2 },
  { widgetId: 'doctor-notifications', order: 4, visible: true, size: 'medium', colSpan: 2 },
  { widgetId: 'doctor-activity-timeline', order: 5, visible: true, size: 'large', colSpan: 4 },
]

export const DEFAULT_ADMIN_LAYOUT: WidgetConfig[] = [
  { widgetId: 'admin-management-cards', order: 0, visible: true, size: 'full', colSpan: 4 },
  { widgetId: 'admin-user-stats', order: 1, visible: true, size: 'medium', colSpan: 2 },
  { widgetId: 'admin-appointment-stats', order: 2, visible: true, size: 'medium', colSpan: 2 },
  { widgetId: 'admin-recent-activity', order: 3, visible: true, size: 'large', colSpan: 2 },
  { widgetId: 'admin-audit-logs', order: 4, visible: true, size: 'large', colSpan: 2 },
]

/**
 * Get default layout for a role
 */
export function getDefaultLayout(role: WidgetRole): WidgetConfig[] {
  switch (role) {
    case 'PATIENT':
      return [...DEFAULT_PATIENT_LAYOUT]
    case 'DOCTOR':
      return [...DEFAULT_DOCTOR_LAYOUT]
    case 'ADMIN':
      return [...DEFAULT_ADMIN_LAYOUT]
    case 'NURSE':
      // Nurses use a subset of doctor widgets
      return [...DEFAULT_DOCTOR_LAYOUT].filter(w => 
        ['doctor-queue-panel', 'doctor-appointments', 'doctor-stats'].includes(w.widgetId)
      )
    default:
      return []
  }
}

/**
 * Current layout version for migrations
 */
export const LAYOUT_VERSION = 1
