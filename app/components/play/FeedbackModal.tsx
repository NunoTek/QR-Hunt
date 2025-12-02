import { useTranslation } from "~/i18n/I18nContext";
import { Button } from "../Button";
import { Modal } from "../Modal";

interface FeedbackModalProps {
  feedbackRating: number;
  setFeedbackRating: (v: number) => void;
  feedbackComment: string;
  setFeedbackComment: (v: string) => void;
  isSubmittingFeedback: boolean;
  feedbackSubmitted: boolean;
  submitFeedback: () => void;
  setShowFeedback: (v: boolean) => void;
}

export function FeedbackModal({
  feedbackRating,
  setFeedbackRating,
  feedbackComment,
  setFeedbackComment,
  isSubmittingFeedback,
  feedbackSubmitted,
  submitFeedback,
  setShowFeedback,
}: FeedbackModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={true}
      onClose={() => setShowFeedback(false)}
      title={t("pages.play.feedback.title")}
      maxWidth="max-w-md"
      zIndex="z-[100]"
      footer={
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFeedback(false)}
            className="flex-1"
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={submitFeedback}
            disabled={isSubmittingFeedback || feedbackRating === 0}
            isLoading={isSubmittingFeedback}
            className="flex-1"
          >
            {isSubmittingFeedback
              ? t("pages.play.feedback.submitting")
              : feedbackSubmitted
                ? t("pages.play.feedback.updateBtn")
                : t("pages.play.feedback.submitBtn")}
          </Button>
        </div>
      }
    >
      {/* Star Rating */}
      <div className="flex justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFeedbackRating(star)}
            className="text-4xl transition-transform hover:scale-110"
          >
            {star <= feedbackRating ? "⭐" : "☆"}
          </button>
        ))}
      </div>

      {/* Comment Textarea */}
      <textarea
        value={feedbackComment}
        onChange={(e) => setFeedbackComment(e.target.value)}
        placeholder={t("pages.play.feedback.placeholder")}
        className="w-full p-3 border rounded-lg bg-secondary text-primary resize-none h-24"
        maxLength={1000}
      />
    </Modal>
  );
}
