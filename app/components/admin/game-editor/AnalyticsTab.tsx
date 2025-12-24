import { BarChart, CheckCircle, Clock, Loader, Play } from "~/components/icons";
import { type AnalyticsData } from "./types";

interface AnalyticsTabProps {
  analyticsData: AnalyticsData | null;
  analyticsLoading: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function formatTime(ms: number): string {
  if (ms === 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function AnalyticsTab({ analyticsData, analyticsLoading, t }: AnalyticsTabProps) {
  if (analyticsLoading) {
    return (
      <div className="bg-elevated rounded-xl border p-8 shadow-sm text-center">
        <Loader size={32} className="animate-spin mx-auto text-[var(--color-primary)]" />
        <p className="text-muted mt-4">{t("pages.admin.gameEditor.analytics.loading")}</p>
      </div>
    );
  }

  if (!analyticsData || analyticsData.teams.length === 0) {
    return (
      <div className="bg-elevated rounded-xl border p-8 shadow-sm text-center">
        <div className="text-4xl mb-3">📊</div>
        <h3 className="text-lg font-semibold text-primary mb-2">{t("pages.admin.gameEditor.analytics.noData")}</h3>
        <p className="text-secondary text-sm">{t("pages.admin.gameEditor.analytics.noDataDescription")}</p>
      </div>
    );
  }

  const teamColors = analyticsData.teams.map((_, idx) =>
    `hsl(${(idx * 137.5) % 360}, 65%, 55%)`
  );

  const finishedTeams = analyticsData.teams.filter(t => t.isFinished && t.totalTime > 0);
  const avgCompletionTime = finishedTeams.length > 0
    ? finishedTeams.reduce((sum, t) => sum + t.totalTime, 0) / finishedTeams.length
    : null;

  return (
    <div className="space-y-6 flex flex-col gap-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 md:grid-cols-3 gap-4">
        <div className="bg-elevated rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/15 flex items-center justify-center">
              <BarChart size={20} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-sm text-muted">{t("pages.admin.gameEditor.analytics.teamsWithScans")}</p>
              <p className="text-2xl font-bold text-primary">
                {analyticsData.teams.filter(team => team.nodeTimings.length > 0).length} / {analyticsData.teams.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-elevated rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-success)]/15 flex items-center justify-center">
              <CheckCircle size={20} className="text-[var(--color-success)]" />
            </div>
            <div>
              <p className="text-sm text-muted">{t("pages.admin.gameEditor.analytics.finishedTeams")}</p>
              <p className="text-2xl font-bold text-primary">
                {analyticsData.teams.filter(team => team.isFinished).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-elevated rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-warning)]/15 flex items-center justify-center">
              <Clock size={20} className="text-[var(--color-warning)]" />
            </div>
            <div>
              <p className="text-sm text-muted">{t("pages.admin.gameEditor.analytics.avgCompletionTime")}</p>
              <p className="text-2xl font-bold text-primary">
                {avgCompletionTime ? formatTime(avgCompletionTime) : t("pages.admin.gameEditor.analytics.na")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottlenecks */}
      {analyticsData.bottlenecks.length > 0 && (
        <div className="bg-elevated rounded-xl border p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Clock size={20} />
            {t("pages.admin.gameEditor.analytics.bottlenecks")}
          </h3>
          <div className="space-y-3">
            {analyticsData.bottlenecks.map((node, idx) => (
              <div key={node.nodeId} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  idx === 0 ? "bg-[var(--color-error)]/15 text-[var(--color-error)]" :
                  idx === 1 ? "bg-[var(--color-warning)]/15 text-[var(--color-warning)]" :
                  "bg-secondary text-muted"
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-primary">{node.nodeTitle}</p>
                  <p className="text-sm text-muted">{t("pages.admin.gameEditor.analytics.avgLabel")} {formatTime(node.averageTimeMs)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Performance Table */}
      <div className="bg-elevated rounded-xl border overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <BarChart size={20} />
            {t("pages.admin.gameEditor.analytics.teamPerformance")}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.analytics.tableHeaders.rank")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.analytics.tableHeaders.team")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.analytics.tableHeaders.cluesFound")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.analytics.tableHeaders.totalTime")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.analytics.tableHeaders.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {analyticsData.teams
                .filter(team => team.nodeTimings.length > 0)
                .sort((a, b) => a.rank - b.rank)
                .map((team) => (
                  <tr key={team.teamId} className="hover:bg-secondary">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: teamColors[analyticsData.teams.findIndex(item => item.teamId === team.teamId)] }}
                        />
                        <span className="font-medium text-primary">#{team.rank}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {team.teamLogoUrl && (
                          <img src={team.teamLogoUrl} alt="" className="w-6 h-6 rounded object-cover" />
                        )}
                        <span className="text-primary">{team.teamName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-secondary">{team.nodeTimings.length}</td>
                    <td className="px-4 py-3 text-secondary">{formatTime(team.totalTime)}</td>
                    <td className="px-4 py-3">
                      {team.isFinished ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-success)]/15 text-[var(--color-success)]">
                          <CheckCircle size={12} />
                          {t("pages.admin.gameEditor.analytics.finished")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                          <Play size={12} />
                          {t("pages.admin.gameEditor.analytics.inProgress")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              {analyticsData.teams.filter(team => team.nodeTimings.length > 0).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    {t("pages.admin.gameEditor.analytics.noTeamsScanned")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Node Statistics */}
      <div className="bg-elevated rounded-xl border overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <Clock size={20} />
            {t("pages.admin.gameEditor.analytics.timePerClue")}
          </h3>
          <p className="text-sm text-muted mt-1">{t("pages.admin.gameEditor.analytics.timePerClueDescription")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.analytics.clueTableHeaders.clue")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.analytics.clueTableHeaders.avgTime")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.analytics.clueTableHeaders.fastest")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.analytics.clueTableHeaders.slowest")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.analytics.clueTableHeaders.completions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {analyticsData.nodeStats
                .filter(n => n.completionCount > 0)
                .sort((a, b) => b.averageTimeMs - a.averageTimeMs)
                .map((node) => (
                  <tr key={node.nodeId} className="hover:bg-secondary">
                    <td className="px-4 py-3 font-medium text-primary">{node.nodeTitle}</td>
                    <td className="px-4 py-3 text-secondary">{formatTime(node.averageTimeMs)}</td>
                    <td className="px-4 py-3 text-[var(--color-success)]">{formatTime(node.minTimeMs)}</td>
                    <td className="px-4 py-3 text-[var(--color-error)]">{formatTime(node.maxTimeMs)}</td>
                    <td className="px-4 py-3 text-secondary">{node.completionCount}</td>
                  </tr>
                ))}
              {analyticsData.nodeStats.filter(n => n.completionCount > 0).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    {t("pages.admin.gameEditor.analytics.noCluesScanned")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
