import { useEffect, useState } from "react";

interface RevealAnimationProps {
  children: React.ReactNode;
  isRevealed: boolean;
  duration?: number; // ms, default 800
  effect?: "blur" | "scale" | "slide";
}

export function RevealAnimation({
  children,
  isRevealed,
  duration = 800,
  effect = "blur",
}: RevealAnimationProps) {
  const [showContent, setShowContent] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isRevealed && !showContent) {
      setAnimating(true);
      // Small delay before showing content to ensure animation starts from hidden state
      requestAnimationFrame(() => {
        setShowContent(true);
      });
      // Clear animating flag after animation completes
      const timer = setTimeout(() => setAnimating(false), duration);
      return () => clearTimeout(timer);
    }
  }, [isRevealed, showContent, duration]);

  if (!isRevealed && !showContent) {
    return null;
  }

  const getAnimationClass = () => {
    if (!animating) return "";
    switch (effect) {
      case "blur":
        return "reveal-blur";
      case "scale":
        return "reveal-scale";
      case "slide":
        return "reveal-slide";
      default:
        return "reveal-blur";
    }
  };

  return (
    <div
      className={`reveal-container ${showContent ? "revealed" : ""} ${getAnimationClass()}`}
      style={{ "--reveal-duration": `${duration}ms` } as React.CSSProperties}
    >
      {children}

      <style>{`
        .reveal-container {
          width: 100%;
          height: 100%;
        }

        .reveal-container.reveal-blur {
          animation: reveal-blur-anim var(--reveal-duration) cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .reveal-container.reveal-scale {
          animation: reveal-scale-anim var(--reveal-duration) cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .reveal-container.reveal-slide {
          animation: reveal-slide-anim var(--reveal-duration) cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes reveal-blur-anim {
          0% {
            filter: blur(20px);
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            filter: blur(0);
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes reveal-scale-anim {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.02);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes reveal-slide-anim {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// Confetti burst effect for extra celebration
export function ConfettiBurst({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    color: string;
    delay: number;
  }>>([]);

  useEffect(() => {
    if (active) {
      const colors = ["#6366f1", "#22c55e", "#eab308", "#ef4444", "#3b82f6", "#ec4899"];
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
      }));
      setParticles(newParticles);

      // Clear after animation
      const timer = setTimeout(() => setParticles([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="confetti-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      <style>{`
        .confetti-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9999;
          overflow: hidden;
        }

        .confetti-particle {
          position: absolute;
          top: -10px;
          width: 10px;
          height: 10px;
          border-radius: 2px;
          animation: confetti-fall 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
