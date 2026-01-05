'use client'

import { io, type Socket } from 'socket.io-client'
import { tokenManager } from '../utils/tokenManager'
import { SOCKET_EVENTS } from './socketConstants'
import { getSocketBase } from '../utils/apiBase'

type ListenerMap = Map<string, Array<(...args: any[]) => void>>

class SocketService {
  private socket: Socket | null = null
  private listeners: ListenerMap = new Map()

  connect(token?: string) {
    if (this.socket?.connected) {
      return this.socket
    }

    const authToken = token || tokenManager.getAccessToken()
    const apiBase = getSocketBase()

    this.socket = io(apiBase, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    this.socket.on(SOCKET_EVENTS.CONNECTION, () => {
      // eslint-disable-next-line no-console
      console.log('Socket connected', this.socket?.id)
    })

    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      // eslint-disable-next-line no-console
      console.log('Socket disconnected', reason)
    })

    return this.socket
  }

  joinDoctorQueue(
    doctorId: string,
    callback?: (response: { ok: boolean; error?: string; queue?: any[]; doctorStatus?: any }) => void
  ) {
    this.socket?.emit(SOCKET_EVENTS.QUEUE_JOIN, { doctorId }, callback)
  }

  leaveDoctorQueue(doctorId: string) {
    this.socket?.emit(SOCKET_EVENTS.QUEUE_LEAVE, { doctorId })
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) return
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)?.push(callback)
    this.socket.on(event, callback)
  }

  off(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) return
    this.socket.off(event, callback)
    const list = this.listeners.get(event)
    if (!list) return
    const idx = list.indexOf(callback)
    if (idx >= 0) list.splice(idx, 1)
  }

  emit(event: string, payload?: unknown, callback?: (...args: any[]) => void) {
    this.socket?.emit(event, payload, callback)
  }

  disconnect() {
    if (!this.socket) return
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => this.socket?.off(event, callback))
    })
    this.listeners.clear()
    this.socket.disconnect()
    this.socket = null
  }
}

export const socketService = new SocketService()
