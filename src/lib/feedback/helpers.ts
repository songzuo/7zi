/**
 * Shared helpers for the feedback module.
 *
 * Two problems are solved here:
 *
 * 1. Timestamp formats.
 *    The `feedbacks` / `spam_detection_logs` / `feedback_notifications` tables
 *    store `created_at` in **two different formats**:
 *      - schema default  -> `datetime('now')` -> "YYYY-MM-DD HH:MM:SS" (UTC)
 *      - API layer insert -> `new Date().toISOString()` -> "YYYY-MM-DDTHH:MM:SS.sssZ"
 *    A plain TEXT comparison of the two is therefore meaningless:
 *      "2026-10-30T10:00:00.000Z" > "2026-10-30 11:00:00"  // true, always
 *    because 'T' (0x54) > ' ' (0x20). That silently broke every
 *    "created_at > datetime('now', '-1 hour')" window.
 *    SQL comparisons must therefore normalise with `datetime(created_at)` and
 *    JS comparisons must parse with `parseDbTimestamp()` (SQLite format is UTC).
 *
 * 2. Empty result sets.
 *    `db.queryRows(...)` returns `[]` (never throws) when nothing matches.
 *    `rows[0].count` on an empty array throws `TypeError: Cannot read
 *    properties of undefined`. Every aggregate read must therefore go through
 *    `extractCount()`.
 */

/**
 * Format a date as SQLite's `datetime('now')` format (UTC, second precision).
 */
export function toSqliteUtcTimestamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * Parse a timestamp coming from the database into epoch milliseconds.
 *
 * - ISO-8601 with zone (`...Z`, `...+08:00`)  -> native parsing (correct).
 * - SQLite format (`YYYY-MM-DD HH:MM:SS`)      -> treated as **UTC**, matching
 *   SQLite's `datetime('now')`. `new Date('2026-10-30 12:00:00')` would be
 *   interpreted in the *local* zone by V8 and therefore be off by the UTC
 *   offset (8 hours in Asia/Shanghai).
 *
 * Returns NaN when the value cannot be parsed.
 */
export function parseDbTimestamp(value: string | null | undefined): number {
  if (value === null || value === undefined) return NaN
  const trimmed = String(value).trim()
  if (!trimmed) return NaN

  const sqliteLike = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/)
  if (sqliteLike) {
    const isoLike = `${sqliteLike[1]}T${sqliteLike[2]}`
    const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(isoLike)
    const parsed = Date.parse(hasZone ? isoLike : `${isoLike}Z`)
    if (!Number.isNaN(parsed)) return parsed
  }

  return Date.parse(trimmed)
}

/**
 * Safely read an aggregate `COUNT(*)` from a query result.
 *
 * `queryRows` returns `[]` when nothing matched, so `rows[0].count` throws.
 * This helper degrades to 0 instead.
 */
export function extractCount(rows: unknown): number {
  if (!Array.isArray(rows) || rows.length === 0) return 0
  const row = rows[0]
  if (!row || typeof row !== 'object') return 0
  const value = (row as { count?: unknown }).count
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : 0
}

/**
 * Return the first row of a query result, or `undefined` when the result is
 * empty. Never throws on an empty array.
 */
export function firstRow<T>(rows: unknown): T | undefined {
  if (!Array.isArray(rows) || rows.length === 0) return undefined
  return rows[0] as T
}
