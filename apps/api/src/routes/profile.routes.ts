import { Router, Response } from 'express'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { getProfile, updateProfile, updatePassword, setMfaEnabled } from '../services/profile.service'
import { profileUpdateSchema, passwordChangeSchema, mfaUpdateSchema, validate } from '../services/validation.service'
import {
  profilePhotoUpload,
  processAndStoreProfilePhoto,
  removeProfilePhoto,
} from '../services/image-upload.service'

const router = Router()
router.use(requireAuth)

const resolveUserId = (req: AuthenticatedRequest, res: Response) => {
  const userId =
    req.user?.id ||
    (typeof req.query.userId === 'string' ? req.query.userId : undefined) ||
    (req.body?.userId as string | undefined)
  if (!userId) {
    res.status(400).json({ error: 'userId is required' })
    return null
  }
  return userId
}

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = resolveUserId(req, res)
    if (!userId) return
    const profile = await getProfile(userId)
    res.json(profile)
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to load profile' })
  }
})

router.put('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = resolveUserId(req, res)
    if (!userId) return
    const body = validate(profileUpdateSchema, req.body)
    const updated = await updateProfile(userId, body)
    res.json({ message: 'Profile updated', user: updated })
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to update profile' })
  }
})

router.post(
  '/photo',
  profilePhotoUpload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = resolveUserId(req, res)
      if (!userId) return
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }
      const url = await processAndStoreProfilePhoto(userId, req.file)
      res.status(201).json({ url })
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message || 'Failed to upload photo' })
    }
  },
)

router.delete('/photo', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = resolveUserId(req, res)
    if (!userId) return
    await removeProfilePhoto(userId)
    res.json({ message: 'Profile photo removed' })
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to remove photo' })
  }
})

router.post(
  '/password',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = resolveUserId(req, res)
      if (!userId) return
      const body = validate(passwordChangeSchema, req.body)
      await updatePassword(userId, body.currentPassword, body.newPassword)
      res.json({ message: 'Password updated successfully' })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to update password' })
    }
  },
)

router.post('/mfa', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = resolveUserId(req, res)
    if (!userId) return
    const body = validate(mfaUpdateSchema, req.body)
    await setMfaEnabled(userId, body.enabled)
    res.json({ message: body.enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled' })
  } catch (error: any) {
    res
      .status(error.status || 500)
      .json({ error: error.message || 'Failed to update MFA settings' })
  }
})

export default router
