/**
 * Report formatters — human-readable text output for analytics.
 */

export function fmtCost(n: number): string {
  return `$${n.toFixed(4)}`
}

export function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function fmtDate(ms: number): string {
  if (!ms) return '—'
  return new Date(ms).toISOString().slice(0, 10)
}

/** Render an aligned text table */
export function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => {
    const max = Math.max(h.length, ...rows.map(r => (r[i] ?? '').length))
    return max
  })

  const line = (cells: string[]): string =>
    cells.map((c, i) => c.padEnd(widths[i]!)).join('  ').trimEnd()

  const out: string[] = [line(headers)]
  out.push(widths.map(w => '-'.repeat(w)).join('  '))
  for (const r of rows) out.push(line(r))
  return out.join('\n')
}