const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  moduleNameMapper: {
    // Handle CSS imports (if you import CSS modules in components)
    '^.+\\.(css|scss|sass)$': '<rootDir>/node_modules/jest-css-modules',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/src/services/api.test.ts',
    '<rootDir>/tests/integration/',
    '<rootDir>/tests/components/pdf_viewer.test.tsx',
    '<rootDir>/tests/lib/error_utils.test.ts',
    '<rootDir>/src/app/auth/register/doctor/page.test.tsx',
    '<rootDir>/src/app/profile/page.test.tsx',
    '<rootDir>/src/e2e/profile-workflow.test.tsx',
    '<rootDir>/src/components/profile/ProfileSection.test.tsx',
    '<rootDir>/src/components/profile/SecuritySection.test.tsx',
  ],
}

module.exports = createJestConfig(customJestConfig)
