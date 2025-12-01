import { useCallback, useEffect, useState } from "react";
import { playCountdownGo, playCountdownTick } from "~/lib/sounds";

interface GameCountdownProps {
  duration?: number; // default 3
  onComplete: () => void;
}

export function GameCountdown({ duration = 3, onComplete }: GameCountdownProps) {
  const [count, setCount] = useState(duration);
  const [phase, setPhase] = useState<"counting" | "go" | "done">("counting");

  const handleComplete = useCallback(() => {
    setPhase("done");
    setTimeout(onComplete, 300); // Small delay for final animation
  }, [onComplete]);

  useEffect(() => {
    if (phase !== "counting") return;

    // Play tick sound for current number
    if (count > 0) {
      playCountdownTick(count as 3 | 2 | 1);
    }

    const timer = setTimeout(() => {
      if (count > 1) {
        setCount((c) => c - 1);
      } else {
        // Show "GO!" phase
        setPhase("go");
        playCountdownGo();
        // Complete after GO animation
        setTimeout(handleComplete, 1000);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, phase, handleComplete]);

  if (phase === "done") return null;

  const getNumberColor = (n: number) => {
    if (n === 3) return "#eab308"; // yellow
    if (n === 2) return "#f97316"; // orange
    if (n === 1) return "#ef4444"; // red
    return "#22c55e"; // green for GO
  };

  return (
    <div className="countdown-overlay">
      <div className="countdown-bg" />

      <div className="countdown-content">
        {phase === "counting" ? (
          <div
            key={count}
            className="countdown-number animate-countdown"
            style={{ color: getNumberColor(count) }}
          >
            {count}
          </div>
        ) : (
          <div
            className="countdown-go animate-countdown-go"
            style={{ color: getNumberColor(0) }}
          >
            GO!
          </div>
        )}
      </div>

      {/* Radial progress ring */}
      <svg className="countdown-ring" viewBox="0 0 100 100">
        <circle
          className="countdown-ring-bg"
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.1"
        />
        <circle
          className="countdown-ring-progress"
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={getNumberColor(count)}
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            strokeDasharray: `${2 * Math.PI * 45}`,
            strokeDashoffset: phase === "counting"
              ? `${2 * Math.PI * 45 * ((duration - count) / duration)}`
              : 0,
          }}
        />
      </svg>

      <style>{`
        .countdown-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .countdown-bg {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
        }

        .countdown-content {
          position: relative;
          z-index: 1;
        }

        .countdown-number {
          font-size: clamp(8rem, 30vw, 16rem);
          font-weight: 900;
          line-height: 1;
          text-shadow: 0 0 60px currentColor;
        }

        .countdown-go {
          font-size: clamp(5rem, 20vw, 10rem);
          font-weight: 900;
          line-height: 1;
          text-shadow: 0 0 80px currentColor;
          letter-spacing: 0.1em;
        }

        @keyframes countdown-pop {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes countdown-exit {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes countdown-go-pop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          40% {
            transform: scale(1.3);
          }
          60% {
            transform: scale(0.9);
          }
          80% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-countdown {
          animation: countdown-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-countdown-go {
          animation: countdown-go-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .countdown-ring {
          position: absolute;
          width: clamp(250px, 60vw, 400px);
          height: clamp(250px, 60vw, 400px);
          transform: rotate(-90deg);
        }

        .countdown-ring-progress {
          transition: stroke-dashoffset 1s linear, stroke 0.3s;
        }

        /* Particles effect */
        .countdown-overlay::before,
        .countdown-overlay::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(circle, currentColor 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.05;
          animation: particles-drift 20s linear infinite;
        }

        .countdown-overlay::after {
          animation-delay: -10s;
          animation-direction: reverse;
        }

        @keyframes particles-drift {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
      `}</style>
    </div>
  );
}
