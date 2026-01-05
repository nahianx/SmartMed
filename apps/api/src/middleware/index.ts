// Export all middleware
export { authenticate } from './authenticate'
export { requireRole } from './roleCheck'
export { 
  requirePermission, 
  requireResourcePermission, 
  requireAnyPermission, 
  requireAllPermissions,
  hasPermission,
  hasResourcePermission,
  clearPermissionCache 
} from './requirePermission'
export { errorHandler } from './errorHandler'
export { rateLimiter } from './rateLimiter'
export { csrfProtection } from './csrf'
export { validateBody, validateQuery, validateParams } from './validation'
export { securityHeaders } from './security'
export { appointmentOwnership } from './appointmentOwnership'
