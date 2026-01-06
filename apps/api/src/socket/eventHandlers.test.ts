import { jest } from '@jest/globals'
import { registerEventHandlers } from './eventHandlers'
import { SOCKET_EVENTS } from './constants'
import { getQueueState } from '../services/queue.service'

jest.mock('../services/queue.service', () => ({
  getQueueState: jest.fn(),
  addWalkIn: jest.fn(),
  callNextPatient: jest.fn(),
  checkInAppointment: jest.fn(),
  completeConsultation: jest.fn(),
  updateQueuePosition: jest.fn(),
  updateQueueStatus: jest.fn(),
}))

const mockGetQueueState = getQueueState as jest.MockedFunction<
  typeof getQueueState
>

function createSocket(user: { id: string; role: string }) {
  const handlers = new Map<string, (...args: any[]) => void>()
  const socket = {
    data: { user },
    on: jest.fn((event: string, handler: (...args: any[]) => void) => {
      handlers.set(event, handler)
    }),
    join: jest.fn(),
    leave: jest.fn(),
  } as any

  return { socket, handlers }
}

describe('queue:join RBAC', () => {
  const doctorId = '11111111-1111-1111-1111-111111111111'

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetQueueState.mockResolvedValue({ doctorStatus: null, queue: [] })
  })

  it('rejects non-staff users', async () => {
    const { socket, handlers } = createSocket({
      id: 'user-1',
      role: 'PATIENT',
    })
    registerEventHandlers({} as any, socket)

    const ack = jest.fn()
    const handler = handlers.get(SOCKET_EVENTS.QUEUE_JOIN)
    expect(handler).toBeDefined()

    await handler?.({ doctorId }, ack)

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Forbidden' })
    expect(socket.join).not.toHaveBeenCalledWith(`doctor:${doctorId}:queue`)
    expect(mockGetQueueState).not.toHaveBeenCalled()
  })

  it('allows staff users to join a queue room', async () => {
    const { socket, handlers } = createSocket({
      id: 'user-2',
      role: 'ADMIN',
    })
    registerEventHandlers({} as any, socket)

    const ack = jest.fn()
    const handler = handlers.get(SOCKET_EVENTS.QUEUE_JOIN)
    expect(handler).toBeDefined()

    await handler?.({ doctorId }, ack)

    expect(socket.join).toHaveBeenCalledWith(`doctor:${doctorId}:queue`)
    expect(mockGetQueueState).toHaveBeenCalledWith(doctorId, { includePatientDetails: true })
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, queue: [] })
    )
  })
})
