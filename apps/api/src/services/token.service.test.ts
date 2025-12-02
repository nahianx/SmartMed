import { TokenService } from "./token.service"

// Minimal mock for Prisma client used in TokenService
jest.mock("@smartmed/database", () => {
  return {
    prisma: {
      userSession: {
        create: jest.fn().mockResolvedValue({ id: "session-1" }),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    },
  }
})

describe("TokenService", () => {
  const originalEnv = process.env

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: "test-secret",
      JWT_REFRESH_SECRET: "test-refresh-secret",
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("generates and verifies access tokens", () => {
    const user: any = { id: "u1", email: "user@example.com", role: "DOCTOR" }
    const token = TokenService.generateAccessToken(user)
    const payload: any = TokenService.verifyAccessToken(token)
    expect(payload.sub).toBe("u1")
    expect(payload.email).toBe("user@example.com")
  })
})
