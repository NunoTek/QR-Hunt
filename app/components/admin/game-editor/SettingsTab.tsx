import { Form } from "@remix-run/react";
import { Button } from "~/components/Button";
import { CheckCircle, Edit, Play } from "~/components/icons";
import { type Game } from "./types";

interface SettingsTabProps {
  game: Game;
  canActivate: boolean;
  isSubmitting: boolean;
  t: (key: string) => string;
}

export function SettingsTab({ game, canActivate, isSubmitting, t }: SettingsTabProps) {
  const getStatusStyle = (status: string) => {
    const styles = {
      draft: { bg: "var(--color-warning)", label: "Draft", desc: "Game is being set up and not yet playable." },
      active: { bg: "var(--color-success)", label: "Active", desc: "Game is live! Teams can join and play." },
      completed: { bg: "var(--color-info)", label: "Completed", desc: "Game has ended. Results are final." },
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  const statusInfo = getStatusStyle(game.status);

  return (
    <div className="space-y-6">
      {/* Game Status */}
      <div className="bg-elevated rounded-xl border p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-2">Game Status</h3>
        <p className="text-secondary text-sm mb-4">Control the current status of your game.</p>

        <div
          className="flex items-center gap-4 p-4 rounded-lg border mb-4"
          style={{
            backgroundColor: `${statusInfo.bg}10`,
            borderColor: `${statusInfo.bg}30`,
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${statusInfo.bg}20`, color: statusInfo.bg }}
          >
            {game.status === "draft" ? (
              <Edit size={24} />
            ) : game.status === "active" ? (
              <Play size={24} />
            ) : (
              <CheckCircle size={24} />
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-primary">{statusInfo.label}</p>
            <p className="text-sm text-secondary">{statusInfo.desc}</p>
          </div>
        </div>

        <p className="text-sm text-muted mb-3">Change the game status:</p>
        <div className="flex flex-wrap gap-3">
          {(["draft", "active", "completed"] as const).map((status) => {
            const style = getStatusStyle(status);
            const isCurrent = game.status === status;
            const isDisabled = isSubmitting || isCurrent || (status === "active" && game.status === "draft" && !canActivate);
            const action = status === "active" && game.status === "draft" ? "activateGame" :
                          status === "completed" && game.status === "active" ? "completeGame" : "setStatus";

            return (
              <Form key={status} method="post" className="inline">
                <input type="hidden" name="_action" value={action} />
                <input type="hidden" name="status" value={status} />
                <button
                  type="submit"
                  className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50`}
                  style={{
                    backgroundColor: isCurrent ? style.bg : `${style.bg}15`,
                    color: isCurrent ? "white" : style.bg,
                    border: isCurrent ? "none" : `1px solid ${style.bg}30`,
                  }}
                  disabled={isDisabled}
                  title={status === "active" && game.status === "draft" && !canActivate ? "Complete setup requirements first" : undefined}
                >
                  {style.label}
                </button>
              </Form>
            );
          })}
        </div>

        {!canActivate && game.status === "draft" && (
          <p className="text-sm text-[var(--color-warning)] mt-3">
            Complete the setup checklist above before activating the game.
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
            {t("pages.admin.gameEditor.settings.saveRankingMode")}
          </Button>
        </Form>
      </div>

      {/* Random Mode Setting */}
      <div className="bg-elevated rounded-xl border p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-2">{t("pages.admin.newGame.form.randomMode")}</h3>
        <p className="text-secondary text-sm mb-4">{t("pages.admin.newGame.form.randomModeDescription")}</p>

        <Form method="post" className="space-y-4">
          <input type="hidden" name="_action" value="updateRandomMode" />

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="randomMode"
              defaultChecked={game.settings.randomMode}
              className="rounded bg-secondary border-border w-5 h-5"
            />
            <span className="text-primary">{t("pages.admin.gameEditor.settings.enableRandomMode")}</span>
          </label>

          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {t("pages.admin.gameEditor.settings.saveRandomMode")}
          </Button>
        </Form>
      </div>
    </div>
  );
}
