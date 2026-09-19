// Copyright (c) 2026 Ground Zero LLC. All rights reserved.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { execSync, spawnSync } from 'node:child_process'
import { openDb } from '../src/sqlite.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const CLI = join(import.meta.dir, '..', 'src', 'cli.ts')
const DAY = 86_400_000
const NOW = Date.now()

let dir: string
let dbPath: string

function run(args: string): string {
  return execSync(`bun run ${CLI} ${args}`, {
    env: { ...process.env, OPENCODE_DB_PATH: dbPath },
    encoding: 'utf-8',
    timeout: 10_000,
  }).trim()
}

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
  sqlite.prepare(`
    INSERT INTO session (id, project_id, slug, directory, title, version, cost, tokens_input, tokens_output, agent, model, time_created, time_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('s1', 'proj-a', 's1', '/tmp/a', 'Fix auth bug', '1.0', 0.01, 100, 50, 'build', JSON.stringify({ id: 'deepseek-v4-flash', providerID: 'opencode-go' }), NOW - DAY, NOW - DAY + 100)
  sqlite.prepare(`
    INSERT INTO session (id, project_id, slug, directory, title, version, cost, tokens_input, tokens_output, agent, model, time_created, time_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('s2', 'proj-b', 's2', '/tmp/b', 'Design doc', '1.0', 0.05, 500, 250, 'plan', 'opencode/gpt-5.1-codex', NOW - 2 * DAY, NOW - 2 * DAY + 100)
  sqlite.close()
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'codeforge-cli-'))
  dbPath = join(dir, 'opencode.db')
  createFixtureDb(dbPath)
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('CLI', () => {
  it('shows usage with no args', () => {
    const output = run('')
    expect(output).toContain('codeforge')
    expect(output).toContain('Usage')
  })

  it('overview shows headline stats', () => {
    const output = run('overview')
    expect(output).toContain('Sessions:         2')
    expect(output).toContain('$0.0600')
  })

  it('models shows normalized model breakdown', () => {
    const output = run('models')
    expect(output).toContain('opencode-go/deepseek-v4-flash')
    expect(output).toContain('opencode/gpt-5.1-codex')
  })

  it('agents shows agent breakdown', () => {
    const output = run('agents')
    expect(output).toContain('build')
    expect(output).toContain('plan')
  })

  it('projects shows project breakdown', () => {
    const output = run('projects')
    expect(output).toContain('proj-a')
    expect(output).toContain('proj-b')
  })

  it('daily shows time series', () => {
    const output = run('daily --days 30')
    const day1 = new Date(NOW - DAY).toISOString().slice(0, 10)
    const day2 = new Date(NOW - 2 * DAY).toISOString().slice(0, 10)
    expect(output).toContain(day1)
    expect(output).toContain(day2)
  })

  it('top shows most expensive sessions', () => {
    const output = run('top --limit 5')
    expect(output).toContain('Design doc')
    expect(output).toContain('Fix auth bug')
  })

  it('report renders all sections', () => {
    const output = run('report')
    expect(output).toContain('CodeForge Report')
    expect(output).toContain('Top models:')
    expect(output).toContain('Top agents:')
    expect(output).toContain('Most expensive sessions:')
  })

  it('--json outputs machine-readable data', () => {
    const output = run('overview --json')
    const body = JSON.parse(output) as { sessions: number; totalCost: number }
    expect(body.sessions).toBe(2)
    expect(body.totalCost).toBeCloseTo(0.06)
  })

  it('health reports database status', () => {
    const output = run('health')
    const body = JSON.parse(output) as { status: string; opencodeDbExists: boolean }
    expect(body.status).toBe('ok')
    expect(body.opencodeDbExists).toBe(true)
  })

  it('errors on missing database', () => {
    const result = spawnSync(`bun run ${CLI} overview`, {
      env: { ...process.env, OPENCODE_DB_PATH: join(dir, 'missing.db') },
      encoding: 'utf-8',
      timeout: 10_000,
      shell: true,
    })
    expect(result.stderr).toContain('not found')
    expect(result.status).toBe(1)
  })
})