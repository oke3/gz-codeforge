# gz-codeforge

> Analytics for OpenCode usage — costs, models, agents, projects, and daily trends.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Ground Zero LLC](https://img.shields.io/badge/Built%20by-Ground%20Zero%20LLC-purple)](https://github.com/oke3)
[![npm](https://img.shields.io/npm/v/@ground-zero-llc/gz-codeforge)](https://www.npmjs.com/package/@ground-zero-llc/gz-codeforge)
[![CI](https://github.com/oke3/gz-codeforge/actions/workflows/ci.yml/badge.svg)](https://github.com/oke3/gz-codeforge/actions)

## Why

OpenCode tracks every session — model, agent, project, cost, tokens, timestamps — in a local SQLite database. That data answers the questions that matter when you're running AI coding agents at scale:

- **"What am I spending?"** — total cost, tokens, and session counts across all time
- **"Which models cost the most?"** — per-model breakdown with variant awareness (`@max`, `@low`)
- **"Who's doing the work?"** — per-agent and per-project cost attribution
- **"Is usage growing?"** — daily session and cost trends over configurable windows
- **"What were the most expensive sessions?"** — top sessions by cost for budget audits

**codeforge** turns raw database rows into actionable answers. Read-only, local-first, zero dependencies. No cloud, no accounts, no telemetry.

## Install

```bash
npm install -g @ground-zero-llc/gz-codeforge
```

Requires Node 22.5+ (uses `node:sqlite`; falls back to `bun:sqlite` under Bun).

## Quick Start

```bash
# Headline stats
codeforge overview
# → Sessions: 317 | Total cost: $15.0913 | Tokens: 111.2M

# Per-model breakdown (cost desc, variant-aware)
codeforge models
# → opencode-go/deepseek-v4-flash       49  $9.9659  33.2M
# → opencode-go/deepseek-v4-flash@low    6  $1.1367  1.7M

# Per-agent breakdown
codeforge agents
# → content-creator     142  $8.2341
# → web-dev-ops          89  $4.5672

# Daily trend
codeforge daily --days 7

# Most expensive sessions
codeforge top --limit 5

# Full report (everything at once)
codeforge report

# Machine-readable output
codeforge overview --json
```

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   OpenCode Database                │
│            (SQLite — session, message, part)       │
│                    READ-ONLY ────┐                 │
└──────────────────────────────────┼─────────────────┘
                                   │
                          ┌────────▼────────┐
                          │    codeforge     │
                          │    CLI / API     │
                          └────────┬─────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
             ┌────────────┐ ┌───────────┐ ┌────────────┐
             │  Analytics  │ │  report() │ │   table()  │
             │  (analytics │ │ formatter │ │ alignment  │
             │  .ts)       │ │ cost,     │ │ engine     │
             │ read-only   │ │ tokens,   │ │            │
             │ queries     │ │ dates     │ └────────────┘
             └─────────────┘ └───────────┘
```

**Pipeline:**
1. `Analytics` opens the SQLite database in read-only mode
2. SQL queries aggregate by model, agent, project, and day
3. `formatModel()` normalizes the model field (JSON or plain string) into `provider/id@variant`
4. `report.ts` formats numbers (`$9.9659`, `33.2M`, `2026-08-15`) and renders aligned text tables
5. All output is local — no data leaves your machine

## Metrics Tracked

| Metric | Description |
|--------|-------------|
| **Sessions** | Total number of OpenCode sessions |
| **Cost** | Sum of `cost` field across sessions (in USD) |
| **Tokens Input** | Total input tokens consumed |
| **Tokens Output** | Total output tokens produced |
| **First Session** | Timestamp of the earliest session |
| **Last Session** | Timestamp of the most recent session |
| **Model** | `provider/id@variant` — normalized from JSON or string |
| **Agent** | Agent name (e.g. `content-creator`, `web-dev-ops`) |
| **Project** | Project ID (directory-based identifier) |

## Model Normalization

OpenCode stores the model field differently across database versions:

- **Newer DBs**: JSON like `{"id":"deepseek-v4-flash","providerID":"opencode-go","variant":"max"}`
- **Older DBs**: Plain string like `"opencode/deepseek-v4-flash"`

codeforge normalizes both into `provider/id` format and appends `@variant` when present. This means `deepseek-v4-flash` and `deepseek-v4-flash@low` appear as separate rows in the model breakdown — because they have different cost profiles.

## CLI Reference

| Command | Description |
|---------|-------------|
| `overview` | Headline usage and cost stats |
| `models` | Per-model breakdown (sorted by cost, descending) |
| `agents` | Per-agent breakdown (sorted by cost, descending) |
| `projects` | Per-project breakdown (sorted by cost, descending) |
| `daily [--days N]` | Daily sessions and cost (default: 30 days) |
| `top [--limit N]` | Most expensive sessions (default: 10) |
| `report` | Full report — all of the above in one view |
| `health` | Check database status and path |

All commands accept `--json` for machine-readable output (JSON to stdout).

### Output Examples

**overview:**

    OpenCode Usage Overview
    ───────────────────────
    Sessions:         317
    Total cost:       $15.0913
    Tokens input:     98.3M
    Tokens output:    12.9M
    First session:    2026-06-15
    Last session:     2026-09-19

**models:**

    Model                          Sessions  Cost      Tokens
    ---------------------------------------------------------
    opencode-go/deepseek-v4-flash  49        $9.9659   33.2M
    opencode-go/deepseek-v4-flash@low  6     $1.1367   1.7M
    opencode/x-preview-f-free      112       $2.8412   41.8M

**daily:**

    Day        Sessions  Cost
    -------------------------
    2026-09-13  12       $0.8234
    2026-09-14  8        $0.5123
    2026-09-15  15       $1.2341

**top:**

    Date        Cost      Tokens   Title
    ------------------------------------------------------------
    2026-09-15  $2.3412   8.2M    Refactor auth module with RBAC
    2026-09-14  $1.8765   5.1M    Build landing page with animations

## Library API

```typescript
import { Analytics, defaultDbPath } from '@ground-zero-llc/gz-codeforge'

// Create analytics instance (defaults to OpenCode's DB path)
const analytics = new Analytics(defaultDbPath())
// or: new Analytics('~/.local/share/opencode/opencode.db')

// Overview
const overview = analytics.overview()
// → { sessions: 317, totalCost: 15.09, totalTokensInput: 98.3M, ... }

// Per-model breakdown
const models = analytics.byModel()
// → [{ model: 'opencode-go/deepseek-v4-flash', sessions: 49, cost: 9.97, tokens: 33.2M }, ...]

// Per-agent breakdown
const agents = analytics.byAgent()
// → [{ agent: 'content-creator', sessions: 142, cost: 8.23 }, ...]

// Per-project breakdown
const projects = analytics.byProject()
// → [{ projectId: 'my-app', sessions: 42, cost: 1.23 }, ...]

// Daily trends
const daily = analytics.daily(30)
// → [{ day: '2026-09-15', sessions: 15, cost: 1.23 }, ...]

// Top sessions
const top = analytics.topSessions(5)
// → [{ id: 'ses_...', title: 'Refactor auth', cost: 2.34, tokens: 8.2M, timeCreated: ... }, ...]

analytics.close()
```

### Types

```typescript
interface Overview {
  sessions: number
  totalCost: number
  totalTokensInput: number
  totalTokensOutput: number
  firstSession: number
  lastSession: number
}

interface ModelStat {
  model: string
  sessions: number
  cost: number
  tokens: number
}

interface AgentStat {
  agent: string
  sessions: number
  cost: number
}

interface ProjectStat {
  projectId: string
  sessions: number
  cost: number
}

interface DailyStat {
  day: string
  sessions: number
  cost: number
}

interface TopSession {
  id: string
  title: string
  cost: number
  tokens: number
  timeCreated: number
}
```

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENCODE_DB_PATH` | `~/.local/share/opencode/opencode.db` | OpenCode's SQLite database |

The database is opened **read-only** — codeforge never writes to it.

## Privacy

**codeforge is local-first and privacy-by-design:**

- **Read-only** — The OpenCode database is never written to.
- **Local output** — All results are printed to your terminal or returned as objects. No data leaves your machine.
- **Zero telemetry** — No analytics, no phone-home, no tracking.
- **No cloud dependency** — Everything runs offline. No API keys required.

## Related Projects

| Project | What It Does |
|---------|-------------|
| [gz-sessions](https://github.com/oke3/gz-sessions) | Persistent cross-session memory for AI agents |
| [gz-sessionrecall](https://github.com/oke3/gz-sessionrecall) | AI code archaeology — search your session history |
| [gz-codemap](https://github.com/oke3/gz-codemap) | Scan codebases → auto-generate project config |
| [gz-modelrouter](https://github.com/oke3/gz-modelrouter) | Intelligent LLM cost router — save 40-70% on bills |
| [gz-gateway](https://github.com/oke3/gz-gateway) | OpenAI-compatible AI gateway — rate limiting, caching, failover, cost tracking |
| [gz-bench](https://github.com/oke3/gz-bench) | Standardized benchmark harness for AI coding agents |
| [gz-authmesh](https://github.com/oke3/gz-authmesh) | Unified credential mesh for AI providers |
| [gz-remote](https://github.com/oke3/gz-remote) | Drive AI coding agents on remote machines over SSH |
| [gz-context-engine](https://github.com/oke3/gz-context-engine) | Production-grade RAG context engine |

---

## Enterprise Support

Need this customized for your infrastructure? We offer:

- **Integration consulting** — Wire gz-codeforge into your analytics stack
- **Custom configuration** — Task-specific rules, models, and workflows for your team
- **Managed deployment** — We host and maintain your instance
- **Training workshops** — Hands-on sessions for your engineering team

[Book a 30-min call](https://www.grndxero.com/brief) · [See pricing](https://www.grndxero.com/pricing)

---

## License

MIT — Ground Zero LLC

---

Built by [Ground Zero LLC](https://github.com/oke3) — AI infrastructure for the agentic age.
