import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { Chat } from "~/components/Chat";
import { ClueDisplay } from "~/components/ClueDisplay";
import { Spinner } from "~/components/Loading";
import { QRScanner } from "~/components/QRScanner";
import { ToastProvider, useToast } from "~/components/Toast";
import { getApiUrl } from "~/lib/api";
import { playCoinSound, playDefeatSound, playSuccessSound, playVictorySound } from "~/lib/sounds";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data?.teamName ? `${data.teamName} - QR Hunt` : "QR Hunt" },
  ];
};

interface LoaderData {
  teamId: string;
  teamName: string;
  teamCode: string;
  teamLogoUrl: string | null;
  gameSlug: string;
  gameName: string;
  gameLogoUrl: string | null;
  currentNode: {
    id: string;
    title: string;
    content: string | null;
    contentType: string;
    mediaUrl: string | null;
    isEnd: boolean;
  } | null;
  startingClue: {
    id: string;
    title: string;
    content: string | null;
    contentType: string;
    mediaUrl: string | null;
  } | null;
  scannedNodes: Array<{
    id: string;
    title: string;
    content: string | null;
    contentType: string;
    mediaUrl: string | null;
    points: number;
    timestamp: string;
    isEnd: boolean;
  }>;
  nodesFound: number;
  totalNodes: number;
  totalPoints: number;
  isFinished: boolean;
  isWinner: boolean;
  token: string;
  baseUrl: string;
  pendingScan?: string;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { gameSlug } = params;
  const url = new URL(request.url);
  const pendingScan = url.searchParams.get("scan") || undefined;

  const cookieHeader = request.headers.get("Cookie") || "";
  const tokenMatch = cookieHeader.match(/team_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  if (!token) {
    return redirect(`/join?game=${gameSlug}${pendingScan ? `&scan=${pendingScan}` : ""}`);
  }

  const baseUrl = getApiUrl();

  try {
    // Get team session info
    const meResponse = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!meResponse.ok) {
      return redirect(`/join?game=${gameSlug}`);
    }

    const meData = await meResponse.json();

    // Get game info
    const gameResponse = await fetch(`${baseUrl}/api/v1/game/${gameSlug}`);
    if (!gameResponse.ok) {
      throw new Response("Game not found", { status: 404 });
    }
    const gameData = await gameResponse.json();

    // Get team progress
    const progressResponse = await fetch(`${baseUrl}/api/v1/scan/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let progressData = {
      currentNode: null,
      startingClue: null,
      scannedNodes: [],
      nodesFound: 0,
      totalNodes: 0,
      totalPoints: 0,
      isFinished: false,
      isWinner: false,
    };

    if (progressResponse.ok) {
      progressData = await progressResponse.json();
    }

    // Get base URL for share links
    const requestUrl = new URL(request.url);
    const appBaseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

    return json<LoaderData>({
      teamId: meData.team.id,
      teamName: meData.team.name,
      teamCode: meData.team.code,
      teamLogoUrl: meData.team.logoUrl || null,
      gameSlug: gameSlug!,
      gameName: gameData.name,
      gameLogoUrl: gameData.logoUrl || null,
      currentNode: progressData.currentNode,
      startingClue: progressData.startingClue || null,
      scannedNodes: progressData.scannedNodes || [],
      nodesFound: progressData.nodesFound,
      totalNodes: progressData.totalNodes,
      totalPoints: progressData.totalPoints,
      isFinished: progressData.isFinished,
      isWinner: progressData.isWinner,
      token,
      baseUrl: appBaseUrl,
      pendingScan,
    });
  } catch {
    return redirect(`/join?game=${gameSlug}`);
  }
}

export default function PlayGame() {
  return (
    <ToastProvider>
      <PlayGameContent />
    </ToastProvider>
  );
}

function PlayGameContent() {
  const data = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [autoScanResult, setAutoScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const toast = useToast();
  const soundPlayedRef = useRef(false);

  // Generate share link
  const shareLink = `${data.baseUrl}/join?game=${data.gameSlug}`;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const shareWithNavigator = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${data.teamName} in ${data.gameName}!`,
          text: `Join our team in ${data.gameName}!\n\nGame ID: ${data.gameSlug}\nTeam Code: ${data.teamCode}`,
          url: shareLink,
        });
      } catch (err) {
        // User cancelled or share failed - ignore
      }
    } else {
      // Fallback: copy link
      copyToClipboard(shareLink, "link");
    }
  };

  // Play victory or defeat sound on finished screen
  useEffect(() => {
    if (data.isFinished && !soundPlayedRef.current) {
      soundPlayedRef.current = true;
      // Small delay to ensure audio context is ready
      setTimeout(() => {
        if (data.isWinner) {
          playVictorySound();
        } else {
          playDefeatSound();
        }
      }, 300);
    }
  }, [data.isFinished, data.isWinner]);

  // Auto-scan if there's a pending scan from QR code redirect
  useEffect(() => {
    const pendingScan = searchParams.get("scan");
    if (pendingScan && data.token) {
      setIsAutoScanning(true);
      // Clear the scan parameter
      setSearchParams({}, { replace: true });

      // Perform the scan
      fetch("/api/v1/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.token}`,
        },
        body: JSON.stringify({ nodeKey: pendingScan }),
      })
        .then((res) => res.json())
        .then((result) => {
          setAutoScanResult(result);
          if (result.success) {
            // Play success sounds
            playSuccessSound();
            if (result.pointsAwarded) {
              setTimeout(() => playCoinSound(), 200);
            }
            toast.success(result.message);
            if (result.pointsAwarded) {
              toast.success(`+${result.pointsAwarded} points!`);
            }
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            toast.error(result.message);
            setIsAutoScanning(false);
          }
        })
        .catch(() => {
          setAutoScanResult({ success: false, message: "Failed to record scan" });
          toast.error("Failed to record scan");
          setIsAutoScanning(false);
        });
    }
  }, []);

  // Show victory screen
  if (data.isFinished && data.isWinner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[var(--color-primary)]/10 to-[var(--color-success)]/10 relative overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="absolute -top-2.5 w-2.5 h-2.5 opacity-80 animate-[confetti-fall_3s_linear_infinite]" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              backgroundColor: ['#fbbf24', '#f59e0b', '#ef4444', '#10b981', '#6366f1'][Math.floor(Math.random() * 5)]
            }} />
          ))}
        </div>
        <div className="text-6xl mb-4">👑</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-2 text-[var(--color-primary)]">Victory!</h1>
        <p className="text-xl text-center text-secondary mb-4">Congratulations, {data.teamName}!</p>
        <p className="mt-4 text-muted">You finished first!</p>

        <div className="p-6 bg-elevated rounded-lg border border-border shadow-sm mt-6 max-w-[300px] w-full">
          <div className="flex items-center justify-center gap-8">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-[var(--color-primary)]">{data.nodesFound}/{data.totalNodes}</span>
              <span className="text-sm text-muted">QR Codes</span>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-[var(--color-primary)]">{data.totalPoints}</span>
              <span className="text-sm text-muted">Total Points</span>
            </div>
          </div>
        </div>

        <Link to={`/leaderboard/${data.gameSlug}`} className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-white bg-[var(--color-primary)] rounded-lg hover:opacity-90 transition-colors mt-6 shadow-md">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 6L21 6" />
            <path d="M8 12L21 12" />
            <path d="M8 18L21 18" />
            <path d="M3 6L3.01 6" />
            <path d="M3 12L3.01 12" />
            <path d="M3 18L3.01 18" />
          </svg>
          View Leaderboard
        </Link>

        <style>{`
          @keyframes confetti-fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  // Show defeat screen
  if (data.isFinished && !data.isWinner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-bg-secondary to-bg-primary">
        <div className="text-6xl mb-4">🏁</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-2 text-[var(--color-primary)]">Game Complete</h1>
        <p className="text-xl text-center text-secondary">Well played, {data.teamName}!</p>

        <div className="p-6 bg-elevated rounded-lg border border-border shadow-sm mt-6 max-w-[300px] w-full">
          <div className="flex items-center justify-center gap-8">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-[var(--color-primary)]">{data.nodesFound}/{data.totalNodes}</span>
              <span className="text-sm text-muted">QR Codes</span>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-[var(--color-primary)]">{data.totalPoints}</span>
              <span className="text-sm text-muted">Total Points</span>
            </div>
          </div>
        </div>

        <Link to={`/leaderboard/${data.gameSlug}`} className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-white bg-[var(--color-primary)] rounded-lg hover:opacity-90 transition-colors mt-6 shadow-md">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 6L21 6" />
            <path d="M8 12L21 12" />
            <path d="M8 18L21 18" />
            <path d="M3 6L3.01 6" />
            <path d="M3 12L3.01 12" />
            <path d="M3 18L3.01 18" />
          </svg>
          View Leaderboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-6 px-4 flex justify-center">
      <div className="w-full max-w-2xl">
        {/* Auto-scan loading overlay */}
        {isAutoScanning && !autoScanResult && (
          <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50">
            <Spinner size="lg" />
            <p className="text-white mt-4">Processing QR code...</p>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-2 text-sm text-secondary">
              {data.gameLogoUrl && (
                <img
                  src={data.gameLogoUrl}
                  alt={`${data.gameName} logo`}
                  style={{ width: "20px", height: "20px", borderRadius: "4px", objectFit: "cover" }}
                />
              )}
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
              <span>{data.gameName}</span>
            </div>
            <div className="flex items-center gap-2">
              {data.teamLogoUrl && (
                <img
                  src={data.teamLogoUrl}
                  alt={`${data.teamName} logo`}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              )}
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">{data.teamName}</h1>
            </div>
          </div>
          <div className="flex flex-col items-center px-5 py-3 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-xl text-white shadow-md">
            <span className="text-3xl font-extrabold leading-none">{data.totalPoints}</span>
            <span className="text-xs opacity-90">points</span>
          </div>
        </div>

        {/* Current clue or scanner */}
        {data.currentNode ? (
          <div className="mb-6">
            <ClueDisplay node={data.currentNode} />
            <div className="mt-6">
              <div className="flex items-center gap-4 p-4 bg-tertiary rounded-xl mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-elevated text-[var(--color-primary)] flex-shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-primary">Use this clue to find the next location</p>
                  <p className="text-sm text-muted">Scan the QR code when you get there</p>
                </div>
              </div>
              <QRScanner gameSlug={data.gameSlug} token={data.token} autoStart />
            </div>
          </div>
        ) : data.startingClue ? (
          <div className="mb-6">
            <div className="p-6 bg-elevated rounded-lg border border-border shadow-sm">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-success)] to-emerald-700 text-white flex-shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-primary m-0">Your Starting Clue</h2>
                  <p className="text-muted text-sm m-0">{data.startingClue.title}</p>
                </div>
              </div>
              <ClueDisplay node={data.startingClue} hideTitle />
            </div>
            <div className="mt-6">
              <div className="flex items-center gap-4 p-4 bg-tertiary rounded-xl mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-elevated text-[var(--color-primary)] flex-shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-primary">Find the location and scan the QR code</p>
                  <p className="text-sm text-muted">This will start your hunt!</p>
                </div>
              </div>
              <QRScanner gameSlug={data.gameSlug} token={data.token} autoStart />
            </div>
          </div>
        ) : (
          <div className="p-8 bg-elevated rounded-lg border border-border shadow-sm text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white mb-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-primary mb-2">Ready to Begin?</h2>
            <p className="text-muted mb-6">
              Scan your first QR code to start the hunt!
            </p>
            <QRScanner gameSlug={data.gameSlug} token={data.token} autoStart />
          </div>
        )}

        {/* Progress Card */}
        <div className="p-6 bg-gradient-to-br from-bg-secondary to-bg-elevated rounded-lg border border-border shadow-sm">
          <div className="flex items-center gap-2 text-secondary mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="font-semibold">Your Progress</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-[var(--color-primary)]">{data.nodesFound}</span>
              <span className="text-lg text-secondary">/ {data.totalNodes}</span>
            </div>
            <span className="text-sm text-muted mt-1">QR codes found</span>
            {data.nodesFound > 0 && data.nodesFound < data.totalNodes && (
              <span className="text-sm text-secondary mt-2">{data.totalNodes - data.nodesFound} more to find!</span>
            )}
            {data.nodesFound >= data.totalNodes && !data.isFinished && (
              <span className="text-sm text-[var(--color-success)] mt-2 font-medium">All found! Scan an end point to finish!</span>
            )}
          </div>
        </div>

        {/* Scan History */}
        {data.scannedNodes.length > 0 && (
          <div className="p-6 bg-elevated rounded-lg border border-border shadow-sm mt-6">
            <div className="flex items-center gap-2 text-secondary mb-4 font-semibold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>Your Journey</span>
            </div>
            <div className="flex flex-col gap-2">
              {data.scannedNodes.map((node, index) => (
                <div key={node.id} className="flex items-center gap-4 p-3 bg-secondary rounded-lg border border-border">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-primary)] text-white font-bold text-sm flex-shrink-0">{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-primary truncate">{node.title}</div>
                    <div className="text-sm text-[var(--color-success)] font-semibold">+{node.points} points</div>
                  </div>
                  <div className="text-[var(--color-success)] flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="flex justify-center gap-4 mt-6">
          <Link to={`/leaderboard/${data.gameSlug}`} className="inline-flex items-center gap-2 px-4 py-2 text-secondary border border-border hover:border-strong rounded-lg transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6L21 6" />
              <path d="M8 12L21 12" />
              <path d="M8 18L21 18" />
              <path d="M3 6L3.01 6" />
              <path d="M3 12L3.01 12" />
              <path d="M3 18L3.01 18" />
            </svg>
            Leaderboard
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 text-secondary border border-border hover:border-strong rounded-lg transition-colors"
            onClick={() => setShowSharePanel(!showSharePanel)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Invite Team
          </button>
        </div>

        {/* Share Panel */}
        {showSharePanel && (
          <div className="p-6 bg-elevated rounded-lg border border-border shadow-sm mt-4 animate-fade-in">
            <div className="flex items-center gap-2 font-semibold text-primary mb-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Invite Teammates</span>
            </div>
            <p className="text-sm text-muted mb-4">Share these details so teammates can join your team</p>

            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wide">Game ID</label>
                <div className="flex items-center gap-2 p-3 bg-secondary border border-border rounded-lg">
                  <span className="flex-1 text-sm text-primary break-all">{data.gameSlug}</span>
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 bg-tertiary rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors flex-shrink-0"
                    onClick={() => copyToClipboard(data.gameSlug, "gameSlug")}
                  >
                    {copiedField === "gameSlug" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wide">Team Code</label>
                <div className="flex items-center gap-2 p-3 bg-secondary border border-border rounded-lg">
                  <span className="flex-1 font-mono text-xl font-bold tracking-wider text-primary">{data.teamCode}</span>
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 bg-tertiary rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors flex-shrink-0"
                    onClick={() => copyToClipboard(data.teamCode, "teamCode")}
                  >
                    {copiedField === "teamCode" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-medium rounded-lg hover:opacity-90 transition-colors shadow-md"
                onClick={shareWithNavigator}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share Invite Link
              </button>
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-secondary border border-border hover:border-strong rounded-lg transition-colors"
                onClick={() => copyToClipboard(shareLink, "link")}
              >
                {copiedField === "link" ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chat Component */}
      <Chat
        gameSlug={data.gameSlug}
        token={data.token}
        currentTeamId={data.teamId}
      />
    </div>
  );
}
