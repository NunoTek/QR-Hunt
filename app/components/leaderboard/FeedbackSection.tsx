import { useTranslation } from "~/i18n/I18nContext";
import type { FeedbackData } from "./types";
import { ChevronDown } from "../icons";

interface FeedbackSectionProps {
  feedbackData: FeedbackData;
  showFeedback: boolean;
  onToggle: () => void;
}

export function FeedbackSection({ feedbackData, showFeedback, onToggle }: FeedbackSectionProps) {
  const { t } = useTranslation();

  if (feedbackData.count === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-elevated rounded-lg border hover:border-strong transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">⭐</span>
          <div className="text-left">
            <span className="font-semibold text-primary">{t("pages.leaderboard.teamFeedback")}</span>
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>
                {feedbackData.averageRating?.toFixed(1) || "N/A"} {t("pages.leaderboard.average")}
              </span>
              <span>•</span>
              <span>
                {feedbackData.count}{" "}
                {feedbackData.count === 1 ? t("pages.leaderboard.review") : t("pages.leaderboard.reviews")}
              </span>
            </div>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-muted transition-transform ${showFeedback ? "rotate-180" : ""}`}
        />
      </button>

      {showFeedback && (
        <div className="mt-4 space-y-3">
          {feedbackData.feedback.map((fb) => (
            <div key={fb.id} className="p-4 bg-elevated rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-primary">{fb.teamName}</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-sm">
                      {star <= fb.rating ? "⭐" : "☆"}
                    </span>
                  ))}
                </div>
              </div>
              {fb.comment && <p className="text-secondary text-sm">{fb.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
