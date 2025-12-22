const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'UTC'

function resolveTimeZone(timeZone?: string) {
  const candidate = timeZone || DEFAULT_TIMEZONE
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format()
    return candidate
  } catch {
    return DEFAULT_TIMEZONE
  }
}

export function getDateKeyForTimezone(date: Date, timeZone?: string) {
  const tz = resolveTimeZone(timeZone)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value
    }
  }
  return `${map.year}${map.month}${map.day}`
}

export function isWithinWindow(
  target: Date,
  base: Date,
  minutesBefore: number,
  minutesAfter: number
) {
  const diffMs = target.getTime() - base.getTime()
  return diffMs >= -minutesBefore * 60 * 1000 && diffMs <= minutesAfter * 60 * 1000
}

export function getDefaultTimezone() {
  return DEFAULT_TIMEZONE
}
