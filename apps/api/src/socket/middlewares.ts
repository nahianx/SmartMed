import { Socket } from 'socket.io'
import { TokenService } from '../services/token.service'

export interface SocketUser {
  id: string
  email?: string
  role: string
}

export function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  const rawToken =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization ||
    socket.handshake.query?.token

  const token =
    typeof rawToken === 'string'
      ? rawToken.replace(/^Bearer\s+/i, '').trim()
      : ''

  if (!token) {
    return next(new Error('Unauthorized'))
  }

  try {
    const payload = TokenService.verifyAccessToken(token) as any
    socket.data.user = {
      id: payload.sub || payload.id,
      email: payload.email,
      role: payload.role,
    } as SocketUser
    return next()
  } catch {
    return next(new Error('Unauthorized'))
  }
}
