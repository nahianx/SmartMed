import { Request, Response, NextFunction } from 'express'
import { z, ZodSchema, ZodError } from 'zod'

// Simple body validation middleware (from OAuth branch)
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.format() })
    }
    req.body = result.data
    next()
  }
}

// Comprehensive validation middleware factory (from timeline branch)
export const validateSchema = (schemas: {
  body?: z.ZodSchema
  params?: z.ZodSchema
  query?: z.ZodSchema
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schemas.body) {
        const validatedBody = schemas.body.parse(req.body)
        req.body = validatedBody
      }

      // Validate request parameters
      if (schemas.params) {
        const validatedParams = schemas.params.parse(req.params)
        req.params = validatedParams
      }

      // Validate query parameters
      if (schemas.query) {
        const validatedQuery = schemas.query.parse(req.query)
        req.query = validatedQuery
      }

      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => {
          const path = err.path.join('.')
          return {
            field: path || 'unknown',
            message: err.message,
            code: err.code
          }
        })

        return res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors,
          message: 'Please check your input and try again'
        })
      }

      // Handle other errors  
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      process.stderr.write(`Validation middleware error: ${errorMessage}\n`)
      
      return res.status(500).json({
        error: 'Internal server error during validation'
      })
    }
  }
}

// Helper to validate a single value
export const validateValue = <T>(schema: z.ZodSchema<T>, value: unknown): { 
  success: true, data: T 
} | { 
  success: false, errors: z.ZodError['errors'] 
} => {
  try {
    const data = schema.parse(value)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, errors: error.errors }
    }
    throw error
  }
}
