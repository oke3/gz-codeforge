# Contributing to opencode-codeforge

Thanks for your interest in contributing!

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Type check
npx tsc --noEmit

# Build
bun run build
```

## Pull Requests

1. Fork the repo and create a feature branch
2. Write tests for new functionality
3. Ensure all tests pass: `bun test`
4. Ensure type check passes: `npx tsc --noEmit`
5. Submit a PR with a clear description

## Adding Analytics

Analytics queries live in `src/analytics.ts`. Each query:

- Reads the OpenCode database **read-only** (never write)
- Returns plain typed interfaces (see `Overview`, `ModelStat`, etc.)
- Sorts by cost descending for breakdowns

Add tests in `test/analytics.test.ts` using a fixture database built with `openDb`.

## Report Formatting

Formatters live in `src/report.ts`. Keep text output aligned via the `table()` helper; machine-readable output is handled by `--json` in the CLI.

## SQLite Compatibility

The DB adapter in `src/sqlite.ts` supports both `node:sqlite` (Node 22.5+) and `bun:sqlite` (Bun). Keep it dependency-free — do not add a SQLite npm package.

## Code Style

- TypeScript strict mode
- ES modules (`import`/`export`)
- Zero runtime dependencies
- Tests for all new features

## License

By contributing, you agree that your contributions will be licensed under the MIT License.