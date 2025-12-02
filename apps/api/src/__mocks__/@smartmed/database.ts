/* eslint-disable no-undef */
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  emailVerification: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  passwordReset: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
  userSession: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  // allow spreading for other Prisma exports
}

module.exports = {
  prisma: mockPrisma,
  UserRole: {
    ADMIN: 'ADMIN',
    DOCTOR: 'DOCTOR',
    PATIENT: 'PATIENT',
    NURSE: 'NURSE',
  },
  AuthProvider: {
    LOCAL: 'LOCAL',
    GOOGLE: 'GOOGLE',
  },
}
