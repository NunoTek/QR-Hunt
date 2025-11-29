import { useState, useEffect, useCallback } from "react";
import {
  isOnline,
  cacheGameData,
  getCachedGameData,
  getPendingScans,
  addPendingScan,
  removePendingScan,
  clearPendingScans,
  getToken,
  type CachedGameData,
  type PendingScan,
} from "~/lib/tokenStorage";

interface UseOfflineModeOptions {
  gameSlug: string;
  onSyncComplete?: () => void;
}

interface UseOfflineModeReturn {
  isOffline: boolean;
  cachedData: CachedGameData | null;
  pendingScans: PendingScan[];
  pendingCount: number;
  isSyncing: boolean;
  cacheCurrentState: (data: Omit<CachedGameData, "cachedAt">) => void;
  queueScan: (nodeKey: string, password?: string) => PendingScan;
  syncPendingScans: () => Promise<void>;
}

export function useOfflineMode({ gameSlug, onSyncComplete }: UseOfflineModeOptions): UseOfflineModeReturn {
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [cachedData, setCachedData] = useState<CachedGameData | null>(null);
  const [pendingScans, setPendingScans] = useState<PendingScan[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load cached data and pending scans on mount
  useEffect(() => {
    const cached = getCachedGameData();
    if (cached && cached.gameSlug === gameSlug) {
      setCachedData(cached);
    }
    setPendingScans(getPendingScans());
  }, [gameSlug]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (!isOffline && pendingScans.length > 0) {
      syncPendingScans();
    }
  }, [isOffline]);

  const cacheCurrentState = useCallback((data: Omit<CachedGameData, "cachedAt">) => {
    cacheGameData(data);
    setCachedData({ ...data, cachedAt: Date.now() });
  }, []);

  const queueScan = useCallback((nodeKey: string, password?: string): PendingScan => {
    const scan = addPendingScan(nodeKey, password);
    setPendingScans(getPendingScans());
    return scan;
  }, []);

  const syncPendingScans = useCallback(async () => {
    const scans = getPendingScans();
    if (scans.length === 0 || isSyncing) return;

    setIsSyncing(true);
    const token = getToken();

    for (const scan of scans) {
      try {
        const response = await fetch("/api/v1/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            nodeKey: scan.nodeKey,
            password: scan.password,
          }),
        });

        if (response.ok) {
          removePendingScan(scan.id);
        }
      } catch {
        // Network error, stop syncing
        break;
      }
    }

    setPendingScans(getPendingScans());
    setIsSyncing(false);

    if (getPendingScans().length === 0 && onSyncComplete) {
      onSyncComplete();
    }
  }, [isSyncing, onSyncComplete]);

  return {
    isOffline,
    cachedData,
    pendingScans,
    pendingCount: pendingScans.length,
    isSyncing,
    cacheCurrentState,
    queueScan,
    syncPendingScans,
  };
}
