import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'

const bucket = process.env.S3_BUCKET_NAME

if (!bucket) {
  console.warn('S3_BUCKET_NAME is not set. Report upload/download will not work until configured.')
}

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
})

export async function uploadBufferToS3(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  if (!bucket) throw new Error('S3_BUCKET_NAME is not configured')

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

export async function getObjectStreamFromS3(key: string): Promise<{ stream: Readable; contentType?: string }> {
  if (!bucket) throw new Error('S3_BUCKET_NAME is not configured')

  const result = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  )

  const body = result.Body
  if (!body || !(body instanceof Readable || typeof (body as any).pipe === 'function')) {
    throw new Error('Invalid S3 body stream')
  }

  const stream = body as Readable
  const contentType = result.ContentType

  return { stream, contentType: contentType || undefined }
}
