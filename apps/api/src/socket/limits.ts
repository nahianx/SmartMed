import type { Socket } from 'socket.io'

const MAX_CONNECTIONS_PER_USER = Number(
  process.env.SOCKET_MAX_CONNECTIONS_PER_USER || 3
)
const EVENT_RATE_LIMIT = Number(process.env.SOCKET_EVENT_RATE_LIMIT || 60)
const EVENT_RATE_WINDOW_MS = Number(
  process.env.SOCKET_EVENT_RATE_WINDOW_MS || 10_000
)
const USER_EVENT_RATE_LIMIT = Number(
  process.env.SOCKET_USER_EVENT_RATE_LIMIT || 120
)
const USER_EVENT_WINDOW_MS = Number(
  process.env.SOCKET_USER_EVENT_WINDOW_MS || EVENT_RATE_WINDOW_MS
)
const MAX_PAYLOAD_BYTES = Number(process.env.SOCKET_MAX_PAYLOAD_BYTES || 50_000)

type Counter = { count: number; resetAt: number }

const userConnectionCounts = new Map<string, number>()
const userEventCounters = new Map<string, Counter>()

function getUserCounter(userId: string) {
  const now = Date.now()
  const existing = userEventCounters.get(userId)
  if (!existing || now > existing.resetAt) {
    const counter = { count: 0, resetAt: now + USER_EVENT_WINDOW_MS }
    userEventCounters.set(userId, counter)
    return counter
  }
  return existing
}

function estimatePayloadBytes(packet: any[]) {
  const args = packet.slice(1)
  const payloadArgs =
    typeof args[args.length - 1] === 'function' ? args.slice(0, -1) : args
  try {
    return Buffer.byteLength(JSON.stringify(payloadArgs), 'utf8')
  } catch {
    return MAX_PAYLOAD_BYTES + 1
  }
}

export function registerConnectionLimit(socket: Socket) {
  const userId = socket.data.user?.id
  if (!userId) {
    socket.emit('error', 'Unauthorized')
    socket.disconnect(true)
    return false
  }

  const current = userConnectionCounts.get(userId) || 0
  if (current >= MAX_CONNECTIONS_PER_USER) {
    socket.emit('error', 'Too many connections')
    socket.disconnect(true)
    return false
  }

  userConnectionCounts.set(userId, current + 1)
  socket.once('disconnect', () => {
    const next = (userConnectionCounts.get(userId) || 1) - 1
    if (next <= 0) {
      userConnectionCounts.delete(userId)
      userEventCounters.delete(userId)
    } else {
      userConnectionCounts.set(userId, next)
    }
  })

  return true
}

export function attachSocketGuards(socket: Socket) {
  let counter: Counter = {
    count: 0,
    resetAt: Date.now() + EVENT_RATE_WINDOW_MS,
  }

  socket.use((packet, next) => {
    const now = Date.now()
    if (now > counter.resetAt) {
      counter = { count: 0, resetAt: now + EVENT_RATE_WINDOW_MS }
    }
    counter.count += 1
    if (counter.count > EVENT_RATE_LIMIT) {
      return next(new Error('Rate limit exceeded'))
    }

    const userId = socket.data.user?.id
    if (userId) {
      const userCounter = getUserCounter(userId)
      userCounter.count += 1
      if (userCounter.count > USER_EVENT_RATE_LIMIT) {
        return next(new Error('User rate limit exceeded'))
      }
    }

    if (estimatePayloadBytes(packet) > MAX_PAYLOAD_BYTES) {
      return next(new Error('Payload too large'))
    }

    return next()
  })
}
