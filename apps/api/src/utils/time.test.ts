import { getDateKeyForTimezone, isWithinWindow } from './time'

describe('time utilities', () => {
  it('formats date key in a specific timezone', () => {
    const date = new Date('2024-01-01T02:30:00.000Z')
    expect(getDateKeyForTimezone(date, 'America/New_York')).toBe('20231231')
    expect(getDateKeyForTimezone(date, 'UTC')).toBe('20240101')
  })

  it('checks window boundaries correctly', () => {
    const base = new Date('2024-06-01T10:00:00.000Z')
    const insideEarly = new Date('2024-06-01T09:40:00.000Z')
    const insideLate = new Date('2024-06-01T10:10:00.000Z')
    const outside = new Date('2024-06-01T09:00:00.000Z')

    expect(isWithinWindow(insideEarly, base, 30, 15)).toBe(true)
    expect(isWithinWindow(insideLate, base, 30, 15)).toBe(true)
    expect(isWithinWindow(outside, base, 30, 15)).toBe(false)
  })
})
