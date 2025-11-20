import fs from 'fs/promises'
import path from 'path'
import { Readable } from 'stream'
import { createReadStream } from 'fs'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    console.log(`📁 Created upload directory: ${UPLOAD_DIR}`)
  }
}

// Initialize upload directory on service load
ensureUploadDir()

export async function uploadBufferToLocal(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const filePath = path.join(UPLOAD_DIR, key.replace(/\//g, path.sep))
  const directory = path.dirname(filePath)
  
  // Ensure directory exists
  await fs.mkdir(directory, { recursive: true })
  
  // Write file
  await fs.writeFile(filePath, body)
  
  // Store metadata alongside file
  const metadata = {
    contentType,
    size: body.length,
    uploadedAt: new Date().toISOString()
  }
  await fs.writeFile(filePath + '.meta.json', JSON.stringify(metadata, null, 2))
  
  console.log(`📄 File uploaded locally: ${filePath}`)
}

export async function getObjectStreamFromLocal(key: string): Promise<{
  stream: Readable
  contentType: string
}> {
  const filePath = path.join(UPLOAD_DIR, key.replace(/\//g, path.sep))
  const metaPath = filePath + '.meta.json'
  
  // Check if file exists
  try {
    await fs.access(filePath)
  } catch {
    throw new Error('File not found')
  }
  
  // Get metadata
  let contentType = 'application/octet-stream'
  try {
    const metadata = JSON.parse(await fs.readFile(metaPath, 'utf8'))
    contentType = metadata.contentType || contentType
  } catch {
    // Fallback if metadata doesn't exist
  }
  
  const stream = createReadStream(filePath)
  
  return { stream, contentType }
}

export async function deleteFileFromLocal(key: string): Promise<void> {
  const filePath = path.join(UPLOAD_DIR, key.replace(/\//g, path.sep))
  const metaPath = filePath + '.meta.json'
  
  try {
    await fs.unlink(filePath)
    await fs.unlink(metaPath).catch(() => {}) // Ignore if metadata doesn't exist
    console.log(`🗑️ File deleted: ${filePath}`)
  } catch {
    throw new Error('File not found')
  }
}

export async function getFileInfo(key: string): Promise<{
  size: number
  contentType: string
  uploadedAt: string
} | null> {
  const filePath = path.join(UPLOAD_DIR, key.replace(/\//g, path.sep))
  const metaPath = filePath + '.meta.json'
  
  try {
    const stats = await fs.stat(filePath)
    
    // Try to get metadata
    try {
      const metadata = JSON.parse(await fs.readFile(metaPath, 'utf8'))
      return {
        size: stats.size,
        contentType: metadata.contentType || 'application/octet-stream',
        uploadedAt: metadata.uploadedAt || stats.mtime.toISOString()
      }
    } catch {
      // Fallback to file stats
      return {
        size: stats.size,
        contentType: 'application/octet-stream',
        uploadedAt: stats.mtime.toISOString()
      }
    }
  } catch {
    return null
  }
}

// Export with S3-compatible names for drop-in replacement
export const uploadBufferToS3 = uploadBufferToLocal
export const getObjectStreamFromS3 = getObjectStreamFromLocal