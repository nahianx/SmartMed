import { PrismaClient, UserRole, PermissionAction } from '@prisma/client'

const prisma = new PrismaClient()

interface PermissionDefinition {
  name: string
  description: string
  resource: string
  action: PermissionAction
  isSystem: boolean
  defaultRoles: UserRole[]
}

// Define all system permissions with their default role assignments
const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // User Management
  {
    name: 'users:read',
    description: 'View user profiles',
    resource: 'users',
    action: 'READ',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE]
  },
  {
    name: 'users:create',
    description: 'Create new users',
    resource: 'users',
    action: 'CREATE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },
  {
    name: 'users:update',
    description: 'Update user profiles',
    resource: 'users',
    action: 'UPDATE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },
  {
    name: 'users:delete',
    description: 'Delete users',
    resource: 'users',
    action: 'DELETE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },
  {
    name: 'users:manage',
    description: 'Full user management access',
    resource: 'users',
    action: 'MANAGE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },

  // Appointment Management
  {
    name: 'appointments:read',
    description: 'View appointments',
    resource: 'appointments',
    action: 'READ',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.PATIENT]
  },
  {
    name: 'appointments:create',
    description: 'Create appointments',
    resource: 'appointments',
    action: 'CREATE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.PATIENT]
  },
  {
    name: 'appointments:update',
    description: 'Update appointments',
    resource: 'appointments',
    action: 'UPDATE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE]
  },
  {
    name: 'appointments:delete',
    description: 'Cancel/delete appointments',
    resource: 'appointments',
    action: 'DELETE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR]
  },
  {
    name: 'appointments:manage',
    description: 'Full appointment management',
    resource: 'appointments',
    action: 'MANAGE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },

  // Prescription Management
  {
    name: 'prescriptions:read',
    description: 'View prescriptions',
    resource: 'prescriptions',
    action: 'READ',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.PATIENT]
  },
  {
    name: 'prescriptions:create',
    description: 'Create prescriptions',
    resource: 'prescriptions',
    action: 'CREATE',
    isSystem: true,
    defaultRoles: [UserRole.DOCTOR]
  },
  {
    name: 'prescriptions:update',
    description: 'Update prescriptions',
    resource: 'prescriptions',
    action: 'UPDATE',
    isSystem: true,
    defaultRoles: [UserRole.DOCTOR]
  },
  {
    name: 'prescriptions:delete',
    description: 'Delete prescriptions',
    resource: 'prescriptions',
    action: 'DELETE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR]
  },
  {
    name: 'prescriptions:manage',
    description: 'Full prescription management',
    resource: 'prescriptions',
    action: 'MANAGE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },

  // Queue Management
  {
    name: 'queue:read',
    description: 'View queue entries',
    resource: 'queue',
    action: 'READ',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.PATIENT]
  },
  {
    name: 'queue:create',
    description: 'Add patients to queue',
    resource: 'queue',
    action: 'CREATE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.PATIENT]
  },
  {
    name: 'queue:update',
    description: 'Update queue entries',
    resource: 'queue',
    action: 'UPDATE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE]
  },
  {
    name: 'queue:call_next',
    description: 'Call next patient in queue',
    resource: 'queue',
    action: 'EXECUTE',
    isSystem: true,
    defaultRoles: [UserRole.DOCTOR, UserRole.NURSE]
  },
  {
    name: 'queue:manage',
    description: 'Full queue management',
    resource: 'queue',
    action: 'MANAGE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },

  // Drug/Medication Management
  {
    name: 'drugs:read',
    description: 'View drug information',
    resource: 'drugs',
    action: 'READ',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.PATIENT]
  },
  {
    name: 'drugs:create',
    description: 'Add drugs to database',
    resource: 'drugs',
    action: 'CREATE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR]
  },
  {
    name: 'drugs:update',
    description: 'Update drug information',
    resource: 'drugs',
    action: 'UPDATE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR]
  },
  {
    name: 'drugs:interaction_override',
    description: 'Override drug interaction warnings',
    resource: 'drugs',
    action: 'EXECUTE',
    isSystem: true,
    defaultRoles: [UserRole.DOCTOR]
  },

  // Reports/Medical Records
  {
    name: 'reports:read',
    description: 'View medical reports',
    resource: 'reports',
    action: 'READ',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.PATIENT]
  },
  {
    name: 'reports:create',
    description: 'Create medical reports',
    resource: 'reports',
    action: 'CREATE',
    isSystem: true,
    defaultRoles: [UserRole.DOCTOR, UserRole.NURSE]
  },
  {
    name: 'reports:update',
    description: 'Update medical reports',
    resource: 'reports',
    action: 'UPDATE',
    isSystem: true,
    defaultRoles: [UserRole.DOCTOR, UserRole.NURSE]
  },
  {
    name: 'reports:delete',
    description: 'Delete medical reports',
    resource: 'reports',
    action: 'DELETE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR]
  },

  // Audit Logs
  {
    name: 'audit:read',
    description: 'View audit logs',
    resource: 'audit',
    action: 'READ',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },
  {
    name: 'audit:manage',
    description: 'Full audit management',
    resource: 'audit',
    action: 'MANAGE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },

  // Notifications
  {
    name: 'notifications:read',
    description: 'View notifications',
    resource: 'notifications',
    action: 'READ',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.PATIENT]
  },
  {
    name: 'notifications:create',
    description: 'Send notifications',
    resource: 'notifications',
    action: 'CREATE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR]
  },
  {
    name: 'notifications:manage',
    description: 'Full notification management',
    resource: 'notifications',
    action: 'MANAGE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },

  // Health Tips
  {
    name: 'health_tips:read',
    description: 'View health tips',
    resource: 'health_tips',
    action: 'READ',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.PATIENT]
  },
  {
    name: 'health_tips:create',
    description: 'Create health tips',
    resource: 'health_tips',
    action: 'CREATE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR]
  },
  {
    name: 'health_tips:manage',
    description: 'Full health tips management',
    resource: 'health_tips',
    action: 'MANAGE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },

  // Doctor Availability
  {
    name: 'availability:read',
    description: 'View doctor availability',
    resource: 'availability',
    action: 'READ',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.PATIENT]
  },
  {
    name: 'availability:update',
    description: 'Update doctor availability',
    resource: 'availability',
    action: 'UPDATE',
    isSystem: true,
    defaultRoles: [UserRole.DOCTOR]
  },
  {
    name: 'availability:manage',
    description: 'Full availability management',
    resource: 'availability',
    action: 'MANAGE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },

  // Permissions (Meta)
  {
    name: 'permissions:read',
    description: 'View permissions',
    resource: 'permissions',
    action: 'READ',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },
  {
    name: 'permissions:manage',
    description: 'Full permission management',
    resource: 'permissions',
    action: 'MANAGE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },

  // Admin Dashboard
  {
    name: 'admin:dashboard',
    description: 'Access admin dashboard',
    resource: 'admin',
    action: 'READ',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },
  {
    name: 'admin:manage',
    description: 'Full admin access',
    resource: 'admin',
    action: 'MANAGE',
    isSystem: true,
    defaultRoles: [UserRole.ADMIN]
  },
]

async function seedPermissions() {
  console.log('🔐 Seeding permissions...')

  for (const permDef of SYSTEM_PERMISSIONS) {
    // Upsert the permission
    const permission = await prisma.permission.upsert({
      where: { name: permDef.name },
      update: {
        description: permDef.description,
        resource: permDef.resource,
        action: permDef.action,
        isSystem: permDef.isSystem
      },
      create: {
        name: permDef.name,
        description: permDef.description,
        resource: permDef.resource,
        action: permDef.action,
        isSystem: permDef.isSystem
      }
    })

    console.log(`  ✓ Permission: ${permDef.name}`)

    // Assign to default roles
    for (const role of permDef.defaultRoles) {
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          role,
          permissionId: permission.id,
          grantedBy: 'SYSTEM'
        }
      })
    }
  }

  console.log(`\n✅ Seeded ${SYSTEM_PERMISSIONS.length} permissions`)

  // Print summary by role
  const roles = [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.PATIENT]
  console.log('\n📊 Permission Summary by Role:')
  
  for (const role of roles) {
    const count = await prisma.rolePermission.count({ where: { role } })
    console.log(`  ${role}: ${count} permissions`)
  }
}

async function main() {
  try {
    await seedPermissions()
  } catch (error) {
    console.error('Error seeding permissions:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
