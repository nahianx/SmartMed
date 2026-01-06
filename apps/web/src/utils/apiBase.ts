const DEFAULT_API_BASE = 'http://localhost:4000'

function normalizeBase(value: string): string {
  return value.replace(/\/$/, '')
}

export function getApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    DEFAULT_API_BASE
  return normalizeBase(raw).replace(/\/api$/, '')
}

export function getApiBaseWithApi(): string {
  return `${getApiBase()}/api`
}

export function getSocketBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    DEFAULT_API_BASE
  return normalizeBase(raw).replace(/\/api$/, '')
}

/**
 * Resolve a profile photo URL to a full URL.
 * If the URL starts with '/', it's a relative path from the API server.
 * Otherwise, return as-is (already a full URL).
 */
export function resolveProfilePhotoUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  // Relative URL from API server (e.g., /uploads/profile-photos/...)
  return `${getApiBase()}${url}`
}
