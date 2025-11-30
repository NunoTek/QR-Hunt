import { useState } from "react";
import { Spinner } from "~/components/Loading";
import { YouTubeEmbed, isYouTubeUrl } from "~/components/YouTubeEmbed";

interface ClueNode {
  id: string;
  title: string;
  content: string | null;
  contentType: string;
  mediaUrl: string | null;
  isEnd?: boolean;
}

interface ClueDisplayProps {
  node: ClueNode;
  hideTitle?: boolean;
  headerText?: string;
}

export function ClueDisplay({ node, hideTitle = false, headerText = "Next Clue" }: ClueDisplayProps) {
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);

  const renderMedia = () => {
    if (!node.mediaUrl) return null;

    const isYouTube = isYouTubeUrl(node.mediaUrl);

    switch (node.contentType) {
      case "image":
        return (
          <div className="mb-4 rounded-lg overflow-hidden">
            {mediaLoading && (
              <div className="flex items-center justify-center h-[200px] bg-tertiary rounded-lg">
                <Spinner size="md" />
              </div>
            )}
            <img
              src={node.mediaUrl}
              alt={node.title}
              onLoad={() => setMediaLoading(false)}
              onError={() => {
                setMediaLoading(false);
                setMediaError(true);
              }}
              className="w-full max-h-[300px] object-cover rounded-lg"
              style={{ display: mediaLoading ? "none" : "block" }}
            />
            {mediaError && (
              <div className="flex flex-col items-center justify-center gap-2 h-[150px] bg-tertiary rounded-lg text-muted">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Image failed to load</span>
              </div>
            )}
          </div>
        );

      case "video":
        // Check if it's a YouTube video
        if (isYouTube) {
          return (
            <div className="mb-4">
              <YouTubeEmbed url={node.mediaUrl} title={node.title} />
            </div>
          );
        }
        // Regular video file
        return (
          <div className="mb-4">
            <video
              src={node.mediaUrl}
              controls
              className="w-full max-h-[300px] rounded-lg bg-black"
            />
          </div>
        );

      case "audio":
        // Check if it's a YouTube link (audio only mode)
        if (isYouTube) {
          return (
            <div className="mb-4">
              <YouTubeEmbed url={node.mediaUrl} title={node.title} audioOnly />
            </div>
          );
        }
        // Regular audio file
        return (
          <div className="mb-4">
            <div className="flex items-center gap-4 p-4 bg-tertiary rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-primary)] text-white flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <audio src={node.mediaUrl} controls className="w-full" />
            </div>
          </div>
        );

      case "link":
        // Check if it's a YouTube link - show as video
        if (isYouTube) {
          return (
            <div className="mb-4">
              <YouTubeEmbed url={node.mediaUrl} title={node.title} />
            </div>
          );
        }
        // Regular external link
        return (
          <div className="mb-4">
            <a
              href={node.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 text-base font-medium text-[var(--color-primary)] bg-secondary rounded-lg hover:bg-tertiary transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open Link
            </a>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`p-5 sm:p-6 bg-elevated rounded-lg border shadow-sm animate-slide-up ${hideTitle ? 'p-0 bg-transparent border-0 shadow-none' : 'border-l-4 border-l-[var(--color-primary)]'}`}>
      {!hideTitle && (
        <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-5">
          <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-6 sm:h-6">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="flex-1 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-primary m-0">{node.title}</h2>
              <p className="text-sm text-secondary mt-1">
                {headerText}
              </p>
            </div>
            {node.isEnd && (
              <span className="inline-flex items-center px-3 py-1 text-xs font-semibold text-white bg-[var(--color-success)] rounded-full">Final Clue</span>
            )}
          </div>
        </div>
      )}

      {renderMedia()}

      {node.content && (
        <div className="whitespace-pre-wrap leading-relaxed text-secondary text-sm sm:text-base p-3 sm:p-4 bg-tertiary rounded-lg border border-border">
          {node.content}
        </div>
      )}
    </div>
  );
}
