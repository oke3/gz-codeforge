/**
 * Analytics engine — reads OpenCode's SQLite database (read-only)
 * and computes usage, cost, and token statistics.
 */

import { openDb, type SqliteLike } from './sqlite.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export interface Overview {
  sessions: number
  totalCost: number
  totalTokensInput: number
  totalTokensOutput: number
  firstSession: number
  lastSession: number
}

export interface ModelStat {
  model: string
  sessions: number
  cost: number
  tokens: number
}

export interface AgentStat {
  agent: string
  sessions: number
  cost: number
}

export interface ProjectStat {
  projectId: string
  sessions: number
  cost: number
}

export interface DailyStat {
  day: string
  sessions: number
  cost: number
}

export interface TopSession {
  id: string
  title: string
  cost: number
  tokens: number
  timeCreated: number
}

export function defaultDbPath(): string {
  return process.env['OPENCODE_DB_PATH'] ?? join(homedir(), '.local', 'share', 'opencode', 'opencode.db')
}

/**
 * Normalize OpenCode's model field into a readable id.
 * Newer DBs store JSON like {"id":"deepseek-v4-flash","providerID":"opencode-go","variant":"max"};
 * older ones store a plain string like "opencode/deepseek-v4-flash".
 * Variants are appended as @variant so analytics can distinguish them.
 */
export function formatModel(raw: unknown): string {
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>
        const id = String(parsed['id'] ?? '')
        const provider = String(parsed['providerID'] ?? '')
        const variant = String(parsed['variant'] ?? '')
        const base = id && provider ? `${provider}/${id}` : id
        if (base) return variant ? `${base}@${variant}` : base
      } catch {
        // fall through to plain string
      }
    }
    return trimmed
  }
  return String(raw ?? '')
}

export class Analytics {
  private db: SqliteLike

  constructor(dbPath: string) {
    if (!existsSync(dbPath)) {
      throw new Error(`OpenCode database not found: ${dbPath}`)
    }
    this.db = openDb(dbPath, true)
  }

  overview(): Overview {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS sessions,
                COALESCE(SUM(cost), 0) AS total_cost,
                COALESCE(SUM(tokens_input), 0) AS tokens_input,
                COALESCE(SUM(tokens_output), 0) AS tokens_output,
                COALESCE(MIN(time_created), 0) AS first_session,
                COALESCE(MAX(time_created), 0) AS last_session
         FROM session`,
      )
      .get() as Record<string, unknown>

    return {
      sessions: Number(row['sessions'] ?? 0),
      totalCost: Number(row['total_cost'] ?? 0),
      totalTokensInput: Number(row['tokens_input'] ?? 0),
      totalTokensOutput: Number(row['tokens_output'] ?? 0),
      firstSession: Number(row['first_session'] ?? 0),
      lastSession: Number(row['last_session'] ?? 0),
    }
  }

  byModel(): ModelStat[] {
    const rows = this.db
      .prepare(
        `SELECT model, COUNT(*) AS sessions, COALESCE(SUM(cost), 0) AS cost,
                COALESCE(SUM(tokens_input + tokens_output), 0) AS tokens
         FROM session GROUP BY model ORDER BY cost DESC`,
      )
      .all() as Array<Record<string, unknown>>

    return rows.map(r => ({
      model: formatModel(r['model']),
      sessions: Number(r['sessions'] ?? 0),
      cost: Number(r['cost'] ?? 0),
      tokens: Number(r['tokens'] ?? 0),
    }))
  }

  byAgent(): AgentStat[] {
    const rows = this.db
      .prepare(
        `SELECT agent, COUNT(*) AS sessions, COALESCE(SUM(cost), 0) AS cost
         FROM session GROUP BY agent ORDER BY cost DESC`,
      )
      .all() as Array<Record<string, unknown>>

    return rows.map(r => ({
      agent: String(r['agent'] ?? '(none)'),
      sessions: Number(r['sessions'] ?? 0),
      cost: Number(r['cost'] ?? 0),
    }))
  }

  byProject(): ProjectStat[] {
    const rows = this.db
      .prepare(
        `SELECT project_id, COUNT(*) AS sessions, COALESCE(SUM(cost), 0) AS cost
         FROM session GROUP BY project_id ORDER BY cost DESC`,
      )
      .all() as Array<Record<string, unknown>>

    return rows.map(r => ({
      projectId: String(r['project_id'] ?? '(none)'),
      sessions: Number(r['sessions'] ?? 0),
      cost: Number(r['cost'] ?? 0),
    }))
  }

  daily(days: number): DailyStat[] {
    const rows = this.db
      .prepare(
        `SELECT date(time_created / 1000, 'unixepoch') AS day,
                COUNT(*) AS sessions, COALESCE(SUM(cost), 0) AS cost
         FROM session
         WHERE time_created >= ?
         GROUP BY day ORDER BY day ASC`,
      )
      .all(Date.now() - days * 86_400_000) as Array<Record<string, unknown>>

    return rows.map(r => ({
      day: String(r['day'] ?? ''),
      sessions: Number(r['sessions'] ?? 0),
      cost: Number(r['cost'] ?? 0),
    }))
  }

  topSessions(limit: number): TopSession[] {
    const rows = this.db
      .prepare(
        `SELECT id, title, cost, tokens_input + tokens_output AS tokens, time_created
         FROM session ORDER BY cost DESC LIMIT ?`,
      )
      .all(limit) as Array<Record<string, unknown>>

    return rows.map(r => ({
      id: String(r['id'] ?? ''),
      title: String(r['title'] ?? ''),
      cost: Number(r['cost'] ?? 0),
      tokens: Number(r['tokens'] ?? 0),
      timeCreated: Number(r['time_created'] ?? 0),
    }))
  }

  close(): void {
    this.db.close()
  }
}