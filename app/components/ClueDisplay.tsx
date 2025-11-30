import { useState, useRef, useCallback, useEffect } from "react";
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
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPositionRef = useRef({ x: 0, y: 0 });

  // Reset zoom when modal opens/closes
  useEffect(() => {
    if (!showImageModal) {
      setImageZoom(1);
      setImagePosition({ x: 0, y: 0 });
    }
  }, [showImageModal]);

  // Handle zoom with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setImageZoom(prev => Math.min(Math.max(prev + delta, 0.5), 5));
  }, []);

  // Handle touch pinch zoom
  const lastTouchDistRef = useRef<number | null>(null);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

      if (lastTouchDistRef.current !== null) {
        const delta = (dist - lastTouchDistRef.current) * 0.01;
        setImageZoom(prev => Math.min(Math.max(prev + delta, 0.5), 5));
      }
      lastTouchDistRef.current = dist;
    } else if (e.touches.length === 1 && isDragging && imageZoom > 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.x;
      const deltaY = touch.clientY - dragStartRef.current.y;
      setImagePosition({
        x: lastPositionRef.current.x + deltaX,
        y: lastPositionRef.current.y + deltaY,
      });
    }
  }, [isDragging, imageZoom]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistRef.current = null;
    setIsDragging(false);
    lastPositionRef.current = imagePosition;
  }, [imagePosition]);

  // Handle mouse drag for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (imageZoom > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      lastPositionRef.current = imagePosition;
    }
  }, [imageZoom, imagePosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      setImagePosition({
        x: lastPositionRef.current.x + deltaX,
        y: lastPositionRef.current.y + deltaY,
      });
    }
  }, [isDragging, imageZoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    lastPositionRef.current = imagePosition;
  }, [imagePosition]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && imageZoom > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPositionRef.current = imagePosition;
    }
  }, [imageZoom, imagePosition]);

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
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] rounded-lg"
            >
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
            </button>
            {!mediaLoading && !mediaError && (
              <p className="text-xs text-muted text-center mt-1">Tap image to enlarge</p>
            )}
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

      {/* Image Zoom Modal */}
      {showImageModal && node.mediaUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setShowImageModal(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/50 rounded-full px-4 py-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImageZoom(prev => Math.max(prev - 0.5, 0.5));
              }}
              className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
              aria-label="Zoom out"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <span className="text-white text-sm min-w-[3rem] text-center">{Math.round(imageZoom * 100)}%</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImageZoom(prev => Math.min(prev + 0.5, 5));
              }}
              className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
              aria-label="Zoom in"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImageZoom(1);
                setImagePosition({ x: 0, y: 0 });
              }}
              className="p-2 rounded-full hover:bg-white/20 text-white transition-colors ml-2"
              aria-label="Reset zoom"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>

          {/* Image container */}
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          >
            <img
              src={node.mediaUrl}
              alt={node.title}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${imageZoom}) translate(${imagePosition.x / imageZoom}px, ${imagePosition.y / imageZoom}px)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
