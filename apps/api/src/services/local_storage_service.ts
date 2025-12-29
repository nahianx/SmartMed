import fs from 'fs/promises'
import path from 'path'
import { Readable } from 'stream'
import { createReadStream } from 'fs'

const STORAGE_ROOT =
  process.env.LOCAL_STORAGE_ROOT || path.join(process.cwd(), 'uploads', 'reports')
const RESOLVED_ROOT = path.resolve(STORAGE_ROOT)

async function ensureUploadDir() {
  try {
    await fs.access(RESOLVED_ROOT)
  } catch {
    await fs.mkdir(RESOLVED_ROOT, { recursive: true })
    console.log(`Created upload directory: ${RESOLVED_ROOT}`)
  }
}

ensureUploadDir()

function resolveStoragePath(key: string) {
  const normalizedKey = key.replace(/\//g, path.sep)
  const fullPath = path.resolve(RESOLVED_ROOT, normalizedKey)
  const rootPrefix = RESOLVED_ROOT.endsWith(path.sep)
    ? RESOLVED_ROOT
    : `${RESOLVED_ROOT}${path.sep}`
  if (!fullPath.startsWith(rootPrefix)) {
    throw new Error('Invalid storage path')
  }
  return fullPath
}

export async function uploadBufferToLocal(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const filePath = resolveStoragePath(key)
  const directory = path.dirname(filePath)

  await fs.mkdir(directory, { recursive: true })
  await fs.writeFile(filePath, body)

  const metadata = {
    contentType,
    size: body.length,
    uploadedAt: new Date().toISOString(),
  }
  await fs.writeFile(filePath + '.meta.json', JSON.stringify(metadata, null, 2))

  console.log(`File uploaded locally: ${filePath}`)
}

export async function getObjectStreamFromLocal(key: string): Promise<{
  stream: Readable
  contentType: string
}> {
  const filePath = resolveStoragePath(key)
  const metaPath = filePath + '.meta.json'

  try {
    await fs.access(filePath)
  } catch {
    const error = new Error('File not found')
    ;(error as NodeJS.ErrnoException).code = 'ENOENT'
    throw error
  }

  let contentType = 'application/octet-stream'
  try {
    const metadata = JSON.parse(await fs.readFile(metaPath, 'utf8'))
    contentType = metadata.contentType || contentType
  } catch {
    // ignore missing metadata
  }

  const stream = createReadStream(filePath)

  return { stream, contentType }
}

export async function deleteFileFromLocal(key: string): Promise<void> {
  const filePath = resolveStoragePath(key)
  const metaPath = filePath + '.meta.json'

  try {
    await fs.unlink(filePath)
    await fs.unlink(metaPath).catch(() => {})
    console.log(`File deleted: ${filePath}`)
  } catch {
    const error = new Error('File not found')
    ;(error as NodeJS.ErrnoException).code = 'ENOENT'
    throw error
  }
}

export async function getFileInfo(key: string): Promise<{
  size: number
  contentType: string
  uploadedAt: string
} | null> {
  let filePath: string
  try {
    filePath = resolveStoragePath(key)
  } catch {
    return null
  }
  const metaPath = filePath + '.meta.json'

  try {
    const stats = await fs.stat(filePath)

    try {
      const metadata = JSON.parse(await fs.readFile(metaPath, 'utf8'))
      return {
        size: stats.size,
        contentType: metadata.contentType || 'application/octet-stream',
        uploadedAt: metadata.uploadedAt || stats.mtime.toISOString(),
      }
    } catch {
      return {
        size: stats.size,
        contentType: 'application/octet-stream',
        uploadedAt: stats.mtime.toISOString(),
      }
    }
  } catch {
    return null
  }
}

export const uploadBufferToS3 = uploadBufferToLocal
export const getObjectStreamFromS3 = getObjectStreamFromLocal
