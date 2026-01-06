'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield,
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  X,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Users,
  AlertCircle,
} from 'lucide-react'
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  Checkbox,
  Skeleton,
} from '@smartmed/ui'
import { useAuthContext } from '@/context/AuthContext'
import { apiClient } from '@/services/apiClient'
import { handleApiError } from '@/lib/error_utils'

interface Permission {
  id: string
  name: string
  description: string | null
  resource: string
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'MANAGE' | 'EXECUTE'
  isSystem: boolean
  createdAt: string
}

interface RolePermission {
  id: string
  role: string
  permissionId: string
  permission: Permission
  grantedBy: string | null
  grantedAt: string
}

const ROLES = ['ADMIN', 'DOCTOR', 'PATIENT', 'NURSE', 'RECEPTIONIST'] as const
type Role = (typeof ROLES)[number]

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'bg-red-100 text-red-800 border-red-200',
  DOCTOR: 'bg-blue-100 text-blue-800 border-blue-200',
  PATIENT: 'bg-green-100 text-green-800 border-green-200',
  NURSE: 'bg-purple-100 text-purple-800 border-purple-200',
  RECEPTIONIST: 'bg-amber-100 text-amber-800 border-amber-200',
}

const ACTIONS = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE', 'EXECUTE'] as const
type PermissionAction = (typeof ACTIONS)[number]

export default function PermissionManagementPage() {
  const { user, loading } = useAuthContext()
  const router = useRouter()

  // State
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<Record<Role, RolePermission[]>>({} as Record<Role, RolePermission[]>)
  const [resources, setResources] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResource, setSelectedResource] = useState<string>('all')
  const [selectedRole, setSelectedRole] = useState<Role | 'all'>('all')
  
  // UI state
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set())
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    resource: '',
    action: 'READ' as PermissionAction,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Map<string, { role: Role; permissionId: string; grant: boolean }>>(new Map())

  // Auth check
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login')
      } else if (user.role !== 'ADMIN') {
        router.replace('/')
      }
    }
  }, [user, loading, router])

  // Load data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [permissionsRes, rolePermissionsRes, resourcesRes] = await Promise.all([
        apiClient.get('/admin/permissions'),
        apiClient.get('/admin/roles/permissions'),
        apiClient.get('/admin/permissions/resources'),
      ])

      setPermissions(permissionsRes.data.permissions || [])
      setResources(resourcesRes.data.resources || [])

      // Organize role permissions by role
      const rolePerms: Record<Role, RolePermission[]> = {} as Record<Role, RolePermission[]>
      ROLES.forEach(role => {
        rolePerms[role] = []
      })
      
      const allRolePerms = rolePermissionsRes.data.rolePermissions || []
      allRolePerms.forEach((rp: RolePermission) => {
        if (rolePerms[rp.role as Role]) {
          rolePerms[rp.role as Role].push(rp)
        }
      })
      
      setRolePermissions(rolePerms)
    } catch (err) {
      handleApiError(err, 'Failed to load permissions')
      setError('Failed to load permissions')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadData()
    }
  }, [user, loadData])

  // Check if a role has a specific permission
  const roleHasPermission = (role: Role, permissionId: string): boolean => {
    // Check pending changes first
    const pendingKey = `${role}-${permissionId}`
    const pending = pendingChanges.get(pendingKey)
    if (pending) {
      return pending.grant
    }
    // Check current state
    return rolePermissions[role]?.some(rp => rp.permissionId === permissionId) || false
  }

  // Toggle permission for a role (adds to pending changes)
  const togglePermission = (role: Role, permissionId: string) => {
    const currentlyGranted = roleHasPermission(role, permissionId)
    const key = `${role}-${permissionId}`
    
    // Check if this would revert to original state
    const originalState = rolePermissions[role]?.some(rp => rp.permissionId === permissionId) || false
    const newState = !currentlyGranted
    
    if (newState === originalState) {
      // Remove from pending if reverting to original
      setPendingChanges(prev => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
    } else {
      // Add to pending changes
      setPendingChanges(prev => {
        const next = new Map(prev)
        next.set(key, { role, permissionId, grant: newState })
        return next
      })
    }
  }

  // Save all pending changes
  const saveChanges = async () => {
    if (pendingChanges.size === 0) return

    setIsSaving(true)
    try {
      const promises = Array.from(pendingChanges.values()).map(async (change) => {
        if (change.grant) {
          return apiClient.post(`/admin/roles/${change.role}/permissions`, {
            permissionId: change.permissionId,
          })
        } else {
          return apiClient.delete(`/admin/roles/${change.role}/permissions/${change.permissionId}`)
        }
      })

      await Promise.all(promises)
      setPendingChanges(new Map())
      await loadData()
    } catch (err) {
      handleApiError(err, 'Failed to save permission changes')
    } finally {
      setIsSaving(false)
    }
  }

  // Discard all pending changes
  const discardChanges = () => {
    setPendingChanges(new Map())
  }

  // Create new permission
  const handleCreatePermission = async () => {
    if (!createForm.name || !createForm.resource || !createForm.action) {
      return
    }

    setIsSaving(true)
    try {
      await apiClient.post('/admin/permissions', {
        name: createForm.name,
        description: createForm.description || null,
        resource: createForm.resource,
        action: createForm.action,
      })
      
      setShowCreateDialog(false)
      setCreateForm({ name: '', description: '', resource: '', action: 'READ' })
      await loadData()
    } catch (err) {
      handleApiError(err, 'Failed to create permission')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete permission
  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to delete this permission? This will remove it from all roles.')) {
      return
    }

    try {
      await apiClient.delete(`/admin/permissions/${permissionId}`)
      await loadData()
    } catch (err) {
      handleApiError(err, 'Failed to delete permission')
    }
  }

  // Toggle resource expansion
  const toggleResource = (resource: string) => {
    setExpandedResources(prev => {
      const next = new Set(prev)
      if (next.has(resource)) {
        next.delete(resource)
      } else {
        next.add(resource)
      }
      return next
    })
  }

  // Filter permissions
  const filteredPermissions = permissions.filter(p => {
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !p.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (selectedResource !== 'all' && p.resource !== selectedResource) {
      return false
    }
    return true
  })

  // Group permissions by resource
  const permissionsByResource = filteredPermissions.reduce((acc, p) => {
    if (!acc[p.resource]) {
      acc[p.resource] = []
    }
    acc[p.resource].push(p)
    return acc
  }, {} as Record<string, Permission[]>)

  // Get roles to display
  const displayRoles = selectedRole === 'all' ? ROLES : [selectedRole]

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/admin')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Back to admin dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Permission Management</h1>
                  <p className="text-sm text-muted-foreground">Manage role-based access control</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {pendingChanges.size > 0 && (
                <>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {pendingChanges.size} pending change{pendingChanges.size > 1 ? 's' : ''}
                  </Badge>
                  <Button variant="outline" onClick={discardChanges} disabled={isSaving}>
                    <X className="h-4 w-4 mr-2" />
                    Discard
                  </Button>
                  <Button onClick={saveChanges} disabled={isSaving}>
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Permission
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-card rounded-lg border border-border p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedResource} onValueChange={setSelectedResource}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {resources.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role | 'all')}>
              <SelectTrigger className="w-[180px]">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        )}

        {/* Permissions Table */}
        {!isLoading && (
          <div className="space-y-4">
            {Object.entries(permissionsByResource).map(([resource, perms]) => (
              <div key={resource} className="bg-card rounded-lg border border-border overflow-hidden">
                {/* Resource Header */}
                <button
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted/80 transition-colors"
                  onClick={() => toggleResource(resource)}
                  aria-label={`Toggle ${resource} permissions`}
                >
                  <div className="flex items-center gap-3">
                    {expandedResources.has(resource) ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium text-foreground capitalize">{resource}</span>
                    <Badge variant="outline">{perms.length} permission{perms.length !== 1 ? 's' : ''}</Badge>
                  </div>
                </button>

                {/* Permissions Table */}
                {expandedResources.has(resource) && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground min-w-[250px]">
                            Permission
                          </th>
                          {displayRoles.map(role => (
                            <th key={role} className="px-4 py-3 text-center text-sm font-medium min-w-[100px]">
                              <Badge className={ROLE_COLORS[role]}>{role}</Badge>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground w-[100px]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {perms.map(permission => (
                          <tr key={permission.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">{permission.name}</span>
                                  {permission.isSystem && (
                                    <Badge variant="outline" className="text-xs">System</Badge>
                                  )}
                                </div>
                                {permission.description && (
                                  <p className="text-sm text-muted-foreground mt-0.5">{permission.description}</p>
                                )}
                                <Badge variant="outline" className="text-xs mt-1">
                                  {permission.action}
                                </Badge>
                              </div>
                            </td>
                            {displayRoles.map(role => {
                              const hasPermission = roleHasPermission(role, permission.id)
                              const isPending = pendingChanges.has(`${role}-${permission.id}`)
                              
                              return (
                                <td key={role} className="px-4 py-3 text-center">
                                  <div className="flex justify-center">
                                    <Checkbox
                                      checked={hasPermission}
                                      onCheckedChange={() => togglePermission(role, permission.id)}
                                      className={isPending ? 'ring-2 ring-amber-400' : ''}
                                    />
                                  </div>
                                </td>
                              )
                            })}
                            <td className="px-4 py-3 text-right">
                              {!permission.isSystem && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePermission(permission.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

            {Object.keys(permissionsByResource).length === 0 && (
              <div className="bg-card rounded-lg border border-border p-8 text-center">
                <Shield className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No permissions found matching your filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Permission Sheet */}
      <Sheet open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create New Permission</SheetTitle>
            <SheetDescription>
              Define a new permission that can be assigned to roles.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">Permission Name</label>
              <Input
                placeholder="e.g., reports:export"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Use format: resource:action</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Input
                placeholder="Optional description"
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">Resource</label>
              <Select
                value={createForm.resource}
                onValueChange={(v) => setCreateForm(prev => ({ ...prev, resource: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select or enter resource" />
                </SelectTrigger>
                <SelectContent>
                  {resources.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or enter new resource name"
                value={createForm.resource}
                onChange={(e) => setCreateForm(prev => ({ ...prev, resource: e.target.value }))}
                className="mt-2"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">Action</label>
              <Select
                value={createForm.action}
                onValueChange={(v) => setCreateForm(prev => ({ ...prev, action: v as PermissionAction }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <SheetFooter className="flex gap-3">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePermission} 
              disabled={!createForm.name || !createForm.resource || !createForm.action || isSaving}
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Permission
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
