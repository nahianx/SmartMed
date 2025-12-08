import { Request, Response } from 'express'
import { AdminService } from 'src/services/admin.service'

export class AdminController {
  static async getAllUsers(req: Request, res: Response) {
    const adminId = (req as any).user.id as string
    const { role, search, page = 1, limit = 20 } = req.query

    const result = await AdminService.getAllUsers(adminId, {
      role: role as string,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    })

    res.json(result)
  }

  static async getUserById(req: Request, res: Response) {
    const adminId = (req as any).user.id as string
    const { userId } = req.params

    const user = await AdminService.getUserById(adminId, userId)
    res.json(user)
  }

  static async updateUserRole(req: Request, res: Response) {
    const adminId = (req as any).user.id as string
    const { userId } = req.params
    const { newRole } = req.body

    const user = await AdminService.updateUserRole(adminId, userId, newRole)
    res.json(user)
  }

  static async activateUser(req: Request, res: Response) {
    const adminId = (req as any).user.id as string
    const { userId } = req.params

    const user = await AdminService.activateUser(adminId, userId)
    res.json(user)
  }

  static async deactivateUser(req: Request, res: Response) {
    const adminId = (req as any).user.id as string
    const { userId } = req.params

    const user = await AdminService.deactivateUser(adminId, userId)
    res.json(user)
  }

  static async promoteUserToAdmin(req: Request, res: Response) {
    const adminId = (req as any).user.id as string
    const { userId } = req.params

    const user = await AdminService.promoteUserToAdmin(adminId, userId)
    res.json(user)
  }

  static async demoteUserFromAdmin(req: Request, res: Response) {
    const adminId = (req as any).user.id as string
    const { userId } = req.params

    const user = await AdminService.demoteUserFromAdmin(adminId, userId)
    res.json(user)
  }

  static async getDashboardStats(req: Request, res: Response) {
    const adminId = (req as any).user.id as string

    const stats = await AdminService.getDashboardStats(adminId)
    res.json(stats)
  }
}
