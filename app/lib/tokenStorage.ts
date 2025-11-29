/**
 * Token storage utility using localStorage.
 * Replaces cookie-based authentication for GDPR compliance
 * and better compatibility with browsers that block cookies.
 */

const TOKEN_KEY = "qrhunt_token";
const GAME_KEY = "qrhunt_game";

/**
 * Check if localStorage is available (client-side only)
 */
function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const test = "__storage_test__";
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the stored authentication token
 */
export function getToken(): string | null {
  if (!isStorageAvailable()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store the authentication token
 */
export function setToken(token: string): void {
  if (!isStorageAvailable()) return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove the authentication token (logout)
 */
export function removeToken(): void {
  if (!isStorageAvailable()) return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Get the stored game slug
 */
export function getGameSlug(): string | null {
  if (!isStorageAvailable()) return null;
  return localStorage.getItem(GAME_KEY);
}

/**
 * Store the current game slug
 */
export function setGameSlug(slug: string): void {
  if (!isStorageAvailable()) return;
  localStorage.setItem(GAME_KEY, slug);
}

/**
 * Remove the stored game slug
 */
export function removeGameSlug(): void {
  if (!isStorageAvailable()) return;
  localStorage.removeItem(GAME_KEY);
}

/**
 * Clear all auth data (full logout)
 */
export function clearAuth(): void {
  removeToken();
  removeGameSlug();
}

/**
 * Create headers object with Authorization token
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Create headers for JSON requests with auth
 */
export function getJsonAuthHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  };
}

// ============================================
// Offline Mode Support
// ============================================

const CACHE_KEY = "qrhunt_cache";
const PENDING_SCANS_KEY = "qrhunt_pending_scans";

export interface CachedGameData {
  gameSlug: string;
  teamName: string;
  progress: {
    nodesFound: number;
    totalPoints: number;
    isFinished: boolean;
    nextClue: {
      title: string;
      content: string | null;
      contentType: string;
      mediaUrl: string | null;
    } | null;
  };
  gameName: string;
  cachedAt: number;
}

export interface PendingScan {
  id: string;
  nodeKey: string;
  password?: string;
  timestamp: number;
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function cacheGameData(data: Omit<CachedGameData, "cachedAt">): void {
  if (!isStorageAvailable()) return;
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() }));
}

export function getCachedGameData(): CachedGameData | null {
  if (!isStorageAvailable()) return null;
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function clearCache(): void {
  if (!isStorageAvailable()) return;
  localStorage.removeItem(CACHE_KEY);
}

export function addPendingScan(nodeKey: string, password?: string): PendingScan {
  const scan: PendingScan = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    nodeKey,
    password,
    timestamp: Date.now(),
  };
  if (!isStorageAvailable()) return scan;
  const pending = getPendingScans();
  if (!pending.find((s) => s.nodeKey === nodeKey)) {
    pending.push(scan);
    localStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(pending));
  }
  return scan;
}

export function getPendingScans(): PendingScan[] {
  if (!isStorageAvailable()) return [];
  try {
    const data = localStorage.getItem(PENDING_SCANS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function removePendingScan(id: string): void {
  if (!isStorageAvailable()) return;
  const pending = getPendingScans().filter((s) => s.id !== id);
  localStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(pending));
}

export function clearPendingScans(): void {
  if (!isStorageAvailable()) return;
  localStorage.removeItem(PENDING_SCANS_KEY);
}

export function hasPendingScans(): boolean {
  return getPendingScans().length > 0;
}
