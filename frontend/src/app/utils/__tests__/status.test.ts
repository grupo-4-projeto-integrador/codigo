import { describe, it, expect } from 'vitest'
import { normalizeStatus, getStatusBadgeStyle } from '../status'

describe('status utils', () => {
  it('normalizeStatus trims and uppercases', () => {
    expect(normalizeStatus(' ativa ')).toBe('ATIVA')
  })

  it('getStatusBadgeStyle returns colors based on status', () => {
    const colors = { forest: '#0f0', olive: '#fb0', brandRed: '#f00' }
    const s = getStatusBadgeStyle('ATIVA', colors)
    expect(s.color).toBe(colors.forest)
    const s2 = getStatusBadgeStyle('VENCIDA', colors)
    expect(s2.color).toBe(colors.brandRed)
  })

  it('getStatusBadgeStyle returns empty object for unknown status', () => {
    const colors = { forest: '#0f0', olive: '#fb0', brandRed: '#f00' }
    expect(getStatusBadgeStyle('UNKNOWN', colors)).toEqual({})
  })
})
