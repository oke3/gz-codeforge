// Copyright (c) 2026 Ground Zero LLC. All rights reserved.

/**
 * codeforge CLI — analytics for OpenCode usage.
 */

import { Analytics, defaultDbPath } from './analytics.js'
import { fmtCost, fmtTokens, fmtDate, table } from './report.js'

function usage(): string {
  return `codeforge — analytics for OpenCode usage

Usage:
  codeforge overview                  Headline usage and cost stats
  codeforge models                    Per-model breakdown (cost desc)
  codeforge agents                    Per-agent breakdown
  codeforge projects                  Per-project breakdown
  codeforge daily [--days N]          Daily sessions and cost (default 30)
  codeforge top [--limit N]           Most expensive sessions (default 10)
  codeforge report                    Full report (all of the above)
  codeforge health                    Check database status

All commands accept --json for machine-readable output.

OpenCode DB: ~/.local/share/opencode/opencode.db (override with OPENCODE_DB_PATH)
`
}

function getArg(args: string[], name: string): string | undefined {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name)
}

function jsonOut(data: unknown): void {
  console.log(JSON.stringify(data, null, 2))
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const cmd = args[0] ?? ''
  const asJson = hasFlag(args, '--json')

  if (cmd === '' || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(usage())
    return
  }

  const dbPath = defaultDbPath()

  if (cmd === 'health') {
    const { existsSync } = await import('node:fs')
    console.log(JSON.stringify({
      status: 'ok',
      opencodeDb: dbPath,
      opencodeDbExists: existsSync(dbPath),
    }, null, 2))
    return
  }

  let analytics: Analytics
  try {
    analytics = new Analytics(dbPath)
  } catch (err) {
    console.error(String(err))
    process.exitCode = 1
    return
  }

  try {
    switch (cmd) {
      case 'overview': {
        const o = analytics.overview()
        if (asJson) {
          jsonOut(o)
          return
        }
        console.log('OpenCode Usage Overview')
        console.log('───────────────────────')
        console.log(`Sessions:         ${o.sessions}`)
        console.log(`Total cost:       ${fmtCost(o.totalCost)}`)
        console.log(`Tokens input:     ${fmtTokens(o.totalTokensInput)}`)
        console.log(`Tokens output:    ${fmtTokens(o.totalTokensOutput)}`)
        console.log(`First session:    ${fmtDate(o.firstSession)}`)
        console.log(`Last session:     ${fmtDate(o.lastSession)}`)
        return
      }

      case 'models': {
        const rows = analytics.byModel()
        if (asJson) {
          jsonOut(rows)
          return
        }
        if (rows.length === 0) {
          console.log('No sessions found.')
          return
        }
        console.log(table(
          ['Model', 'Sessions', 'Cost', 'Tokens'],
          rows.map(r => [r.model, String(r.sessions), fmtCost(r.cost), fmtTokens(r.tokens)]),
        ))
        return
      }

      case 'agents': {
        const rows = analytics.byAgent()
        if (asJson) {
          jsonOut(rows)
          return
        }
        if (rows.length === 0) {
          console.log('No sessions found.')
          return
        }
        console.log(table(
          ['Agent', 'Sessions', 'Cost'],
          rows.map(r => [r.agent, String(r.sessions), fmtCost(r.cost)]),
        ))
        return
      }

      case 'projects': {
        const rows = analytics.byProject()
        if (asJson) {
          jsonOut(rows)
          return
        }
        if (rows.length === 0) {
          console.log('No sessions found.')
          return
        }
        console.log(table(
          ['Project', 'Sessions', 'Cost'],
          rows.map(r => [r.projectId, String(r.sessions), fmtCost(r.cost)]),
        ))
        return
      }

      case 'daily': {
        const days = Number(getArg(args, '--days') ?? '30')
        const rows = analytics.daily(days)
        if (asJson) {
          jsonOut(rows)
          return
        }
        if (rows.length === 0) {
          console.log(`No sessions in the last ${days} days.`)
          return
        }
        console.log(table(
          ['Day', 'Sessions', 'Cost'],
          rows.map(r => [r.day, String(r.sessions), fmtCost(r.cost)]),
        ))
        return
      }

      case 'top': {
        const limit = Number(getArg(args, '--limit') ?? '10')
        const rows = analytics.topSessions(limit)
        if (asJson) {
          jsonOut(rows)
          return
        }
        if (rows.length === 0) {
          console.log('No sessions found.')
          return
        }
        console.log(table(
          ['Date', 'Cost', 'Tokens', 'Title'],
          rows.map(r => [fmtDate(r.timeCreated), fmtCost(r.cost), fmtTokens(r.tokens), r.title.slice(0, 60)]),
        ))
        return
      }

      case 'report': {
        const o = analytics.overview()
        const models = analytics.byModel()
        const agents = analytics.byAgent()
        const projects = analytics.byProject()
        const daily = analytics.daily(30)
        const top = analytics.topSessions(5)

        if (asJson) {
          jsonOut({ overview: o, models, agents, projects, daily, top })
          return
        }

        console.log('CodeForge Report')
        console.log('================')
        console.log(`Sessions: ${o.sessions} | Cost: ${fmtCost(o.totalCost)} | Tokens: ${fmtTokens(o.totalTokensInput + o.totalTokensOutput)}`)
        console.log(`Range: ${fmtDate(o.firstSession)} → ${fmtDate(o.lastSession)}\n`)

        console.log('Top models:')
        console.log(table(
          ['Model', 'Sessions', 'Cost', 'Tokens'],
          models.slice(0, 5).map(r => [r.model, String(r.sessions), fmtCost(r.cost), fmtTokens(r.tokens)]),
        ))
        console.log('')

        console.log('Top agents:')
        console.log(table(
          ['Agent', 'Sessions', 'Cost'],
          agents.slice(0, 5).map(r => [r.agent, String(r.sessions), fmtCost(r.cost)]),
        ))
        console.log('')

        console.log('Top projects:')
        console.log(table(
          ['Project', 'Sessions', 'Cost'],
          projects.slice(0, 5).map(r => [r.projectId, String(r.sessions), fmtCost(r.cost)]),
        ))
        console.log('')

        console.log('Last 7 days:')
        console.log(table(
          ['Day', 'Sessions', 'Cost'],
          daily.slice(-7).map(r => [r.day, String(r.sessions), fmtCost(r.cost)]),
        ))
        console.log('')

        console.log('Most expensive sessions:')
        console.log(table(
          ['Date', 'Cost', 'Tokens', 'Title'],
          top.map(r => [fmtDate(r.timeCreated), fmtCost(r.cost), fmtTokens(r.tokens), r.title.slice(0, 60)]),
        ))
        return
      }

      default: {
        console.error(`Unknown command: ${cmd}\n`)
        console.error(usage())
        process.exitCode = 1
      }
    }
  } finally {
    analytics.close()
  }
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})