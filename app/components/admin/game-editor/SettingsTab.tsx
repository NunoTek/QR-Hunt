import { Form } from "@remix-run/react";
import { Button } from "~/components/Button";
import { CheckCircle, Clock, Download, Edit, Play, Upload } from "~/components/icons";
import { inputClasses, type Game } from "./types";

function parseCSV(csvText: string): { nodes: Array<Record<string, string>>; edges: Array<{ from: string; to: string }> } {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return { nodes: [], edges: [] };

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const nodes: Array<Record<string, string>> = [];
  const edgesMap: Array<{ from: string; to: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });

    // Only add if there's a title
    if (row.title) {
      nodes.push(row);

      // Parse edges if "next" column exists
      if (row.next && row.next.trim()) {
        edgesMap.push({ from: row.title, to: row.next.trim() });
      }
    }
  }

  return { nodes, edges: edgesMap };
}

function generateExampleCSV(): string {
  return `title,content,contentType,points,isStart,isEnd,hint,next
"Start - Welcome",Welcome to the hunt! Find the old oak tree near the fountain.,text,100,true,false,Look for something tall and leafy,Clue 2 - The Fountain
"Clue 2 - The Fountain",The fountain holds a secret. Look behind the bench nearby.,text,150,false,false,Water flows but secrets hide in stone,Clue 3 - The Garden
"Clue 3 - The Garden",Beautiful flowers bloom here. Find the red roses.,text,200,false,false,Roses are red...,Final - Victory
"Final - Victory",Congratulations! You completed the hunt!,text,250,false,true,,`;
}

interface SettingsTabProps {
  game: Game;
  canActivate: boolean;
  isSubmitting: boolean;
  baseUrl: string;
  adminCode: string;
  onShowDeleteModal: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function SettingsTab({
  game,
  canActivate,
  isSubmitting,
  baseUrl,
  adminCode,
  onShowDeleteModal,
  t,
}: SettingsTabProps) {
  return (
    <div className="space-y-6 flex flex-col gap-4">
      {/* Game Status */}
      <div className="bg-elevated rounded-xl border p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-2">{t("pages.admin.gameEditor.settings.gameStatus.title")}</h3>
        <p className="text-secondary text-sm mb-4">{t("pages.admin.gameEditor.settings.gameStatus.description")}</p>

        <div className="flex items-center gap-4 p-4 rounded-lg border mb-4" style={{
          backgroundColor: game.status === "draft" ? "var(--color-warning)" + "10" :
                         game.status === "pending" ? "var(--color-primary)" + "10" :
                         game.status === "active" ? "var(--color-success)" + "10" :
                         "var(--color-info)" + "10",
          borderColor: game.status === "draft" ? "var(--color-warning)" + "30" :
                      game.status === "pending" ? "var(--color-primary)" + "30" :
                      game.status === "active" ? "var(--color-success)" + "30" :
                      "var(--color-info)" + "30"
        }}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            game.status === "draft" ? "bg-[var(--color-warning)]/20 text-[var(--color-warning)]" :
            game.status === "pending" ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]" :
            game.status === "active" ? "bg-[var(--color-success)]/20 text-[var(--color-success)]" :
            "bg-[var(--color-info)]/20 text-[var(--color-info)]"
          }`}>
            {game.status === "draft" ? (
              <Edit size={24} />
            ) : game.status === "pending" ? (
              <Clock size={24} />
            ) : game.status === "active" ? (
              <Play size={24} />
            ) : (
              <CheckCircle size={24} />
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-primary">
              {t(`pages.admin.gameEditor.settings.gameStatus.${game.status}.label`)}
            </p>
            <p className="text-sm text-secondary">
              {t(`pages.admin.gameEditor.settings.gameStatus.${game.status}.description`)}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted mb-3">{t("pages.admin.gameEditor.settings.gameStatus.changeStatus")}</p>
        <div className="flex flex-wrap gap-3">
          {/* Draft button */}
          <Form method="post" className="inline">
            <input type="hidden" name="_action" value="setStatus" />
            <input type="hidden" name="status" value="draft" />
            <button
              type="submit"
              className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 ${
                game.status === "draft"
                  ? "bg-[var(--color-warning)] text-white cursor-default"
                  : "bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/30 hover:bg-[var(--color-warning)]/25"
              }`}
              disabled={isSubmitting || game.status === "draft"}
            >
              <Edit size={18} />
              {t("pages.admin.gameEditor.settings.gameStatus.draft.label")}
            </button>
          </Form>

          {/* Pending button */}
          <Form method="post" className="inline">
            <input type="hidden" name="_action" value={game.status === "draft" ? "openGame" : "setStatus"} />
            <input type="hidden" name="status" value="pending" />
            <button
              type="submit"
              className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 ${
                game.status === "pending"
                  ? "bg-[var(--color-primary)] text-white cursor-default"
                  : "bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/25"
              }`}
              disabled={isSubmitting || game.status === "pending" || (game.status === "draft" && !canActivate)}
              title={game.status === "draft" && !canActivate ? t("pages.admin.gameEditor.settings.gameStatus.completeSetupFirst") : undefined}
            >
              <Clock size={18} />
              {t("pages.admin.gameEditor.settings.gameStatus.pending.label")}
            </button>
          </Form>

          {/* Active button */}
          <Form method="post" className="inline">
            <input type="hidden" name="_action" value={(game.status === "draft" || game.status === "pending") ? "activateGame" : "setStatus"} />
            <input type="hidden" name="status" value="active" />
            <button
              type="submit"
              className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 ${
                game.status === "active"
                  ? "bg-[var(--color-success)] text-white cursor-default"
                  : "bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/30 hover:bg-[var(--color-success)]/25"
              }`}
              disabled={isSubmitting || game.status === "active" || (game.status === "draft" && !canActivate)}
              title={game.status === "draft" && !canActivate ? t("pages.admin.gameEditor.settings.gameStatus.completeSetupFirst") : undefined}
            >
              <Play size={18} />
              {t("pages.admin.gameEditor.settings.gameStatus.active.label")}
            </button>
          </Form>

          {/* Completed button */}
          <Form method="post" className="inline">
            <input type="hidden" name="_action" value={game.status === "active" ? "completeGame" : "setStatus"} />
            <input type="hidden" name="status" value="completed" />
            <button
              type="submit"
              className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 ${
                game.status === "completed"
                  ? "bg-[var(--color-info)] text-white cursor-default"
                  : "bg-[var(--color-info)]/15 text-[var(--color-info)] border border-[var(--color-info)]/30 hover:bg-[var(--color-info)]/25"
              }`}
              disabled={isSubmitting || game.status === "completed"}
            >
              <CheckCircle size={18} />
              {t("pages.admin.gameEditor.settings.gameStatus.completed.label")}
            </button>
          </Form>
        </div>

        {!canActivate && game.status === "draft" && (
          <p className="text-sm text-[var(--color-warning)] mt-3">
            {t("pages.admin.gameEditor.settings.gameStatus.completeSetup")}
          </p>
        )}
      </div>

      {/* Ranking Mode Setting */}
      <div className="bg-elevated rounded-xl border p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-2">{t("pages.admin.newGame.form.rankingMode")}</h3>
        <p className="text-secondary text-sm mb-4">{t("pages.admin.gameEditor.settings.rankingModeDescription")}</p>

        <Form method="post" className="space-y-4">
          <input type="hidden" name="_action" value="updateRankingMode" />

          <div className="space-y-2">
            {(["points", "nodes", "time"] as const).map((mode) => (
              <label
                key={mode}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  game.settings.rankingMode === mode
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-border bg-secondary hover:border-[var(--color-primary)]/50"
                }`}
              >
                <input
                  type="radio"
                  name="rankingMode"
                  value={mode}
                  defaultChecked={game.settings.rankingMode === mode}
                  className="text-[var(--color-primary)]"
                />
                <div>
                  <span className="font-medium text-primary">{t(`pages.admin.newGame.form.rankingModes.${mode}`)}</span>
                </div>
              </label>
            ))}
          </div>

          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? t("common.saving") : t("common.save")}
          </Button>
        </Form>
      </div>

      {/* Random Mode Setting */}
      <div className="bg-elevated rounded-xl border p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-2">{t("pages.admin.gameEditor.settings.clueOrder.title")}</h3>
        <p className="text-secondary text-sm mb-4">{t("pages.admin.gameEditor.settings.clueOrder.description")}</p>

        <Form method="post" className="space-y-4">
          <input type="hidden" name="_action" value="updateRandomMode" />

          <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-secondary">
            <input
              type="checkbox"
              name="randomMode"
              id="randomMode"
              defaultChecked={game.settings.randomMode || false}
              className="mt-1 rounded bg-secondary border-border"
            />
            <div>
              <label htmlFor="randomMode" className="font-medium text-primary cursor-pointer">
                {t("pages.admin.gameEditor.settings.clueOrder.randomMode")}
              </label>
              <p className="text-sm text-muted mt-1">
                {t("pages.admin.gameEditor.settings.clueOrder.randomModeDescription")}
              </p>
            </div>
          </div>

          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? t("pages.admin.gameEditor.settings.clueOrder.saving") : t("pages.admin.gameEditor.settings.clueOrder.saveSetting")}
          </Button>
        </Form>
      </div>

      {/* Game Logo */}
      <div className="bg-elevated rounded-xl border p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-2">{t("pages.admin.gameEditor.settings.gameLogo.title")}</h3>
        <p className="text-secondary text-sm mb-4">{t("pages.admin.gameEditor.settings.gameLogo.description")}</p>

        {game.logoUrl && (
          <img src={game.logoUrl} alt={t("pages.admin.gameEditor.settings.gameLogo.title")} className="max-w-[150px] max-h-[150px] rounded-lg border mb-4" />
        )}

        <Form method="post" className="space-y-4">
          <input type="hidden" name="_action" value="updateGameLogo" />
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">{t("pages.admin.gameEditor.settings.gameLogo.logoUrl")}</label>
            <input type="url" name="logoUrl" className={inputClasses} placeholder="https://example.com/logo.png" defaultValue={game.logoUrl || ""} />
          </div>
          <Button type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? t("common.saving") : t("pages.admin.gameEditor.settings.gameLogo.saveLogo")}</Button>
        </Form>
      </div>

      {/* Export / Import */}
      <div className="bg-elevated rounded-xl border p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-2">{t("pages.admin.gameEditor.settings.exportImport.title")}</h3>
        <p className="text-secondary text-sm mb-4">{t("pages.admin.gameEditor.settings.exportImport.description")}</p>

        <div className="flex flex-wrap gap-3">
          <Button
            as="a"
            href={`${baseUrl}/api/v1/admin/games/${game.id}/export`}
            variant="secondary"
            download={`${game.publicSlug}-export.json`}
            leftIcon={<Download size={16} />}
          >
            {t("pages.admin.gameEditor.settings.exportImport.exportGame")}
          </Button>
          <label className="btn btn-secondary cursor-pointer">
            <Upload size={16} className="mr-2 inline-block" />
            {t("pages.admin.gameEditor.settings.exportImport.importOverwrite")}
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const importData = JSON.parse(text);
                  if (!confirm(t("pages.admin.gameEditor.settings.exportImport.confirmOverwrite", { name: importData.game?.name || "unknown" }))) {
                    e.target.value = "";
                    return;
                  }
                  const response = await fetch(`${baseUrl}/api/v1/admin/games/import`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "x-admin-code": adminCode,
                    },
                    body: JSON.stringify({ data: importData, overwrite: true }),
                  });
                  const result = await response.json();
                  if (response.ok) {
                    alert(t("pages.admin.gameEditor.settings.exportImport.importSuccess"));
                    window.location.reload();
                  } else {
                    alert(t("pages.admin.gameEditor.settings.exportImport.importFailed", { error: result.error }));
                  }
                } catch (err) {
                  alert(t("pages.admin.gameEditor.settings.exportImport.readFailed", { error: err instanceof Error ? err.message : "Unknown error" }));
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {/* CSV Import */}
      <div className="bg-elevated rounded-xl border p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-2">{t("pages.admin.gameEditor.settings.exportImport.csvTitle")}</h3>
        <p className="text-secondary text-sm mb-4">{t("pages.admin.gameEditor.settings.exportImport.csvDescription")}</p>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            leftIcon={<Download size={16} />}
            onClick={() => {
              const csvContent = generateExampleCSV();
              const blob = new Blob([csvContent], { type: "text/csv" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = "qr-hunt-example.csv";
              link.click();
              URL.revokeObjectURL(link.href);
            }}
          >
            {t("pages.admin.gameEditor.settings.exportImport.downloadExample")}
          </Button>
          <label className="btn btn-secondary cursor-pointer">
            <Upload size={16} className="mr-2 inline-block" />
            {t("pages.admin.gameEditor.settings.exportImport.importCsv")}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const { nodes, edges } = parseCSV(text);

                  if (nodes.length === 0) {
                    alert(t("pages.admin.gameEditor.settings.exportImport.csvNoData"));
                    e.target.value = "";
                    return;
                  }

                  if (!confirm(t("pages.admin.gameEditor.settings.exportImport.csvConfirmImport", { nodes: nodes.length, edges: edges.length }))) {
                    e.target.value = "";
                    return;
                  }

                  const response = await fetch(`${baseUrl}/api/v1/admin/games/${game.id}/import-csv`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "x-admin-code": adminCode,
                    },
                    body: JSON.stringify({ nodes, edges }),
                  });

                  const result = await response.json();
                  if (response.ok) {
                    alert(t("pages.admin.gameEditor.settings.exportImport.csvImportSuccess", { nodes: result.nodesCreated || nodes.length, edges: result.edgesCreated || edges.length }));
                    window.location.reload();
                  } else {
                    alert(t("pages.admin.gameEditor.settings.exportImport.importFailed", { error: result.error }));
                  }
                } catch (err) {
                  alert(t("pages.admin.gameEditor.settings.exportImport.csvParseError", { error: err instanceof Error ? err.message : "Unknown error" }));
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-elevated rounded-xl border border-[var(--color-error)]/50 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[var(--color-error)] mb-2">{t("pages.admin.gameEditor.settings.dangerZone.title")}</h3>
        <p className="text-secondary text-sm mb-4">
          {t("pages.admin.gameEditor.settings.dangerZone.description")}
        </p>
        <Button
          variant="danger"
          onClick={onShowDeleteModal}
          disabled={isSubmitting}
        >
          {t("pages.admin.gameEditor.settings.dangerZone.deleteGame")}
        </Button>
      </div>
    </div>
  );
}
