'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button } from '@smartmed/ui'
import { useAuthContext } from '../../../../context/AuthContext'
import { ConfirmDialog } from '../../../../components/ConfirmDialog'
import {
  adminService,
  User,
  GetAllUsersResponse,
} from '../../../../services/adminService'

interface DialogState {
  isOpen: boolean
  type: 'deactivate' | 'promote' | 'demote' | null
  userId: string | null
  userName: string | null
}

export default function UserManagementPage() {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    type: null,
    userId: null,
    userName: null,
  })

  const loadUsers = useCallback(async (page = 1, search = '', role = '') => {
    try {
      setPageLoading(true)
      setError(null)
      const response = await adminService.getAllUsers(page, 20, role, search)
      setUsers(response.users)
      setStats({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      })
    } catch (err) {
      setError('Failed to load users')
      console.error(err)
    } finally {
      setPageLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login')
      } else if (user.role !== 'ADMIN') {
        router.replace('/')
      } else {
        loadUsers()
      }
    }
  }, [user, loading, router, loadUsers])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleRoleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value)
  }

  const handleApplyFilters = () => {
    loadUsers(1, searchTerm, roleFilter)
  }

  const handleActivateUser = async (userId: string) => {
    try {
      setError(null)
      await adminService.activateUser(userId)
      setSuccess('User activated successfully')
      loadUsers(stats.page, searchTerm, roleFilter)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Failed to activate user')
      console.error(err)
    }
  }

  const handleDeactivateUser = async (userId: string) => {
    const userToDeactivate = users.find((u) => u.id === userId)
    setDialog({
      isOpen: true,
      type: 'deactivate',
      userId,
      userName: userToDeactivate?.fullName || 'this user',
    })
  }

  const handlePromoteToAdmin = async (userId: string) => {
    const userToPromote = users.find((u) => u.id === userId)
    setDialog({
      isOpen: true,
      type: 'promote',
      userId,
      userName: userToPromote?.fullName || 'this user',
    })
  }

  const handleDemoteFromAdmin = async (userId: string) => {
    const userToDemote = users.find((u) => u.id === userId)
    setDialog({
      isOpen: true,
      type: 'demote',
      userId,
      userName: userToDemote?.fullName || 'this user',
    })
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      setError(null)
      await adminService.updateUserRole(userId, newRole)
      setSuccess('User role updated successfully')
      loadUsers(stats.page, searchTerm, roleFilter)
      setShowUserDetails(false)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Failed to update user role')
      console.error(err)
    }
  }

  const handleViewDetails = async (userId: string) => {
    try {
      setError(null)
      const userDetails = await adminService.getUserById(userId)
      setSelectedUser(userDetails)
      setShowUserDetails(true)
    } catch (err) {
      setError('Failed to load user details')
      console.error(err)
    }
  }

  const handleDialogConfirm = async () => {
    if (!dialog.userId || !dialog.type) return

    try {
      setError(null)
      if (dialog.type === 'deactivate') {
        await adminService.deactivateUser(dialog.userId)
        setSuccess('User deactivated successfully')
      } else if (dialog.type === 'promote') {
        await adminService.promoteUserToAdmin(dialog.userId)
        setSuccess('User promoted to admin successfully')
      } else if (dialog.type === 'demote') {
        await adminService.demoteUserFromAdmin(dialog.userId)
        setSuccess('User demoted successfully')
      }
      setDialog({ isOpen: false, type: null, userId: null, userName: null })
      loadUsers(stats.page, searchTerm, roleFilter)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(`Failed to ${dialog.type} user`)
      console.error(err)
      setDialog({ isOpen: false, type: null, userId: null, userName: null })
    }
  }

  const handleDialogCancel = () => {
    setDialog({ isOpen: false, type: null, userId: null, userName: null })
  }

  // Multi-select toggle
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(users.map((u) => u.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const bulkUpdate = async (action: 'activate' | 'deactivate') => {
    if (selectedIds.size === 0) return
    try {
      setError(null)
      setSuccess(null)
      for (const id of Array.from(selectedIds)) {
        if (action === 'activate') await adminService.activateUser(id)
        else await adminService.deactivateUser(id)
      }
      setSuccess(`Selected users ${action}d`)
      setSelectedIds(new Set())
      loadUsers(stats.page, searchTerm, roleFilter)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(`Bulk ${action} failed`)
      console.error(err)
    }
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading...
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">User Management</h1>
              <Badge variant="outline" className="text-xs">
                Administrator
              </Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/admin')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 min-h-[calc(100vh-4rem)]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              User Management
            </h2>
            <p className="text-muted-foreground">
              Manage user roles, permissions, and access control
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          <div className="bg-card rounded-xl shadow-md border border-border p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Search & Filters
            </h3>
            <div className="flex gap-4 flex-wrap items-end">
              <div className="flex-1 min-w-64">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Search by name or email
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="John Doe, john@example.com"
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow"
                />
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Filter by role
                </label>
                <select
                  title="Select Role"
                  value={roleFilter}
                  onChange={handleRoleFilter}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow"
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="PATIENT">Patient</option>
                  <option value="NURSE">Nurse</option>
                </select>
              </div>
              <button
                onClick={handleApplyFilters}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-md border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted">
              <h3 className="text-lg font-semibold text-foreground">
                All Users ({stats.total})
              </h3>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => bulkUpdate('activate')}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50"
                  disabled={selectedIds.size === 0}
                >
                  Activate selected
                </button>
                <button
                  onClick={() => bulkUpdate('deactivate')}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
                  disabled={selectedIds.size === 0}
                >
                  Deactivate selected
                </button>
                <span className="text-sm text-muted-foreground font-medium">
                  Page {stats.page} of {stats.totalPages}
                </span>
              </div>
            </div>

            {pageLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-muted-foreground font-medium">
                  Loading users...
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-muted-foreground font-medium">No users found</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        <input
                          type="checkbox"
                          aria-label="Select all"
                          checked={
                            users.length > 0 &&
                            selectedIds.size === users.length
                          }
                          onChange={(e) => selectAll(e.target.checked)}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-border hover:bg-muted"
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            aria-label={`Select ${u.fullName || u.email}`}
                            checked={selectedIds.has(u.id)}
                            onChange={() => toggleSelect(u.id)}
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground font-medium">
                          {u.fullName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {u.email}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'DOCTOR'
                                  ? 'bg-green-100 text-green-800'
                                  : u.role === 'PATIENT'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-muted text-foreground'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              u.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleViewDetails(u.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium mr-3"
                          >
                            Details
                          </button>
                          {u.id === user.id ? (
                            <span className="text-muted-foreground text-xs bg-muted px-2 py-1 rounded">
                              You
                            </span>
                          ) : (
                            <div className="flex gap-2 flex-wrap">
                              {u.isActive ? (
                                <button
                                  onClick={() => handleDeactivateUser(u.id)}
                                  className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium rounded transition"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivateUser(u.id)}
                                  className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium rounded transition"
                                >
                                  Activate
                                </button>
                              )}
                              {u.role === 'ADMIN' ? (
                                <button
                                  onClick={() => handleDemoteFromAdmin(u.id)}
                                  className="px-3 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 text-xs font-medium rounded transition"
                                >
                                  Demote
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePromoteToAdmin(u.id)}
                                  className="px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs font-medium rounded transition"
                                >
                                  Promote
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!pageLoading && users.length > 0 && (
              <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-muted">
                <button
                  onClick={() =>
                    stats.page > 1 &&
                    loadUsers(stats.page - 1, searchTerm, roleFilter)
                  }
                  disabled={stats.page === 1}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {stats.page} of {stats.totalPages}
                </span>
                <button
                  onClick={() =>
                    stats.page < stats.totalPages &&
                    loadUsers(stats.page + 1, searchTerm, roleFilter)
                  }
                  disabled={stats.page >= stats.totalPages}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
      {showUserDetails && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowUserDetails(false)
            setSelectedUser(null)
          }}
          onRoleChange={(newRole) => handleChangeRole(selectedUser.id, newRole)}
        />
      )}
      <ConfirmDialog
        isOpen={dialog.isOpen}
        title={
          dialog.type === 'deactivate'
            ? 'Deactivate User'
            : dialog.type === 'promote'
              ? 'Promote to Admin'
              : 'Demote from Admin'
        }
        message={
          dialog.type === 'deactivate'
            ? `Are you sure you want to deactivate ${dialog.userName}? They will not be able to access their account.`
            : dialog.type === 'promote'
              ? `Are you sure you want to promote ${dialog.userName} to admin? They will have full system access.`
              : `Are you sure you want to demote ${dialog.userName} from admin role?`
        }
        confirmText={
          dialog.type === 'deactivate'
            ? 'Deactivate'
            : dialog.type === 'promote'
              ? 'Promote'
              : 'Demote'
        }
        isDangerous={dialog.type === 'deactivate' || dialog.type === 'demote'}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />
    </div>
  )
}

function UserDetailsModal({
  user,
  onClose,
  onRoleChange,
}: {
  user: User
  onClose: () => void
  onRoleChange: (newRole: string) => void
}) {
  const [newRole, setNewRole] = useState(user.role)
  const modalRef = React.useRef<HTMLDivElement | null>(null)
  const lastFocused = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    lastFocused.current = document.activeElement as HTMLElement
    const first = modalRef.current?.querySelector<HTMLElement>('button, select')
    first?.focus()
    return () => {
      lastFocused.current?.focus()
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], select, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onKeyDown={handleKeyDown}
        className="bg-card rounded-lg max-w-md w-full p-6"
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold">User Details</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Full Name</p>
            <p className="font-medium">{user.fullName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Role</p>
            <p className="font-medium">{user.role}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">
              {user.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email Verified</p>
            <p className="font-medium">{user.emailVerified ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Member Since</p>
            <p className="font-medium">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Change Role
            </label>
            <select
              title="Select Roles"
              value={newRole}
              onChange={(e) =>
                setNewRole(
                  e.target.value as 'ADMIN' | 'DOCTOR' | 'PATIENT' | 'NURSE'
                )
              }
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ADMIN">Admin</option>
              <option value="DOCTOR">Doctor</option>
              <option value="PATIENT">Patient</option>
              <option value="NURSE">Nurse</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onRoleChange(newRole)}
            disabled={newRole === user.role}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Update Role
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
