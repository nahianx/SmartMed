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
  },
}

module.exports = createJestConfig(customJestConfig)
