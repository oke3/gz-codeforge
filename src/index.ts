// Copyright (c) 2026 Ground Zero LLC. All rights reserved.

/**
 * @ground-zero-llc/gz-codeforge — analytics for OpenCode usage.
 *
 * @example
 * ```typescript
 * import { Analytics } from '@ground-zero-llc/gz-codeforge'
 *
 * const analytics = new Analytics('~/.local/share/opencode/opencode.db')
 * const overview = analytics.overview()
 * const models = analytics.byModel()
 * analytics.close()
 * ```
 */

export { Analytics, formatModel, defaultDbPath, type Overview, type ModelStat, type AgentStat, type ProjectStat, type DailyStat, type TopSession } from './analytics.js'
export { fmtCost, fmtTokens, fmtDate, table } from './report.js'