export type NotificationType =
  | 'APPOINTMENT_REMINDER_24H'
  | 'APPOINTMENT_REMINDER_1H'
  | 'ACTIVITY_CREATED'
  | 'ACTIVITY_UPDATED'
  | 'HEALTH_TIP_GENERATED'

export interface NotificationItem {
  id: string
  userId: string
  type: NotificationType
  title: string
  body?: string | null
  message?: string | null
  activityId?: string | null
  appointmentId?: string | null
  readAt?: string | null
  createdAt: string
}
