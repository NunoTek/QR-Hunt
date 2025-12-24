import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { DeleteGameConfirmModal } from "~/components/admin/DeleteGameConfirmModal";
import { StatusBadge } from "~/components/admin/game-editor/StatusBadge";
import { Button } from "~/components/Button";
import { Plus, Trash, Upload } from "~/components/icons";
import { useTranslation } from "~/i18n/I18nContext";
import { getApiUrl } from "~/lib/api";

interface Game {
  id: string;
  name: string;
  publicSlug: string;
  status: string;
  createdAt: string;
  logoUrl?: string | null;
}

interface LoaderData {
  games: Game[];
  stats: {
    totalGames: number;
    activeGames: number;
    completedGames: number;
  };
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
      return json<LoaderData>({
        games: [],
        stats: { totalGames: 0, activeGames: 0, completedGames: 0 },
        baseUrl,
        adminCode,
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
      baseUrl,
      adminCode,
    });
  } catch {
    return json<LoaderData>({
      games: [],
      stats: { totalGames: 0, activeGames: 0, completedGames: 0 },
      baseUrl,
      adminCode,
    });
  }
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);

  const handleImport = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      const gameName = importData.game?.name || "unknown";
      const gameSlug = importData.game?.publicSlug || "";
      const existingGame = data.games.find(g => g.publicSlug === gameSlug);

      if (existingGame) {
        if (!confirm(t("pages.admin.dashboard.confirmOverwrite", { slug: gameSlug }))) {
          setIsImporting(false);
          return;
        }
      } else {
        if (!confirm(t("pages.admin.dashboard.confirmImport", { name: gameName, slug: gameSlug }))) {
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
        alert(t("pages.admin.dashboard.importFailed", { error: result.error }));
      }
    } catch (err) {
      alert(t("pages.admin.dashboard.failedToRead", { error: err instanceof Error ? err.message : "Unknown error" }));
    }
    setIsImporting(false);
  };

  const handleDeleteClick = (game: Game) => {
    setGameToDelete(game);
  };

  const handleDeleteConfirm = async () => {
    if (!gameToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${data.baseUrl}/api/v1/admin/games/${gameToDelete.id}`, {
        method: "DELETE",
        headers: { "x-admin-code": data.adminCode },
      });
      if (response.ok) {
        window.location.reload();
      } else {
        const result = await response.json();
        alert(t("pages.admin.dashboard.deleteFailed", { error: result.error }));
      }
    } catch {
      alert(t("pages.admin.dashboard.deleteFailed", { error: "Unknown error" }));
    }
    setIsDeleting(false);
    setGameToDelete(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t("pages.admin.dashboard.title")}</h1>
        <div className="flex gap-2">
          <Button as="link" to="/admin/games/new" variant="primary" leftIcon={<Plus size={20} />}>
            {t("pages.admin.dashboard.createGame")}
          </Button>
          <label className={`btn btn-secondary cursor-pointer ${isImporting ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload size={20} />
            {isImporting ? t("pages.admin.dashboard.importing") : t("pages.admin.dashboard.import")}
            <input
              type="file"
              accept=".json"
              className="hidden"
              disabled={isImporting}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 xs:grid-cols-3 gap-4 xs:gap-2 mb-8">
        <div className="bg-elevated rounded-xl p-5 border shadow-sm">
          <p className="text-muted text-sm mb-1">{t("pages.admin.dashboard.stats.totalGames")}</p>
          <p className="text-3xl sm:text-4xl font-bold text-primary">{data.stats.totalGames}</p>
        </div>
        <div className="bg-elevated rounded-xl p-5 border shadow-sm">
          <p className="text-muted text-sm mb-1">{t("pages.admin.dashboard.stats.activeGames")}</p>
          <p className="text-3xl sm:text-4xl font-bold text-[var(--color-success)]">{data.stats.activeGames}</p>
        </div>
        <div className="bg-elevated rounded-xl p-5 border shadow-sm">
          <p className="text-muted text-sm mb-1">{t("pages.admin.dashboard.stats.completed")}</p>
          <p className="text-3xl sm:text-4xl font-bold text-primary">{data.stats.completedGames}</p>
        </div>
      </div>

      {/* Recent Games Table */}
      <div className="bg-elevated rounded-xl border overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 border-b border-border">
          <h2 className="text-lg sm:text-xl font-semibold text-primary">{t("pages.admin.dashboard.recentGames")}</h2>
        </div>

        {data.games.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted">{t("pages.admin.dashboard.noGamesYet")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider">{t("pages.admin.dashboard.table.name")}</th>
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden sm:table-cell">{t("pages.admin.dashboard.table.slug")}</th>
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider">{t("pages.admin.dashboard.table.status")}</th>
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">{t("pages.admin.dashboard.table.created")}</th>
                  <th className="px-4 sm:px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.games.slice(0, 5).map((game) => (
                  <tr key={game.id} className="hover:bg-secondary transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        {game.logoUrl ? (
                          <img src={game.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {game.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-primary font-medium">{game.name}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-secondary hidden sm:table-cell">{game.publicSlug}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <StatusBadge status={game.status} t={t} />
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-secondary hidden md:table-cell">
                      {new Date(game.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        <Button
                          as="link"
                          to={`/admin/games/${game.id}`}
                          variant="outline"
                          size="small"
                        >
                          {t("pages.admin.dashboard.manage")}
                        </Button>
                        {(game.status === "draft" || game.status === "completed") && (
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => handleDeleteClick(game)}
                            disabled={isDeleting}
                            title={t("common.delete")}
                          >
                            <Trash size={16} />
                          </Button>
                        )}
                      </div>
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
              {t("pages.admin.dashboard.viewAllGames")}
            </Link>
          </div>
        )}
      </div>

      {/* Delete Game Modal */}
      <DeleteGameConfirmModal
        gameName={gameToDelete?.name || ""}
        isOpen={!!gameToDelete}
        onClose={() => setGameToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        t={t}
      />
    </div>
  );
}
