import { Router, Response } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth'
import { getProfile, updateProfile, updatePassword, setMfaEnabled } from '../services/profile.service'
import { profileUpdateSchema, passwordChangeSchema, mfaUpdateSchema, validate } from '../services/validation.service'
import {
  profilePhotoUpload,
  processAndStoreProfilePhoto,
  removeProfilePhoto,
} from '../services/image-upload.service'

const router = Router()

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = await getProfile(req.user!.id)
    res.json(profile)
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to load profile' })
  }
})

router.put('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = validate(profileUpdateSchema, req.body)
    const updated = await updateProfile(req.user!.id, body)
    res.json({ message: 'Profile updated', user: updated })
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to update profile' })
  }
})

router.post(
  '/photo',
  requireAuth,
  profilePhotoUpload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }
      const url = await processAndStoreProfilePhoto(req.user!.id, req.file)
      res.status(201).json({ url })
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message || 'Failed to upload photo' })
    }
  },
)

router.delete('/photo', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await removeProfilePhoto(req.user!.id)
    res.json({ message: 'Profile photo removed' })
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to remove photo' })
  }
})

router.post(
  '/password',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = validate(passwordChangeSchema, req.body)
      await updatePassword(req.user!.id, body.currentPassword, body.newPassword)
      res.json({ message: 'Password updated successfully' })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to update password' })
    }
  },
)

router.post('/mfa', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = validate(mfaUpdateSchema, req.body)
    await setMfaEnabled(req.user!.id, body.enabled)
    res.json({ message: body.enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled' })
  } catch (error: any) {
    res
      .status(error.status || 500)
      .json({ error: error.message || 'Failed to update MFA settings' })
  }
})

export default router
