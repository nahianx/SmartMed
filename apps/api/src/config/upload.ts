const DEFAULT_MAX_UPLOAD_MB = 20
const rawMaxUpload = Number(process.env.MAX_UPLOAD_SIZE_MB || DEFAULT_MAX_UPLOAD_MB)

export const MAX_UPLOAD_SIZE_MB =
  Number.isFinite(rawMaxUpload) && rawMaxUpload > 0
    ? rawMaxUpload
    : DEFAULT_MAX_UPLOAD_MB

export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
