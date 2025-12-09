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

function httpError(message: string, status: number) {
  const error: any = new Error(message)
  error.status = status
  return error
}

export class AdminService {
  private static validateAdminAccess(adminId: string, adminRole: string) {
    if (adminRole !== UserRole.ADMIN) {
      throw httpError('ADMIN_ACCESS_REQUIRED', 403)
    }
  }

  static async getAllUsers(
    adminId: string,
    options: GetAllUsersOptions
  ): Promise<GetAllUsersResult> {
    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin) throw httpError('ADMIN_NOT_FOUND', 404)

    this.validateAdminAccess(adminId, admin.role)

    const page = Number.isFinite(options.page) && options.page > 0 ? options.page : 1
    const limit = Number.isFinite(options.limit) && options.limit > 0 ? options.limit : 20
    const skip = (page - 1) * limit
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
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  static async getUserById(adminId: string, userId: string) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin) throw httpError('ADMIN_NOT_FOUND', 404)

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

    if (!user) throw httpError('USER_NOT_FOUND', 404)

    return user
  }

  static async updateUserRole(
    adminId: string,
    userId: string,
    newRole: string
  ) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin) throw httpError('ADMIN_NOT_FOUND', 404)

    this.validateAdminAccess(adminId, admin.role)

    if (userId === adminId) {
      throw httpError('CANNOT_MODIFY_OWN_ROLE', 400)
    }

    const validRoles = [
      UserRole.ADMIN,
      UserRole.DOCTOR,
      UserRole.PATIENT,
      UserRole.NURSE,
    ]
    if (!validRoles.includes(newRole as any)) {
      throw httpError('INVALID_ROLE', 400)
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw httpError('USER_NOT_FOUND', 404)

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as UserRole },
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
    if (!admin) throw httpError('ADMIN_NOT_FOUND', 404)

    this.validateAdminAccess(adminId, admin.role)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw httpError('USER_NOT_FOUND', 404)

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
    if (!admin) throw httpError('ADMIN_NOT_FOUND', 404)

    this.validateAdminAccess(adminId, admin.role)

    if (userId === adminId) {
      throw httpError('CANNOT_DEACTIVATE_OWN_ACCOUNT', 400)
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw httpError('USER_NOT_FOUND', 404)

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
    if (!admin) throw httpError('ADMIN_NOT_FOUND', 404)

    this.validateAdminAccess(adminId, admin.role)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw httpError('USER_NOT_FOUND', 404)

    if (user.role === UserRole.ADMIN) {
      throw httpError('USER_ALREADY_ADMIN', 400)
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
    if (!admin) throw httpError('ADMIN_NOT_FOUND', 404)

    this.validateAdminAccess(adminId, admin.role)

    if (userId === adminId) {
      throw httpError('CANNOT_DEMOTE_SELF', 400)
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw httpError('USER_NOT_FOUND', 404)

    if (user.role !== UserRole.ADMIN) {
      throw httpError('USER_NOT_ADMIN', 400)
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
    if (!admin) throw httpError('ADMIN_NOT_FOUND', 404)

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
