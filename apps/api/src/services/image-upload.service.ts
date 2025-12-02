import path from 'path'
import fs from 'fs'
import multer from 'multer'
import sharp from 'sharp'
import { prisma } from '@smartmed/database'

const uploadsDir = path.join(process.cwd(), 'uploads', 'profile-photos')

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.memoryStorage()

export const profilePhotoUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'))
    }
    cb(null, true)
  },
})

export async function processAndStoreProfilePhoto(
  userId: string,
  file: Express.Multer.File,
) {
  const filename = `${userId}-${Date.now()}.jpg`
  const filepath = path.join(uploadsDir, filename)

  await sharp(file.buffer)
    .resize(256, 256, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toFile(filepath)

  const url = `/uploads/profile-photos/${filename}`

  await prisma.user.update({
    where: { id: userId },
    data: { profilePhotoUrl: url },
  })

  return url
}

export async function removeProfilePhoto(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.profilePhotoUrl) return

  const filename = path.basename(user.profilePhotoUrl)
  const filepath = path.join(uploadsDir, filename)

  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath)
  }

  await prisma.user.update({
    where: { id: userId },
    data: { profilePhotoUrl: null },
  })
}
