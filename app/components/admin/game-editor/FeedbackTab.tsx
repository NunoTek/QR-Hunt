import { Button } from "~/components/Button";
import { type Feedback } from "./types";

interface FeedbackStats {
  count: number;
  averageRating: number | null;
}

interface FeedbackTabProps {
  feedbackList: Feedback[];
  feedbackStats: FeedbackStats;
  feedbackLoading: boolean;
  onDeleteFeedback: (id: string, teamName: string) => void;
}

export function FeedbackTab({
  feedbackList,
  feedbackStats,
  feedbackLoading,
  onDeleteFeedback,
}: FeedbackTabProps) {
  return (
    <div className="bg-elevated rounded-xl border overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-primary">Team Feedback</h3>
        <p className="text-secondary text-sm mt-1">
          View feedback submitted by teams during or after the game.
        </p>
        {feedbackStats.averageRating !== null && (
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-lg">
                  {star <= Math.round(feedbackStats.averageRating || 0) ? "⭐" : "☆"}
                </span>
              ))}
            </div>
            <span className="text-primary font-semibold">{feedbackStats.averageRating?.toFixed(1)}</span>
            <span className="text-muted">({feedbackStats.count} {feedbackStats.count === 1 ? "review" : "reviews"})</span>
          </div>
        )}
      </div>

      {feedbackLoading ? (
        <div className="p-8 text-center text-muted">Loading feedback...</div>
      ) : feedbackList.length === 0 ? (
        <div className="p-8 text-center text-muted">
          <div className="text-4xl mb-2">📝</div>
          <p>No feedback yet.</p>
          <p className="text-sm mt-1">Teams can submit feedback during or after the game.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {feedbackList.map((fb) => (
            <div key={fb.id} className="p-4 hover:bg-secondary transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-primary">{fb.teamName}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="text-sm">
                          {star <= fb.rating ? "⭐" : "☆"}
                        </span>
                      ))}
                    </div>
                  </div>
                  {fb.comment && (
                    <p className="text-secondary text-sm">{fb.comment}</p>
                  )}
                  <p className="text-xs text-muted mt-2">
                    {new Date(fb.createdAt).toLocaleDateString()} at {new Date(fb.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => onDeleteFeedback(fb.id, fb.teamName)}
                  title="Delete feedback"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
