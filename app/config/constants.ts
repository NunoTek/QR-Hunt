/**
 * Frontend constants for the QR Hunt application.
 * Centralizes magic numbers and configuration values.
 */

/** QR Scanner configuration */
export const QR_SCANNER = {
  /** Cooldown between scans in milliseconds */
  SCAN_COOLDOWN_MS: 2000,
  /** Ideal video width for camera capture */
  VIDEO_WIDTH: 1280,
  /** Ideal video height for camera capture */
  VIDEO_HEIGHT: 720,
  /** Delay before page reload after successful scan */
  RELOAD_DELAY_MS: 1500,
  /** Delay before playing coin sound */
  COIN_SOUND_DELAY_MS: 200,
  /** Delay before showing auto-start message */
  AUTO_START_MESSAGE_DELAY_MS: 300,
} as const;

/** QR Identify Scanner configuration (admin panel) */
export const QR_IDENTIFY_SCANNER = {
  /** Cooldown between scans in milliseconds (faster for admin) */
  SCAN_COOLDOWN_MS: 1000,
} as const;

/** Team code validation */
export const TEAM_CODE = {
  /** Expected length of team codes */
  LENGTH: 6,
} as const;

/** Animation timings */
export const ANIMATIONS = {
  /** Duration for scan notification to remain visible */
  SCAN_NOTIFICATION_DURATION_MS: 3000,
  /** Duration for rank change indicator to remain visible */
  RANK_CHANGE_INDICATOR_DURATION_MS: 2000,
  /** Copy feedback reset delay */
  COPY_FEEDBACK_DELAY_MS: 2000,
} as const;

/** SSE reconnection configuration */
export const SSE = {
  /** Delay before attempting to reconnect after error */
  RECONNECT_DELAY_MS: 5000,
} as const;

/** API polling intervals */
export const POLLING = {
  /** Interval for checking new messages */
  CHAT_POLL_INTERVAL_MS: 5000,
} as const;
