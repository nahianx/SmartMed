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
