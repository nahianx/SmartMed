import { apiClient } from './apiClient'

export interface User {
  id: string
  email: string
  fullName: string
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT' | 'NURSE'
  isActive: boolean
  createdAt: string
  emailVerified: boolean
}

export interface GetAllUsersResponse {
  users: User[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface DashboardStats {
  totalUsers: number
  admins: number
  doctors: number
  patients: number
  activeUsers: number
  inactiveUsers: number
}

export interface AuditLogEntry {
  id: string
  actorId: string
  actorEmail: string
  action: string
  resource: string
  reason?: string
  createdAt: string
}

export const adminService = {
  async getAllUsers(
    page: number = 1,
    limit: number = 20,
    role?: string,
    search?: string
  ): Promise<GetAllUsersResponse> {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    if (role) params.append('role', role)
    if (search) params.append('search', search)

    const response = await apiClient.get(`/admin?${params.toString()}`)
    return response.data
  },

  async getUserById(userId: string): Promise<User> {
    const response = await apiClient.get(`/admin/${userId}`)
    return response.data
  },

  async updateUserRole(userId: string, newRole: string): Promise<User> {
    const response = await apiClient.patch(`/admin/${userId}/role`, { newRole })
    return response.data
  },

  async activateUser(userId: string): Promise<User> {
    const response = await apiClient.patch(`/admin/${userId}/activate`)
    return response.data
  },

  async deactivateUser(userId: string): Promise<User> {
    const response = await apiClient.patch(`/admin/${userId}/deactivate`)
    return response.data
  },

  async promoteUserToAdmin(userId: string): Promise<User> {
    const response = await apiClient.patch(`/admin/${userId}/promote`)
    return response.data
  },

  async demoteUserFromAdmin(userId: string): Promise<User> {
    const response = await apiClient.patch(`/admin/${userId}/demote`)
    return response.data
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get('/admin/stats')
    return response.data
  },

  async getAuditLog(): Promise<AuditLogEntry[]> {
    const response = await apiClient.get('/admin/audit')
    return response.data?.items ?? []
  },
}
