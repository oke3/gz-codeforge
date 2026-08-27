# opencode-codeforge

Analytics for OpenCode usage — costs, models, agents, projects, and daily trends.

[![CI](https://github.com/oke3/opencode-codeforge/actions/workflows/ci.yml/badge.svg)](https://github.com/oke3/opencode-codeforge/actions)
[![npm](https://img.shields.io/npm/v/@oke3/opencode-codeforge)](https://www.npmjs.com/package/@oke3/opencode-codeforge)
[![license](https://img.shields.io/npm/l/@oke3/opencode-codeforge)](https://github.com/oke3/opencode-codeforge/blob/main/LICENSE)

## Why

OpenCode tracks every session — model, agent, project, cost, tokens, timestamps — in a local SQLite database. **codeforge** turns that data into answers:

- **"What am I spending?"** — total cost, tokens, and session counts
- **"Which models cost the most?"** — per-model breakdown with variant awareness
- **"Who's doing the work?"** — per-agent and per-project breakdowns
- **"Is usage growing?"** — daily session and cost trends

Read-only, local-first, zero dependencies.

## Install

```bash
npm install -g @oke3/opencode-codeforge
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

# Daily trend
codeforge daily --days 7

# Most expensive sessions
codeforge top --limit 5

# Everything at once
codeforge report
```

## CLI Reference

| Command | Description |
|---------|-------------|
| `overview` | Headline usage and cost stats |
| `models` | Per-model breakdown (cost desc) |
| `agents` | Per-agent breakdown |
| `projects` | Per-project breakdown |
| `daily [--days N]` | Daily sessions and cost (default 30) |
| `top [--limit N]` | Most expensive sessions (default 10) |
| `report` | Full report (all of the above) |
| `health` | Check database status |

All commands accept `--json` for machine-readable output.

## Model Normalization

OpenCode stores the model field as JSON in newer databases (`{"id":"deepseek-v4-flash","providerID":"opencode-go","variant":"max"}`) and as a plain string in older ones. codeforge normalizes both into `provider/id` and appends `@variant` when present, so the breakdown distinguishes model variants that would otherwise collapse into one row.

## Library API

```typescript
import { Analytics } from '@oke3/opencode-codeforge'

const analytics = new Analytics('~/.local/share/opencode/opencode.db')
const overview = analytics.overview()
const models = analytics.byModel()
const daily = analytics.daily(30)
const top = analytics.topSessions(5)
analytics.close()
```

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENCODE_DB_PATH` | `~/.local/share/opencode/opencode.db` | OpenCode's SQLite database |

The database is opened **read-only** — codeforge never writes to it.

## Related Projects

- [opencode-sessions](https://github.com/oke3/opencode-sessions) — Persistent cross-session memory for OpenCode agents
- [opencode-codemap](https://github.com/oke3/opencode-codemap) — Codebase mapping for OpenCode
- [opencode-bench](https://github.com/oke3/opencode-bench) — Benchmarking suite for OpenCode
- [opencode-remote](https://github.com/oke3/opencode-remote) — Drive OpenCode over SSH
- [opencode-modelrouter](https://github.com/oke3/opencode-modelrouter) — Intelligent LLM cost router for OpenCode
- [opencode-sessionrecall](https://github.com/oke3/opencode-sessionrecall) — AI code archaeology for OpenCode sessions
- [opencode-learn](https://github.com/oke3/opencode-learn) — Skill-building curriculum for OpenCode agents
- [opencode-terminalforge](https://github.com/oke3/opencode-terminalforge) — Terminal workspace for OpenCode projects
- [opencode-authmesh](https://github.com/oke3/opencode-authmesh) — Unified credential mesh for OpenCode providers

## License

MIT © oke3