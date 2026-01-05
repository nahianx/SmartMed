/**
 * Activity Timeline Search Service
 *
 * Provides PostgreSQL full-text search functionality for the activity timeline.
 * Uses tsvector/tsquery for efficient searching with ranking and highlighting.
 */

import { prisma, Prisma, ActivityType, AppointmentStatus } from '@smartmed/database'

/**
 * Search result with highlighted matches
 */
export interface ActivitySearchResult {
  id: string
  type: ActivityType
  occurredAt: Date
  patientId: string
  doctorId: string | null
  appointmentId: string | null
  prescriptionId: string | null
  reportId: string | null
  title: string
  subtitle: string | null
  tags: any
  status: AppointmentStatus | null
  notes: string | null
  vitals: any
  // Search-specific fields
  rank: number
  highlightedTitle: string | null
  highlightedSubtitle: string | null
  highlightedNotes: string | null
}

/**
 * Full-text search options
 */
export interface SearchOptions {
  /** Search query string */
  query: string
  /** Patient ID to scope search (required for patient role) */
  patientId?: string
  /** Doctor ID to scope search (required for doctor role) */
  doctorId?: string
  /** Filter by activity types */
  types?: ActivityType[]
  /** Filter by statuses */
  statuses?: AppointmentStatus[]
  /** Date range start */
  from?: Date
  /** Date range end */
  to?: Date
  /** Maximum results to return (default: 50) */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

/**
 * Sanitizes search input to create a safe tsquery string
 * Converts user input to a web-style search query (prefix matching)
 */
function sanitizeSearchQuery(query: string): string {
  // Remove special characters that could break tsquery
  const sanitized = query
    .replace(/[&|!:*()'"<>\\]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(term => term.length >= 2) // Minimum 2 characters per term
    .map(term => `${term}:*`) // Add prefix matching
    .join(' & ') // AND all terms together

  return sanitized || ''
}

/**
 * Performs full-text search on activities using PostgreSQL tsvector
 *
 * @param options Search options including query, filters, and pagination
 * @returns Array of search results with rank and highlighted matches
 */
export async function searchActivities(
  options: SearchOptions
): Promise<ActivitySearchResult[]> {
  const {
    query,
    patientId,
    doctorId,
    types,
    statuses,
    from,
    to,
    limit = 50,
    offset = 0,
  } = options

  // Sanitize and validate the query
  const searchQuery = sanitizeSearchQuery(query)
  
  if (!searchQuery) {
    // If no valid search terms, return empty results
    return []
  }

  // Build the WHERE conditions
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  // Add full-text search condition
  conditions.push(`search_vector @@ to_tsquery('english', $${paramIndex})`)
  params.push(searchQuery)
  paramIndex++

  // Scope by patient or doctor
  if (patientId) {
    conditions.push(`"patientId" = $${paramIndex}`)
    params.push(patientId)
    paramIndex++
  }

  if (doctorId) {
    conditions.push(`"doctorId" = $${paramIndex}`)
    params.push(doctorId)
    paramIndex++
  }

  // Filter by types
  if (types && types.length > 0) {
    const typeParams = types.map((_, i) => `$${paramIndex + i}`).join(', ')
    conditions.push(`type IN (${typeParams})`)
    params.push(...types)
    paramIndex += types.length
  }

  // Filter by statuses
  if (statuses && statuses.length > 0) {
    const statusParams = statuses.map((_, i) => `$${paramIndex + i}`).join(', ')
    conditions.push(`status IN (${statusParams})`)
    params.push(...statuses)
    paramIndex += statuses.length
  }

  // Date range filters
  if (from) {
    conditions.push(`"occurredAt" >= $${paramIndex}`)
    params.push(from)
    paramIndex++
  }

  if (to) {
    conditions.push(`"occurredAt" <= $${paramIndex}`)
    params.push(to)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Build the SQL query with ranking and highlighting
  const sql = `
    SELECT 
      id,
      type,
      "occurredAt",
      "patientId",
      "doctorId",
      "appointmentId",
      "prescriptionId",
      "reportId",
      title,
      subtitle,
      tags,
      status,
      notes,
      vitals,
      ts_rank(search_vector, to_tsquery('english', $1)) AS rank,
      ts_headline('english', title, to_tsquery('english', $1), 
        'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=10, MaxFragments=2'
      ) AS "highlightedTitle",
      ts_headline('english', COALESCE(subtitle, ''), to_tsquery('english', $1), 
        'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=10, MaxFragments=2'
      ) AS "highlightedSubtitle",
      ts_headline('english', COALESCE(notes, ''), to_tsquery('english', $1), 
        'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=10, MaxFragments=2'
      ) AS "highlightedNotes"
    FROM activities
    ${whereClause}
    ORDER BY rank DESC, "occurredAt" DESC
    LIMIT $${paramIndex}
    OFFSET $${paramIndex + 1}
  `

  params.push(limit, offset)

  const results = await prisma.$queryRawUnsafe<ActivitySearchResult[]>(sql, ...params)
  
  return results
}

/**
 * Simple fallback search using ILIKE (for when full-text search is not available)
 * This provides basic search functionality without the advanced features
 */
export async function searchActivitiesSimple(
  options: SearchOptions
): Promise<any[]> {
  const {
    query,
    patientId,
    doctorId,
    types,
    statuses,
    from,
    to,
    limit = 50,
  } = options

  const searchText = query.trim().toLowerCase()
  
  if (!searchText) {
    return []
  }

  const where: Prisma.ActivityWhereInput = {}

  // Scope by patient or doctor
  if (patientId) {
    where.patientId = patientId
  }
  if (doctorId) {
    where.doctorId = doctorId
  }

  // Filter by types
  if (types && types.length > 0) {
    where.type = { in: types }
  }

  // Filter by statuses
  if (statuses && statuses.length > 0) {
    where.status = { in: statuses }
  }

  // Date range filters
  if (from || to) {
    where.occurredAt = {}
    if (from) where.occurredAt.gte = from
    if (to) where.occurredAt.lte = to
  }

  // Simple text search using ILIKE
  where.OR = [
    { title: { contains: searchText, mode: 'insensitive' } },
    { subtitle: { contains: searchText, mode: 'insensitive' } },
    { notes: { contains: searchText, mode: 'insensitive' } },
  ]

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: limit,
    include: {
      appointment: { include: { doctor: true } },
      prescription: true,
      report: true,
      doctor: true,
    },
  })

  return activities
}

/**
 * Search suggestions based on common terms in activities
 * Returns terms that match the user's input prefix
 */
export async function getSearchSuggestions(
  prefix: string,
  options: { patientId?: string; doctorId?: string; limit?: number }
): Promise<string[]> {
  const { patientId, doctorId, limit = 10 } = options
  const sanitizedPrefix = prefix.trim().toLowerCase()

  if (sanitizedPrefix.length < 2) {
    return []
  }

  // Build conditions for scoping
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (patientId) {
    conditions.push(`"patientId" = $${paramIndex}`)
    params.push(patientId)
    paramIndex++
  }

  if (doctorId) {
    conditions.push(`"doctorId" = $${paramIndex}`)
    params.push(doctorId)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Extract unique words from titles that match the prefix
  const sql = `
    SELECT DISTINCT unnest(string_to_array(lower(title), ' ')) AS word
    FROM activities
    ${whereClause}
    HAVING unnest(string_to_array(lower(title), ' ')) LIKE $${paramIndex}
    LIMIT $${paramIndex + 1}
  `

  params.push(`${sanitizedPrefix}%`, limit)

  try {
    const results = await prisma.$queryRawUnsafe<{ word: string }[]>(sql, ...params)
    return results.map(r => r.word)
  } catch (error) {
    // Fallback if the query fails (e.g., unsupported by database)
    console.error('Failed to get search suggestions:', error)
    return []
  }
}
