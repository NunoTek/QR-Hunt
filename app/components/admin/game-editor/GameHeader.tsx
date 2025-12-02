import { Form, Link } from "@remix-run/react";
import { Button } from "~/components/Button";
import { StatusBadge } from "./StatusBadge";
import { type Game } from "./types";

interface GameHeaderProps {
  game: Game;
  canActivate: boolean;
  isSubmitting: boolean;
  t: (key: string) => string;
}

export function GameHeader({ game, canActivate, isSubmitting, t }: GameHeaderProps) {
  return (
    <div className="mb-6">
      <Link to="/admin/games" className="text-muted hover:text-[var(--color-primary)] text-sm transition-colors">
        {t("pages.admin.gameEditor.backToGames")}
      </Link>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-2">
        <div className="flex items-center gap-4">
          {game.logoUrl && (
            <img
              src={game.logoUrl}
              alt={`${game.name} logo`}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover"
            />
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">{game.name}</h1>
            <p className="text-secondary">/{game.publicSlug}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <StatusBadge status={game.status} t={t} />

          {game.status === "draft" && (
            <Form method="post" className="inline">
              <input type="hidden" name="_action" value="activateGame" />
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !canActivate}
                title={!canActivate ? t("pages.admin.gameEditor.activationWarning.title") : ""}
              >
                {t("pages.admin.gameEditor.activateGame")}
              </Button>
            </Form>
          )}

          {game.status === "active" && (
            <Form method="post" className="inline">
              <input type="hidden" name="_action" value="completeGame" />
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {t("pages.admin.gameEditor.completeGame")}
              </Button>
            </Form>
          )}

          <Button as="link" to={`/leaderboard/${game.publicSlug}`} variant="secondary" target="_blank">
            {t("pages.admin.gameEditor.viewLeaderboard")}
          </Button>
        </div>
      </div>
    </div>
  );
}
