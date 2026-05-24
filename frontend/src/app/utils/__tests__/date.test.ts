import { describe, it, expect } from 'vitest'
import { normalizeDateForInput, parseDate } from '../date'

describe('date utils', () => {
  it('normalizeDateForInput converts DD/MM/YYYY to YYYY-MM-DD', () => {
    expect(normalizeDateForInput('01/02/2023')).toBe('2023-02-01')
  })

  it('normalizeDateForInput returns ISO when already ISO', () => {
    expect(normalizeDateForInput('2023-02-01')).toBe('2023-02-01')
  })

  it('normalizeDateForInput handles empty string', () => {
    expect(normalizeDateForInput('')).toBe('')
  })

  it('parseDate parses DD/MM/YYYY correctly', () => {
    const d = parseDate('15/07/2024')
    expect(d.getFullYear()).toBe(2024)
    expect(d.getMonth()).toBe(6) // July -> month index 6
    expect(d.getDate()).toBe(15)
  })

  it('parseDate parses YYYY-MM-DD correctly', () => {
    const d = parseDate('2024-07-15')
    expect(d.getFullYear()).toBe(2024)
    expect(d.getMonth()).toBe(6)
    expect(d.getDate()).toBe(15)
  })
})
