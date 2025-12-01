import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
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
  const { t } = useTranslation();
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter games
  const filteredGames = data.games.filter((game) => {
    const matchesStatus = statusFilter === "all" || game.status === statusFilter;
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          game.publicSlug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
        if (!confirm(t("pages.admin.gamesList.confirm.overwrite", { slug: gameSlug }))) {
          setIsImporting(false);
          return;
        }
      } else {
        if (!confirm(t("pages.admin.gamesList.confirm.import", { name: gameName, slug: gameSlug }))) {
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
        alert(t("pages.admin.gamesList.errors.importFailed", { error: result.error }));
      }
    } catch (err) {
      alert(t("pages.admin.gamesList.errors.readFailed", { error: err instanceof Error ? err.message : "Unknown error" }));
    }
    setIsImporting(false);
  };

  const handleDelete = async (game: Game) => {
    if (!confirm(t("pages.admin.gamesList.confirm.delete", { name: game.name }))) {
      return;
    }
    setIsDeleting(game.id);
    try {
      const response = await fetch(`${data.baseUrl}/api/v1/admin/games/${game.id}`, {
        method: "DELETE",
        headers: { "x-admin-code": data.adminCode },
      });
      if (response.ok) {
        window.location.reload();
      } else {
        const result = await response.json();
        alert(t("pages.admin.gamesList.errors.deleteFailed", { error: result.error }));
      }
    } catch {
      alert(t("pages.admin.gamesList.errors.deleteFailed", { error: "Unknown error" }));
    }
    setIsDeleting(null);
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
      {t(`common.status.${status}`)}
    </span>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t("pages.admin.gamesList.title")}</h1>
        <div className="flex gap-2">
          <Link to="/admin/games/new" className="btn btn-primary">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t("pages.admin.gamesList.createGame")}
          </Link>
          <label className={`btn btn-secondary cursor-pointer ${isImporting ? "opacity-50 pointer-events-none" : ""}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {isImporting ? t("pages.admin.gamesList.importing") : t("pages.admin.gamesList.import")}
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t("pages.admin.gamesList.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-secondary border rounded-lg text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-secondary border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
        >
          <option value="all">{t("pages.admin.gamesList.filters.allStatus")}</option>
          <option value="draft">{t("pages.admin.gamesList.filters.draft")}</option>
          <option value="active">{t("pages.admin.gamesList.filters.active")}</option>
          <option value="completed">{t("pages.admin.gamesList.filters.completed")}</option>
        </select>
      </div>

      {filteredGames.length === 0 ? (
        <div className="bg-elevated rounded-xl border p-8 text-center shadow-sm">
          <p className="text-muted mb-4">
            {data.games.length === 0 ? t("pages.admin.gamesList.empty.noGames") : t("pages.admin.gamesList.empty.noMatches")}
          </p>
          {data.games.length === 0 && (
            <Link to="/admin/games/new" className="btn btn-secondary">
              {t("pages.admin.gamesList.empty.createFirst")}
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-elevated rounded-xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider">{t("pages.admin.gamesList.table.name")}</th>
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden sm:table-cell">{t("pages.admin.gamesList.table.slug")}</th>
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider">{t("pages.admin.gamesList.table.status")}</th>
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">{t("pages.admin.gamesList.table.created")}</th>
                  <th className="px-4 sm:px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredGames.map((game) => (
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
                      <StatusBadge status={game.status} />
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-secondary hidden md:table-cell">
                      {new Date(game.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        <Link
                          to={`/admin/games/${game.id}`}
                          className="px-3 py-1.5 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] border border-[var(--color-primary)]/30 hover:border-[var(--color-primary)]/50 rounded-lg transition-colors"
                        >
                          {t("pages.admin.gamesList.actions.manage")}
                        </Link>

                        {(game.status === "draft" || game.status === "completed") && (
                          <button
                            type="button"
                            onClick={() => handleDelete(game)}
                            disabled={isDeleting === game.id}
                            className="px-2 py-1.5 text-sm text-[var(--color-error)] border border-[var(--color-error)]/30 hover:bg-[var(--color-error)]/10 rounded-lg transition-colors disabled:opacity-50"
                            title={t("pages.admin.gamesList.actions.delete")}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span className="hidden">{t("common.delete")}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
