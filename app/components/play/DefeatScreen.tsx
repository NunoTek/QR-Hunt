import { useTranslation } from "~/i18n/I18nContext";
import { Button } from "../Button";
import { List, Star } from "../icons";

interface DefeatScreenProps {
  teamName: string;
  nodesFound: number;
  totalNodes: number;
  totalPoints: number;
  gameSlug: string;
  feedbackSubmitted: boolean;
  onShowFeedback: () => void;
}

export function DefeatScreen({
  teamName,
  nodesFound,
  totalNodes,
  totalPoints,
  gameSlug,
  feedbackSubmitted,
  onShowFeedback,
}: DefeatScreenProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-bg-secondary to-bg-primary">
      <div className="text-6xl mb-4">💀</div>
      <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-2 text-[var(--color-primary)]">
        {t("pages.play.gameComplete.title")}
      </h1>
      <p className="text-xl text-center text-secondary">
        {t("pages.play.gameComplete.wellPlayed", { teamName })}
      </p>

      {/* Stats Card */}
      <div className="p-6 bg-elevated rounded-lg border shadow-sm mt-6 max-w-[300px] w-full">
        <div className="flex items-center justify-center gap-8">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-extrabold text-[var(--color-primary)]">
              {nodesFound}/{totalNodes}
            </span>
            <span className="text-sm text-muted">{t("pages.play.victory.qrCodes")}</span>
          </div>
          <div className="w-px h-12 bg-border" />
          <div className="flex flex-col items-center">
            <span className="text-3xl font-extrabold text-[var(--color-primary)]">{totalPoints}</span>
            <span className="text-sm text-muted">{t("pages.play.victory.totalPoints")}</span>
          </div>
        </div>
      </div>

      {/* Leaderboard Link */}
      <Button
        as="link"
        to={`/leaderboard/${gameSlug}`}
        variant="primary"
        leftIcon={<List size={20} />}
        className="mt-6 shadow-md"
      >
        {t("pages.play.viewLeaderboard")}
      </Button>

      {/* Feedback Button */}
      <Button
        variant="outline"
        onClick={onShowFeedback}
        leftIcon={<Star size={16} />}
        className="mt-4"
      >
        {feedbackSubmitted ? t("pages.play.feedback.update") : t("pages.play.feedback.leave")}
      </Button>
    </div>
  );
}
