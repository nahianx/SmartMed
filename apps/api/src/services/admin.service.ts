import { prisma, UserRole } from '@smartmed/database'

interface GetAllUsersOptions {
  role?: string
  search?: string
  page: number
  limit: number
}

interface GetAllUsersResult {
  users: any[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export class AdminService {
  private static validateAdminAccess(adminId: string, adminRole: string) {
    if (adminRole !== UserRole.ADMIN) {
      throw new Error('ADMIN_ACCESS_REQUIRED')
    }
  }

  static async getAllUsers(
    adminId: string,
    options: GetAllUsersOptions
  ): Promise<GetAllUsersResult> {
    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin) throw new Error('ADMIN_NOT_FOUND')

    this.validateAdminAccess(adminId, admin.role)

    const skip = (options.page - 1) * options.limit
    const where: any = {}

    if (options.role) {
      where.role = options.role
    }

    if (options.search) {
      where.OR = [
        { email: { contains: options.search, mode: 'insensitive' } },
        { fullName: { contains: options.search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
          emailVerified: true,
        },
        skip,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    return {
      users,
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    }
  }

  static async getUserById(adminId: string, userId: string) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin) throw new Error('ADMIN_NOT_FOUND')

    this.validateAdminAccess(adminId, admin.role)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        phoneNumber: true,
        dateOfBirth: true,
        gender: true,
      },
    })

    if (!user) throw new Error('USER_NOT_FOUND')

    return user
  }

  static async updateUserRole(
    adminId: string,
    userId: string,
    newRole: string
  ) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin) throw new Error('ADMIN_NOT_FOUND')

    this.validateAdminAccess(adminId, admin.role)

    if (userId === adminId) {
      throw new Error('CANNOT_MODIFY_OWN_ROLE')
    }

    const validRoles = [
      UserRole.ADMIN,
      UserRole.DOCTOR,
      UserRole.PATIENT,
      UserRole.NURSE,
    ]
    if (!validRoles.includes(newRole as any)) {
      throw new Error('INVALID_ROLE')
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('USER_NOT_FOUND')

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return updatedUser
  }

  static async activateUser(adminId: string, userId: string) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin) throw new Error('ADMIN_NOT_FOUND')

    this.validateAdminAccess(adminId, admin.role)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('USER_NOT_FOUND')

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return updatedUser
  }

  static async deactivateUser(adminId: string, userId: string) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin) throw new Error('ADMIN_NOT_FOUND')

    this.validateAdminAccess(adminId, admin.role)

    if (userId === adminId) {
      throw new Error('CANNOT_DEACTIVATE_OWN_ACCOUNT')
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('USER_NOT_FOUND')

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return updatedUser
  }

  static async promoteUserToAdmin(adminId: string, userId: string) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin) throw new Error('ADMIN_NOT_FOUND')

    this.validateAdminAccess(adminId, admin.role)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('USER_NOT_FOUND')

    if (user.role === UserRole.ADMIN) {
      throw new Error('USER_ALREADY_ADMIN')
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.ADMIN },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return updatedUser
  }

  static async demoteUserFromAdmin(adminId: string, userId: string) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin) throw new Error('ADMIN_NOT_FOUND')

    this.validateAdminAccess(adminId, admin.role)

    if (userId === adminId) {
      throw new Error('CANNOT_DEMOTE_SELF')
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('USER_NOT_FOUND')

    if (user.role !== UserRole.ADMIN) {
      throw new Error('USER_NOT_ADMIN')
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.PATIENT },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return updatedUser
  }

  static async getDashboardStats(adminId: string) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin) throw new Error('ADMIN_NOT_FOUND')

    this.validateAdminAccess(adminId, admin.role)

    const [totalUsers, admins, doctors, patients, activeUsers] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: UserRole.ADMIN } }),
        prisma.user.count({ where: { role: UserRole.DOCTOR } }),
        prisma.user.count({ where: { role: UserRole.PATIENT } }),
        prisma.user.count({ where: { isActive: true } }),
      ])

    return {
      totalUsers,
      admins,
      doctors,
      patients,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
    }
  }
}
