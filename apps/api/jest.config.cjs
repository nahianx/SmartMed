/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: 'src',
  setupFiles: ['<rootDir>/jest.setup.ts'],
}
