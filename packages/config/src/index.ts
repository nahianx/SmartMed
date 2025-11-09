export const config = {
  api: {
    url: process.env.API_URL || 'http://localhost:4000',
    timeout: 30000,
  },
  app: {
    name: 'SmartMed',
    version: '1.0.0',
    description: 'Healthcare Management System',
  },
  features: {
    enableAppointments: true,
    enablePrescriptions: true,
    enableNotifications: true,
    enableVideoCall: false,
  },
  pagination: {
    defaultPageSize: 10,
    maxPageSize: 100,
  },
}

export default config
