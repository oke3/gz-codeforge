# gz-codeforge

> Built by [Ground Zero LLC](https://github.com/oke3) — AI infrastructure for the agentic age.

Analytics for OpenCode usage — costs, models, agents, projects, and daily trends.

[![CI](https://github.com/oke3/gz-codeforge/actions/workflows/ci.yml/badge.svg)](https://github.com/oke3/gz-codeforge/actions)
[![npm](https://img.shields.io/npm/v/@ground-zero-llc/gz-codeforge)](https://www.npmjs.com/package/@ground-zero-llc/gz-codeforge)
[![license](https://img.shields.io/npm/l/@ground-zero-llc/gz-codeforge)](https://github.com/oke3/gz-codeforge/blob/main/LICENSE)

## Why

OpenCode tracks every session — model, agent, project, cost, tokens, timestamps — in a local SQLite database. **codeforge** turns that data into answers:

- **"What am I spending?"** — total cost, tokens, and session counts
- **"Which models cost the most?"** — per-model breakdown with variant awareness
- **"Who's doing the work?"** — per-agent and per-project breakdowns
- **"Is usage growing?"** — daily session and cost trends

Read-only, local-first, zero dependencies.

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
import { Analytics } from '@ground-zero-llc/gz-codeforge'

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

- [gz-sessions](https://github.com/oke3/gz-sessions) — Persistent cross-session memory for OpenCode agents
- [gz-codemap](https://github.com/oke3/gz-codemap) — Codebase mapping for OpenCode
- [gz-bench](https://github.com/oke3/gz-bench) — Benchmarking suite for OpenCode
- [gz-remote](https://github.com/oke3/gz-remote) — Drive OpenCode over SSH
- [gz-modelrouter](https://github.com/oke3/gz-modelrouter) — Intelligent LLM cost router for OpenCode
- [gz-sessionrecall](https://github.com/oke3/gz-sessionrecall) — AI code archaeology for OpenCode sessions
- [gz-learn](https://github.com/oke3/gz-learn) — Skill-building curriculum for OpenCode agents
- [gz-terminalforge](https://github.com/oke3/gz-terminalforge) — Terminal workspace for OpenCode projects
- [gz-authmesh](https://github.com/oke3/gz-authmesh) — Unified credential mesh for OpenCode providers

## License

MIT © oke3