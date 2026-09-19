// Copyright (c) 2026 Ground Zero LLC. All rights reserved.

import { describe, it, expect } from 'bun:test'
import { fmtCost, fmtTokens, fmtDate, table } from '../src/report.js'

describe('fmtCost', () => {
  it('formats to 4 decimals', () => {
    expect(fmtCost(0.085)).toBe('$0.0850')
    expect(fmtCost(15.0913)).toBe('$15.0913')
  })
})

describe('fmtTokens', () => {
  it('formats thousands and millions', () => {
    expect(fmtTokens(500)).toBe('500')
    expect(fmtTokens(4500)).toBe('4.5k')
    expect(fmtTokens(1_200_000)).toBe('1.2M')
  })
})

describe('fmtDate', () => {
  it('formats epoch ms to date', () => {
    expect(fmtDate(1_700_000_000_000)).toBe('2023-11-14')
  })

  it('handles zero', () => {
    expect(fmtDate(0)).toBe('—')
  })
})

describe('table', () => {
  it('renders aligned columns', () => {
    const out = table(
      ['Name', 'Count'],
      [['a', '1'], ['longer', '22']],
    )
    const lines = out.split('\n')
    expect(lines[0]).toBe('Name    Count')
    expect(lines[1]).toBe('------  -----')
    expect(lines[2]).toBe('a       1')
    expect(lines[3]).toBe('longer  22')
  })

  it('handles empty rows', () => {
    const out = table(['A', 'B'], [])
    expect(out).toContain('A')
  })
})