import { useState } from "react";
import { Spinner } from "~/components/Loading";

interface YouTubeEmbedProps {
  url: string;
  title?: string;
  audioOnly?: boolean;
}

/**
 * Extract YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://music.youtube.com/watch?v=VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace("www.", "");

    // Handle youtu.be short links
    if (hostname === "youtu.be") {
      return urlObj.pathname.slice(1).split("?")[0] || null;
    }

    // Handle youtube.com and music.youtube.com
    if (hostname === "youtube.com" || hostname === "music.youtube.com") {
      // Check for /watch?v= format
      const vParam = urlObj.searchParams.get("v");
      if (vParam) return vParam;

      // Check for /embed/, /v/, or /shorts/ format
      const pathMatch = urlObj.pathname.match(/^\/(embed|v|shorts)\/([^/?]+)/);
      if (pathMatch) return pathMatch[2];
    }

    return null;
  } catch {
    // Try regex fallback for malformed URLs
    const regexPatterns = [
      /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of regexPatterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace("www.", "");
    return hostname === "youtube.com" || hostname === "youtu.be" || hostname === "music.youtube.com";
  } catch {
    return /(?:youtube\.com|youtu\.be|music\.youtube\.com)/.test(url);
  }
}

export function YouTubeEmbed({ url, title = "Video", audioOnly = false }: YouTubeEmbedProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-[150px] bg-tertiary rounded-lg text-muted">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>Invalid YouTube URL</span>
      </div>
    );
  }

  // For audio-only mode, we hide the video visually but still load it
  // YouTube doesn't have an official audio-only embed, so we minimize the player
  if (audioOnly) {
    return (
      <div className="flex items-center gap-4 p-4 bg-tertiary rounded-lg">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#FF0000] text-white flex-shrink-0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary truncate mb-2">{title}</p>
          <div className="relative w-full" style={{ height: "54px" }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary rounded">
                <Spinner size="sm" />
              </div>
            )}
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded"
              style={{ opacity: loading ? 0 : 1 }}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
          </div>
          <p className="text-xs text-muted mt-1">YouTube Audio</p>
        </div>
      </div>
    );
  }

  // Full video embed
  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-tertiary">
          <Spinner size="md" />
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-tertiary text-muted">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Failed to load video</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            Open on YouTube
          </a>
        </div>
      ) : (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          style={{ opacity: loading ? 0 : 1 }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
    </div>
  );
}
