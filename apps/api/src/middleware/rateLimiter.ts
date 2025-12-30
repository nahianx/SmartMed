import { Request, Response, NextFunction } from 'express'

interface Entry {
  count: number
  firstRequestAt: number
}

const store = new Map<string, Entry>()

export function rateLimiter(maxAttempts: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`
    const now = Date.now()
    const existing = store.get(key)

    if (!existing) {
      store.set(key, { count: 1, firstRequestAt: now })
      return next()
    }

    if (now - existing.firstRequestAt > windowMs) {
      store.set(key, { count: 1, firstRequestAt: now })
      return next()
    }

    if (existing.count >= maxAttempts) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowMs - (now - existing.firstRequestAt)) / 1000)
      )
      res.setHeader('Retry-After', retryAfterSeconds.toString())
      return res.status(429).json({ error: 'Too many requests. Please try again later.' })
    }

    existing.count += 1
    store.set(key, existing)
    next()
  }
}
