import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { getApiUrl } from "~/lib/api";

interface Game {
  id: string;
  name: string;
  publicSlug: string;
  status: string;
  createdAt: string;
}

interface LoaderData {
  games: Game[];
  baseUrl: string;
  adminCode: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const adminCodeMatch = cookieHeader.match(/admin_code=([^;]+)/);
  const adminCode = adminCodeMatch ? adminCodeMatch[1] : "";

  const baseUrl = getApiUrl();

  try {
    const response = await fetch(`${baseUrl}/api/v1/admin/games`, {
      headers: { "x-admin-code": adminCode },
    });

    if (!response.ok) {
      return json<LoaderData>({ games: [], baseUrl, adminCode });
    }

    const data = await response.json();
    return json<LoaderData>({ games: data.games, baseUrl, adminCode });
  } catch {
    return json<LoaderData>({ games: [], baseUrl, adminCode });
  }
}

export default function AdminGames() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      const gameName = importData.game?.name || "unknown";
      const gameSlug = importData.game?.publicSlug || "";

      // Check if game with this slug already exists
      const existingGame = data.games.find(g => g.publicSlug === gameSlug);

      if (existingGame) {
        if (!confirm(`A game with slug "${gameSlug}" already exists. Do you want to overwrite it?`)) {
          setIsImporting(false);
          return;
        }
      } else {
        if (!confirm(`Import game "${gameName}" with slug "${gameSlug}"?`)) {
          setIsImporting(false);
          return;
        }
      }

      const response = await fetch(`${data.baseUrl}/api/v1/admin/games/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-code": data.adminCode,
        },
        body: JSON.stringify({ data: importData, overwrite: !!existingGame }),
      });

      const result = await response.json();
      if (response.ok) {
        alert(`${result.message}`);
        navigate(`/admin/games/${result.game.id}`);
      } else {
        alert(`Import failed: ${result.error}`);
      }
    } catch (err) {
      alert(`Failed to read file: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    setIsImporting(false);
  };

  const StatusBadge = ({ status }: { status: string }) => (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
        status === "active"
          ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
          : status === "completed"
            ? "bg-[var(--color-info)]/15 text-[var(--color-info)]"
            : "bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
      }`}
    >
      {status}
    </span>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary text-center sm:text-left">Games</h1>
        <div className="flex gap-2">
          <label className={`btn btn-secondary cursor-pointer ${isImporting ? "opacity-50 pointer-events-none" : ""}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {isImporting ? "Importing..." : "Import Game"}
            <input
              type="file"
              accept=".json"
              className="hidden"
              disabled={isImporting}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImport(file);
                }
                e.target.value = "";
              }}
            />
          </label>
          <Link
            to="/admin/games/new"
            className="btn btn-primary"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Game
          </Link>
        </div>
      </div>

      {data.games.length === 0 ? (
        <div className="bg-elevated rounded-xl border p-8 text-center shadow-sm">
          <p className="text-muted mb-4">No games yet.</p>
          <Link
            to="/admin/games/new"
            className="btn btn-secondary"
          >
            Create your first game
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-elevated rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider">Slug</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.games.map((game) => (
                  <tr key={game.id} className="hover:bg-secondary transition-colors">
                    <td className="px-6 py-4 text-primary font-medium">{game.name}</td>
                    <td className="px-6 py-4 text-secondary">{game.publicSlug}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={game.status} />
                    </td>
                    <td className="px-6 py-4 text-secondary">
                      {new Date(game.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        <Link
                          to={`/admin/games/${game.id}`}
                          className="px-3 py-1.5 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] border border-[var(--color-primary)]/30 hover:border-[var(--color-primary)]/50 rounded-lg transition-colors"
                        >
                          Manage
                        </Link>
                        <Link
                          to={`/leaderboard/${game.publicSlug}`}
                          target="_blank"
                          className="px-3 py-1.5 text-sm text-secondary hover:text-primary border hover:border-strong rounded-lg transition-colors"
                        >
                          Leaderboard
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {data.games.map((game) => (
              <div key={game.id} className="bg-elevated rounded-xl border p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-primary">{game.name}</h3>
                  <StatusBadge status={game.status} />
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4 gap-1 mb-4 text-sm text-secondary">
                  <span>{game.publicSlug}</span>
                  <span>{new Date(game.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link
                    to={`/admin/games/${game.id}`}
                    className="flex-1 text-center px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-medium rounded-lg hover:opacity-90 transition-all"
                  >
                    Manage
                  </Link>
                  <Link
                    to={`/leaderboard/${game.publicSlug}`}
                    target="_blank"
                    className="flex-1 text-center px-4 py-2 text-secondary border hover:border-strong rounded-lg transition-colors"
                  >
                    Leaderboard
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
