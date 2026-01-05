import dotenv from 'dotenv'

dotenv.config()
// ==========================================
// Environment Configuration
// ==========================================

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  
  // RxNav API Configuration
  RXNAV_API_BASE_URL: process.env.RXNAV_API_BASE_URL || 'https://rxnav.nlm.nih.gov/REST',
  RXNAV_API_TIMEOUT: parseInt(process.env.RXNAV_API_TIMEOUT || '10000', 10),
  
  // Cache Configuration
  REDIS_URL: process.env.REDIS_URL || '',
  DRUG_CACHE_TTL: parseInt(process.env.DRUG_CACHE_TTL || '86400', 10), // 24 hours in seconds
  DRUG_SEARCH_CACHE_TTL: parseInt(process.env.DRUG_SEARCH_CACHE_TTL || '3600', 10), // 1 hour
  INTERACTION_CACHE_TTL: parseInt(process.env.INTERACTION_CACHE_TTL || '86400', 10), // 24 hours
  
  // Feature Flags
  INTERACTION_CHECK_ENABLED: process.env.INTERACTION_CHECK_ENABLED !== 'false',
  ALLERGY_CHECK_ENABLED: process.env.ALLERGY_CHECK_ENABLED !== 'false',
  DRUG_SUGGESTIONS_ENABLED: process.env.DRUG_SUGGESTIONS_ENABLED !== 'false',
  
  // Rate Limiting
  DRUG_SEARCH_RATE_LIMIT: parseInt(process.env.DRUG_SEARCH_RATE_LIMIT || '100', 10), // requests per minute
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // SMTP Email Configuration
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',

  // Resend Email Configuration
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'SmartMed <onboarding@resend.dev>',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // MFA Configuration
  MFA_ENCRYPTION_KEY: process.env.MFA_ENCRYPTION_KEY || '',
}

// Validate critical environment variables
export function validateEnv(): void {
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET']
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0 && env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }
  
  // Log RxNav configuration status
  if (env.NODE_ENV === 'development') {
    console.log(`[Config] RxNav API: ${env.RXNAV_API_BASE_URL}`)
    console.log(`[Config] Drug features enabled: suggestions=${env.DRUG_SUGGESTIONS_ENABLED}, interactions=${env.INTERACTION_CHECK_ENABLED}, allergies=${env.ALLERGY_CHECK_ENABLED}`)
    console.log(`[Config] Cache: Redis=${env.REDIS_URL ? 'configured' : 'not configured (using in-memory)'}`)
    console.log(`[Config] SMTP: ${env.SMTP_USER ? 'configured' : 'not configured (prescription emails disabled)'}`)
    console.log(`[Config] Resend: ${env.RESEND_API_KEY ? 'configured' : 'not configured (using dev mode)'}`)
    console.log(`[Config] MFA: ${env.MFA_ENCRYPTION_KEY ? 'configured' : 'not configured (using auto-generated key)'}`)
  }
}

export default env