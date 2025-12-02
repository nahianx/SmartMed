import path from 'path'
import dotenv from 'dotenv'

// Load the API package .env so tests have the same environment
const envPath = path.resolve(__dirname, '../.env')
dotenv.config({ path: envPath })

// Provide defaults if not present (keeps tests deterministic)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev-test.db'
