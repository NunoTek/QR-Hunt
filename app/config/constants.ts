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
  /** Interval for heartbeat pings */
  HEARTBEAT_INTERVAL_MS: 10000,
} as const;

/** PWA Install Prompt configuration */
export const INSTALL_PROMPT = {
  /** Days to wait before showing prompt again after dismissal */
  DISMISS_COOLDOWN_DAYS: 7,
  /** Delay before showing prompt after page load */
  INITIAL_DELAY_MS: 30000,
} as const;

/** QR Code Generator configuration */
export const QR_GENERATOR = {
  /** High resolution size for generated QR codes */
  HIGH_RES_SIZE: 512,
  /** Standard size for generated QR codes */
  STANDARD_SIZE: 256,
} as const;

/** Toast notification configuration */
export const TOAST = {
  /** Default duration for success toasts */
  DEFAULT_DURATION_MS: 3000,
  /** Duration for error toasts */
  ERROR_DURATION_MS: 5000,
  /** Animation exit duration */
  EXIT_ANIMATION_MS: 300,
} as const;

/**
 * Z-index hierarchy for consistent layering across the app.
 * Use these constants instead of hardcoded z-index values.
 */
export const Z_INDEX = {
  /** Base layer for relative positioning */
  BASE: 0,
  /** Slightly elevated content */
  ELEVATED: 10,
  /** Sticky headers */
  STICKY: 50,
  /** Fixed headers and navigation */
  HEADER: 100,
  /** Dropdowns and popovers */
  DROPDOWN: 500,
  /** Chat widget */
  CHAT: 999,
  /** Standard modals and overlays */
  MODAL: 1000,
  /** PWA install prompt */
  INSTALL_PROMPT: 9998,
  /** Toast notifications */
  TOAST: 9999,
  /** Critical overlays (loading, countdown) */
  CRITICAL: 10000,
} as const;

/** Tailwind z-index class mappings */
export const Z_CLASS = {
  BASE: "z-0",
  ELEVATED: "z-10",
  STICKY: "z-50",
  HEADER: "z-[100]",
  DROPDOWN: "z-[500]",
  CHAT: "z-[999]",
  MODAL: "z-[1000]",
  INSTALL_PROMPT: "z-[9998]",
  TOAST: "z-[9999]",
  CRITICAL: "z-[10000]",
} as const;
