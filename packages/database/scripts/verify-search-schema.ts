/**
 * Schema Verification Script
 *
 * Validates that query filter fields in search.schemas.ts exist in actual Prisma models.
 * Run this before deployment to catch schema mismatches early.
 *
 * Usage:
 *   npm run verify:schema
 *   OR
 *   npx ts-node scripts/verify-search-schema.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

interface ValidationResult {
  model: string
  field: string
  exists: boolean
  expectedType?: string
  actualType?: string
  critical: boolean
}

class SchemaValidator {
  private results: ValidationResult[] = []
  private schemaPath: string
  private schemaContent: string

  constructor() {
    this.schemaPath = path.join(__dirname, '../prisma/schema.prisma')
    this.schemaContent = fs.readFileSync(this.schemaPath, 'utf-8')
  }

  private parseModel(modelName: string): Record<string, string> {
    const modelRegex = new RegExp(`model\\s+${modelName}\\s*{([^}]*)}`, 's')
    const match = this.schemaContent.match(modelRegex)

    if (!match) {
      console.error(
        `${colors.red}✗ Model ${modelName} not found in schema${colors.reset}`
      )
      return {}
    }

    const fields: Record<string, string> = {}
    const fieldLines = match[1].split('\n')

    for (const line of fieldLines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@'))
        continue

      const fieldMatch = trimmed.match(/^(\w+)\s+([\w\[\]\?]+)/)
      if (fieldMatch) {
        const [, fieldName, typeDecl] = fieldMatch
        fields[fieldName] = typeDecl
      }
    }

    return fields
  }

  private checkRelation(modelName: string, relationName: string): boolean {
    const modelRegex = new RegExp(`model\\s+${modelName}\\s*{([^}]*)}`, 's')
    const match = this.schemaContent.match(modelRegex)

    if (!match) return false

    const relationPattern = new RegExp(`\\b${relationName}\\b\\s+\\w+`, 'm')
    return relationPattern.test(match[1])
  }

  validateField(
    modelName: string,
    fieldName: string,
    expectedType?: string,
    critical: boolean = false
  ) {
    const fields = this.parseModel(modelName)
    const exists = fieldName in fields
    const actualType = fields[fieldName]

    this.results.push({
      model: modelName,
      field: fieldName,
      exists,
      expectedType,
      actualType,
      critical,
    })

    if (!exists && critical) {
      console.error(
        `${colors.red}✗ CRITICAL: ${modelName}.${fieldName} does not exist${colors.reset}`
      )
    }
  }

  validateRelation(
    modelName: string,
    relationName: string,
    critical: boolean = true
  ) {
    const exists = this.checkRelation(modelName, relationName)

    this.results.push({
      model: modelName,
      field: `${relationName} (relation)`,
      exists,
      critical,
    })

    if (!exists && critical) {
      console.error(
        `${colors.red}✗ CRITICAL: ${modelName}.${relationName} relation does not exist${colors.reset}`
      )
    }
  }

  validateDoctorModel() {
    console.log(`\n${colors.blue}=== Validating Doctor Model ===${colors.reset}`)

    this.validateField('Doctor', 'id', 'String', true)
    this.validateField('Doctor', 'firstName', 'String', true)
    this.validateField('Doctor', 'lastName', 'String', true)
    this.validateField('Doctor', 'specialization', 'String', true)
    this.validateField('Doctor', 'clinicId', 'String', false)

    // Search filters (optional/warning-only today)
    this.validateField('Doctor', 'acceptingPatients', 'Boolean', false)
    this.validateField('Doctor', 'availability', undefined, false)

    // Relations
    this.validateRelation('Doctor', 'clinic', true)
    this.validateRelation('Doctor', 'appointments', true)
  }

  validateAppointmentModel() {
    console.log(
      `\n${colors.blue}=== Validating Appointment Model ===${colors.reset}`
    )

    this.validateField('Appointment', 'id', 'String', true)
    this.validateField('Appointment', 'patientId', 'String', true)
    this.validateField('Appointment', 'doctorId', 'String', true)
    this.validateField('Appointment', 'dateTime', 'DateTime', true)
    this.validateField('Appointment', 'status', 'String', true)
    this.validateField('Appointment', 'reason', 'String', false)
    this.validateField('Appointment', 'notes', 'String', false)
    this.validateField('Appointment', 'visitType', 'String', false)

    this.validateRelation('Appointment', 'patient', true)
    this.validateRelation('Appointment', 'doctor', true)
    this.validateRelation('Appointment', 'prescriptions', false)
    this.validateRelation('Appointment', 'reports', false)
  }

  validatePatientModel() {
    console.log(
      `\n${colors.blue}=== Validating Patient Model ===${colors.reset}`
    )

    this.validateField('Patient', 'id', 'String', true)
    this.validateField('Patient', 'firstName', 'String', true)
    this.validateField('Patient', 'lastName', 'String', true)
    this.validateField('Patient', 'dateOfBirth', 'DateTime', false)
    this.validateField('Patient', 'bloodGroup', 'String', false)
    this.validateField('Patient', 'allergies', 'Json', false)

    this.validateRelation('Patient', 'appointments', true)
  }

  generateReport() {
    console.log(`\n${colors.blue}=== Validation Report ===${colors.reset}\n`)

    const criticalFailures = this.results.filter(
      (r) => !r.exists && r.critical
    )
    const warnings = this.results.filter((r) => !r.exists && !r.critical)
    const successes = this.results.filter((r) => r.exists)

    console.log(`${colors.green}✓ Passed: ${successes.length}${colors.reset}`)
    console.log(`${colors.yellow}⚠ Warnings: ${warnings.length}${colors.reset}`)
    console.log(
      `${colors.red}✗ Critical Failures: ${criticalFailures.length}${colors.reset}`
    )

    if (warnings.length > 0) {
      console.log(
        `\n${colors.yellow}⚠ Non-critical missing fields (filters will be ignored):${colors.reset}`
      )
      warnings.forEach((w) => {
        console.log(`  - ${w.model}.${w.field}`)
      })
    }

    if (criticalFailures.length > 0) {
      console.log(
        `\n${colors.red}✗ CRITICAL: Required fields missing:${colors.reset}`
      )
      criticalFailures.forEach((f) => {
        console.log(`  - ${f.model}.${f.field}`)
      })
      console.log(
        `\n${colors.red}Action: Update schema.prisma or adjust search schemas before deployment.${colors.reset}`
      )
      process.exit(1)
    }

    console.log(`\n${colors.green}✓ Schema validation complete!${colors.reset}\n`)
    if (warnings.length > 0) {
      console.log(
        `${colors.yellow}Note: ${warnings.length} optional fields are missing but won't cause runtime errors.${colors.reset}`
      )
    }
  }

  async run() {
    console.log(`${colors.blue}Starting schema validation...${colors.reset}`)
    console.log(`Schema file: ${this.schemaPath}\n`)

    this.validateDoctorModel()
    this.validateAppointmentModel()
    this.validatePatientModel()

    this.generateReport()
  }
}

const validator = new SchemaValidator()
validator.run().catch((error) => {
  console.error(
    `${colors.red}Validation failed with error:${colors.reset}`,
    error
  )
  process.exit(1)
})
