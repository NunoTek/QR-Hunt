import { useTranslation } from "~/i18n/I18nContext";
import { Button } from "../Button";
import { List, Star } from "../icons";

interface VictoryScreenProps {
  teamName: string;
  nodesFound: number;
  totalNodes: number;
  totalPoints: number;
  gameSlug: string;
  feedbackSubmitted: boolean;
  onShowFeedback: () => void;
}

export function VictoryScreen({
  teamName,
  nodesFound,
  totalNodes,
  totalPoints,
  gameSlug,
  feedbackSubmitted,
  onShowFeedback,
}: VictoryScreenProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[var(--color-primary)]/10 to-[var(--color-success)]/10 relative overflow-hidden">
      {/* Confetti Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute -top-2.5 w-2.5 h-2.5 opacity-80 animate-[confetti-fall_3s_linear_infinite]"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              backgroundColor: ["#fbbf24", "#f59e0b", "#ef4444", "#10b981", "#6366f1"][
                Math.floor(Math.random() * 5)
              ],
            }}
          />
        ))}
      </div>

      <div className="text-6xl mb-4">👑</div>
      <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-2 text-[var(--color-primary)]">
        {t("pages.play.victory.title")}
      </h1>
      <p className="text-xl text-center text-secondary mb-4">
        {t("pages.play.victory.congratulations", { teamName })}
      </p>
      <p className="mt-4 text-muted">{t("pages.play.victory.finishedFirst")}</p>

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

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
