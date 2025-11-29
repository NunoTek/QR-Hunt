/**
 * Server-side constants for the QR Hunt application.
 * Centralizes magic numbers and configuration values.
 */

/** Authentication and session configuration */
export const AUTH = {
  /** Duration of team sessions in hours */
  SESSION_DURATION_HOURS: 48,
  /** Default admin code if not set in environment */
  DEFAULT_ADMIN_CODE: "admin123",
} as const;

/** Game mechanics configuration */
export const GAME = {
  /** Time threshold in minutes for time bonus eligibility */
  TIME_BONUS_THRESHOLD_MINUTES: 5,
  /** Default base points for nodes */
  DEFAULT_BASE_POINTS: 100,
  /** Default time bonus multiplier */
  DEFAULT_TIME_BONUS_MULTIPLIER: 1.5,
} as const;

/** Team code generation configuration */
export const TEAM_CODE = {
  /** Length of generated team codes */
  LENGTH: 6,
  /** Characters used in team code generation (excludes ambiguous chars like 0, O, I, 1) */
  CHARSET: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
} as const;

/** Leaderboard cache configuration */
export const LEADERBOARD_CACHE = {
  /** Cache time-to-live in milliseconds */
  TTL_MS: 5000,
} as const;

/** SSE (Server-Sent Events) configuration */
export const SSE = {
  /** Keep-alive ping interval in milliseconds */
  KEEP_ALIVE_INTERVAL_MS: 30000,
} as const;

/** Pagination defaults */
export const PAGINATION = {
  /** Default page size for list endpoints */
  DEFAULT_PAGE_SIZE: 50,
  /** Maximum page size allowed */
  MAX_PAGE_SIZE: 100,
} as const;
