import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
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
  stats: {
    totalGames: number;
    activeGames: number;
    completedGames: number;
  };
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
      return json<LoaderData>({
        games: [],
        stats: { totalGames: 0, activeGames: 0, completedGames: 0 },
      });
    }

    const data = await response.json();
    const games = data.games as Game[];

    return json<LoaderData>({
      games,
      stats: {
        totalGames: games.length,
        activeGames: games.filter((g) => g.status === "active").length,
        completedGames: games.filter((g) => g.status === "completed").length,
      },
    });
  } catch {
    return json<LoaderData>({
      games: [],
      stats: { totalGames: 0, activeGames: 0, completedGames: 0 },
    });
  }
}

export default function AdminDashboard() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Dashboard</h1>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="bg-elevated rounded-xl p-5 border shadow-sm">
          <p className="text-muted text-sm mb-1">Total Games</p>
          <p className="text-3xl sm:text-4xl font-bold text-primary">{data.stats.totalGames}</p>
        </div>
        <div className="bg-elevated rounded-xl p-5 border shadow-sm">
          <p className="text-muted text-sm mb-1">Active Games</p>
          <p className="text-3xl sm:text-4xl font-bold text-[var(--color-success)]">{data.stats.activeGames}</p>
        </div>
        <div className="bg-elevated rounded-xl p-5 border shadow-sm">
          <p className="text-muted text-sm mb-1">Completed</p>
          <p className="text-3xl sm:text-4xl font-bold text-primary">{data.stats.completedGames}</p>
        </div>
      </div>

      {/* Recent Games Table */}
      <div className="bg-elevated rounded-xl border overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 border-b border-border">
          <h2 className="text-lg sm:text-xl font-semibold text-primary">Recent Games</h2>
        </div>

        {data.games.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted">No games yet. Create your first game to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden sm:table-cell">Slug</th>
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">Created</th>
                  <th className="px-4 sm:px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.games.slice(0, 5).map((game) => (
                  <tr key={game.id} className="hover:bg-secondary transition-colors">
                    <td className="px-4 sm:px-6 py-4 text-primary font-medium">{game.name}</td>
                    <td className="px-4 sm:px-6 py-4 text-secondary hidden sm:table-cell">{game.publicSlug}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          game.status === "active"
                            ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                            : game.status === "completed"
                              ? "bg-[var(--color-info)]/15 text-[var(--color-info)]"
                              : "bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
                        }`}
                      >
                        {game.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-secondary hidden md:table-cell">
                      {new Date(game.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <Link
                        to={`/admin/games/${game.id}`}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] border border-[var(--color-primary)]/30 hover:border-[var(--color-primary)]/50 rounded-lg transition-colors"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.games.length > 5 && (
          <div className="p-4 sm:p-6 border-t border-border">
            <Link to="/admin/games" className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] text-sm transition-colors">
              View all games →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
