import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "~/i18n/I18nContext";
import { ChevronLeft, ChevronRight } from "../icons";

const SCREENSHOTS = [
  { src: "/screenshots/mobile-dark-play-scan.jpg", key: "scan" },
  { src: "/screenshots/mobile-dark-play-clue.jpg", key: "clue" },
  { src: "/screenshots/mobile-dark-play-progress.jpg", key: "progress" },
  { src: "/screenshots/mobile-dark-leaderboard.jpg", key: "leaderboard" },
  { src: "/screenshots/mobile-dark-play-chat.jpg", key: "chat" },
  { src: "/screenshots/mobile-dark-resume-game.jpg", key: "resume" },
];

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: "180px" }}>
      {/* Phone outer frame */}
      <div className="relative bg-gray-900 rounded-[2rem] p-1.5 shadow-2xl">
        {/* Phone inner bezel */}
        <div className="relative bg-black rounded-[1.6rem] overflow-hidden">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-b-xl z-10" />

          {/* Screen content */}
          <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1.4rem]">
            {children}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-gray-600 rounded-full" />
        </div>
      </div>

      {/* Side buttons */}
      <div className="absolute right-[-2px] top-16 w-0.5 h-8 bg-gray-700 rounded-l" />
      <div className="absolute left-[-2px] top-14 w-0.5 h-5 bg-gray-700 rounded-r" />
      <div className="absolute left-[-2px] top-22 w-0.5 h-10 bg-gray-700 rounded-r" />
    </div>
  );
}

export function ScreenshotsSection() {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const goToSlide = useCallback((index: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 300);
  }, [isAnimating]);

  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex === 0 ? SCREENSHOTS.length - 1 : currentIndex - 1;
    goToSlide(newIndex);
  }, [currentIndex, goToSlide]);

  const goToNext = useCallback(() => {
    const newIndex = currentIndex === SCREENSHOTS.length - 1 ? 0 : currentIndex + 1;
    goToSlide(newIndex);
  }, [currentIndex, goToSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNext();
      else goToPrevious();
    }
    setTouchStart(null);
  };

  const currentScreenshot = SCREENSHOTS[currentIndex];

  return (
    <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-secondary overflow-hidden">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-primary mb-2 sm:mb-3">
            {t("pages.home.screenshots.title")}
          </h2>
          <p className="text-secondary text-sm sm:text-base mx-auto">
            {t("pages.home.screenshots.subtitle")}
          </p>
        </div>

        {/* Carousel */}
        <div
          className="relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Navigation arrows - Desktop */}
          <button
            onClick={goToPrevious}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 lg:-translate-x-8 z-10 w-9 h-9 items-center justify-center rounded-full bg-elevated border border-border shadow-lg hover:bg-tertiary hover:border-[var(--color-primary)] transition-all group"
            aria-label="Previous screenshot"
          >
            <ChevronLeft size={18} className="text-secondary group-hover:text-[var(--color-primary)]" />
          </button>

          <button
            onClick={goToNext}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 lg:translate-x-8 z-10 w-9 h-9 items-center justify-center rounded-full bg-elevated border border-border shadow-lg hover:bg-tertiary hover:border-[var(--color-primary)] transition-all group"
            aria-label="Next screenshot"
          >
            <ChevronRight size={18} className="text-secondary group-hover:text-[var(--color-primary)]" />
          </button>

          {/* Phone with screenshot */}
          <div className="flex flex-col items-center">
            <PhoneFrame>
              <div className="relative w-full h-full">
                {SCREENSHOTS.map((screenshot, index) => (
                  <img
                    key={screenshot.key}
                    src={screenshot.src}
                    alt={t(`pages.home.screenshots.items.${screenshot.key}.title`)}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                      index === currentIndex
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-95"
                    }`}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                ))}
              </div>
            </PhoneFrame>

            {/* Screenshot info */}
            <div className="mt-4 text-center min-h-[60px]">
              <h3 className="text-base sm:text-lg font-bold text-primary mb-1 transition-all">
                {t(`pages.home.screenshots.items.${currentScreenshot.key}.title`)}
              </h3>
              <p className="text-secondary text-xs sm:text-sm max-w-sm mx-auto">
                {t(`pages.home.screenshots.items.${currentScreenshot.key}.description`)}
              </p>
            </div>
          </div>

          {/* Mobile navigation arrows */}
          <div className="flex sm:hidden justify-center gap-3 mt-3">
            <button
              onClick={goToPrevious}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-elevated border border-border shadow active:bg-tertiary transition-all"
              aria-label="Previous screenshot"
            >
              <ChevronLeft size={16} className="text-secondary" />
            </button>
            <button
              onClick={goToNext}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-elevated border border-border shadow active:bg-tertiary transition-all"
              aria-label="Next screenshot"
            >
              <ChevronRight size={16} className="text-secondary" />
            </button>
          </div>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-1.5 mt-4">
          {SCREENSHOTS.map((screenshot, index) => (
            <button
              key={screenshot.key}
              onClick={() => goToSlide(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-6 bg-[var(--color-primary)]"
                  : "w-1.5 bg-border hover:bg-tertiary"
              }`}
              aria-label={`Go to ${t(`pages.home.screenshots.items.${screenshot.key}.title`)}`}
            />
          ))}
        </div>

        {/* Thumbnail strip */}
        <div className="mt-5 flex justify-center gap-1.5 overflow-x-auto pb-2 px-4 -mx-4 scrollbar-hide">
          {SCREENSHOTS.map((screenshot, index) => (
            <button
              key={screenshot.key}
              onClick={() => goToSlide(index)}
              className={`flex-shrink-0 w-9 h-[72px] sm:w-10 sm:h-20 rounded-md overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? "border-[var(--color-primary)] scale-105 shadow-md"
                  : "border-border opacity-50 hover:opacity-100 hover:border-tertiary"
              }`}
            >
              <img
                src={screenshot.src}
                alt={t(`pages.home.screenshots.items.${screenshot.key}.title`)}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>

        {/* Feature highlights */}
        <div className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
          {["darkMode", "mobile", "realtime"].map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-elevated rounded-full border border-border text-xs text-secondary"
            >
              <span className="text-[var(--color-primary)]">✓</span>
              {t(`pages.home.screenshots.features.${feature}`)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
