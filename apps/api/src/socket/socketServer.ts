import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { authenticateSocket } from './middlewares'
import { registerEventHandlers } from './eventHandlers'
import { setIO } from './io'

export function initializeSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
  })

  io.use(authenticateSocket)

  io.on('connection', (socket) => {
    registerEventHandlers(io, socket)
  })

  setIO(io)
  return io
}
