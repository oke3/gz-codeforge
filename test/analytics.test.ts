import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { openDb } from '../src/sqlite.js'
import { Analytics, formatModel } from '../src/analytics.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let dir: string
let dbPath: string
let analytics: Analytics

const DAY = 86_400_000
const NOW = Date.now()

function createFixtureDb(path: string): void {
  const sqlite = openDb(path)
  sqlite.exec(`
    CREATE TABLE session (
      id text PRIMARY KEY, project_id text NOT NULL, slug text NOT NULL,
      directory text NOT NULL, title text NOT NULL, version text NOT NULL,
      cost real DEFAULT 0 NOT NULL, tokens_input integer DEFAULT 0 NOT NULL,
      tokens_output integer DEFAULT 0 NOT NULL, agent text, model text,
      time_created integer NOT NULL, time_updated integer NOT NULL
    );
  `)
  const insert = sqlite.prepare(`
    INSERT INTO session (id, project_id, slug, directory, title, version, cost, tokens_input, tokens_output, agent, model, time_created, time_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  // Day 1: model A (JSON), agent build
  insert.run('s1', 'proj-a', 's1', '/tmp/a', 'Fix auth', '1.0', 0.01, 100, 50, 'build', JSON.stringify({ id: 'deepseek-v4-flash', providerID: 'opencode-go' }), NOW - 2 * DAY, NOW - 2 * DAY + 100)
  insert.run('s2', 'proj-a', 's2', '/tmp/a', 'Add tests', '1.0', 0.02, 200, 100, 'build', JSON.stringify({ id: 'deepseek-v4-flash', providerID: 'opencode-go' }), NOW - 2 * DAY + 1000, NOW - 2 * DAY + 2000)
  // Day 1: model B (plain string), agent plan
  insert.run('s3', 'proj-b', 's3', '/tmp/b', 'Design doc', '1.0', 0.05, 500, 250, 'plan', 'opencode/gpt-5.1-codex', NOW - 2 * DAY + 2000, NOW - 2 * DAY + 3000)
  // Day 2: model A again (half a day ago — safely inside a 1-day window)
  insert.run('s4', 'proj-a', 's4', '/tmp/a', 'Review PR', '1.0', 0.005, 50, 25, 'build', JSON.stringify({ id: 'deepseek-v4-flash', providerID: 'opencode-go' }), NOW - DAY / 2, NOW - DAY / 2 + 100)
  sqlite.close()
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'codeforge-'))
  dbPath = join(dir, 'opencode.db')
  createFixtureDb(dbPath)
  analytics = new Analytics(dbPath)
})

afterEach(() => {
  analytics.close()
  rmSync(dir, { recursive: true, force: true })
})

describe('formatModel', () => {
  it('normalizes JSON model fields', () => {
    expect(formatModel('{"id":"deepseek-v4-flash","providerID":"opencode-go"}')).toBe('opencode-go/deepseek-v4-flash')
  })

  it('appends variant when present', () => {
    expect(formatModel('{"id":"deepseek-v4-flash","providerID":"opencode-go","variant":"max"}')).toBe('opencode-go/deepseek-v4-flash@max')
  })

  it('passes through plain strings', () => {
    expect(formatModel('opencode/gpt-5.1-codex')).toBe('opencode/gpt-5.1-codex')
  })

  it('handles malformed JSON', () => {
    expect(formatModel('{not json')).toBe('{not json')
  })
})

describe('Analytics', () => {
  it('overview aggregates all sessions', () => {
    const o = analytics.overview()
    expect(o.sessions).toBe(4)
    expect(o.totalCost).toBeCloseTo(0.085)
    expect(o.totalTokensInput).toBe(850)
    expect(o.totalTokensOutput).toBe(425)
    expect(o.firstSession).toBe(NOW - 2 * DAY)
    expect(o.lastSession).toBe(NOW - DAY / 2)
  })

  it('byModel groups and normalizes models, sorted by cost desc', () => {
    const rows = analytics.byModel()
    expect(rows).toHaveLength(2)
    expect(rows[0]!.model).toBe('opencode/gpt-5.1-codex')
    expect(rows[0]!.sessions).toBe(1)
    expect(rows[0]!.cost).toBeCloseTo(0.05)
    expect(rows[1]!.model).toBe('opencode-go/deepseek-v4-flash')
    expect(rows[1]!.sessions).toBe(3)
    expect(rows[1]!.cost).toBeCloseTo(0.035)
    expect(rows[1]!.tokens).toBe(525)
  })

  it('byAgent groups by agent', () => {
    const rows = analytics.byAgent()
    expect(rows).toHaveLength(2)
    const build = rows.find(r => r.agent === 'build')
    expect(build?.sessions).toBe(3)
    expect(build?.cost).toBeCloseTo(0.035)
    const plan = rows.find(r => r.agent === 'plan')
    expect(plan?.sessions).toBe(1)
  })

  it('byProject groups by project', () => {
    const rows = analytics.byProject()
    expect(rows).toHaveLength(2)
    const projA = rows.find(r => r.projectId === 'proj-a')
    expect(projA?.sessions).toBe(3)
    expect(projA?.cost).toBeCloseTo(0.035)
  })

  it('daily groups by calendar day', () => {
    const rows = analytics.daily(30)
    expect(rows).toHaveLength(2)
    expect(rows[0]!.sessions).toBe(3)
    expect(rows[1]!.sessions).toBe(1)
    expect(rows[0]!.cost).toBeCloseTo(0.08)
  })

  it('daily respects the day window', () => {
    const rows = analytics.daily(1)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.sessions).toBe(1)
  })

  it('topSessions returns most expensive first', () => {
    const rows = analytics.topSessions(2)
    expect(rows).toHaveLength(2)
    expect(rows[0]!.id).toBe('s3')
    expect(rows[0]!.cost).toBeCloseTo(0.05)
    expect(rows[1]!.id).toBe('s2')
  })

  it('throws for missing database', () => {
    expect(() => new Analytics(join(dir, 'missing.db'))).toThrow()
  })
})