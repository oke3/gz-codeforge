# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-27

### Added
- Read-only analytics over OpenCode's SQLite database
- Overview stats: sessions, cost, input/output tokens, first/last session
- Per-model breakdown with variant-aware normalization (provider/id@variant)
- Per-agent and per-project breakdowns
- Daily time series with configurable window
- Most-expensive-sessions report
- Full report combining all views
- --json output for every command
- Aligned text table rendering
- CLI with overview, models, agents, projects, daily, top, report, and health commands
- Dual-runtime SQLite adapter (node:sqlite / bun:sqlite) with zero dependencies
- 29 tests covering analytics, report, and CLI