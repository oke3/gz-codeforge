/**
 * @oke3/opencode-codeforge — analytics for OpenCode usage.
 *
 * @example
 * ```typescript
 * import { Analytics } from '@oke3/opencode-codeforge'
 *
 * const analytics = new Analytics('~/.local/share/opencode/opencode.db')
 * const overview = analytics.overview()
 * const models = analytics.byModel()
 * analytics.close()
 * ```
 */

export { Analytics, formatModel, defaultDbPath, type Overview, type ModelStat, type AgentStat, type ProjectStat, type DailyStat, type TopSession } from './analytics.js'
export { fmtCost, fmtTokens, fmtDate, table } from './report.js'