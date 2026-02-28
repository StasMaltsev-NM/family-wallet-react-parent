import React from "react";

const STAR_PATH =
  "M60 8 L72 42 L108 42 L78 62 L90 96 L60 76 L30 96 L42 62 L12 42 L48 42 Z";

const AppSplash: React.FC<{ isFading?: boolean }> = ({ isFading }) => {
  return (
    <div
      className={`fixed inset-0 z-[999] flex items-center justify-center bg-black text-white transition-opacity duration-300 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      <style>{`
        @keyframes splashDash {
          0% { stroke-dashoffset: 560; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes splashColor {
          0% { stroke: #A78BFA; }
          25% { stroke: #F3F4F6; }
          50% { stroke: #6EE7B7; }
          75% { stroke: #10B981; }
          100% { stroke: #A78BFA; }
        }
        .splash-star {
          stroke-dasharray: 560;
          stroke-dashoffset: 560;
          animation: splashDash 1.4s linear infinite, splashColor 5.2s linear infinite;
          filter: drop-shadow(0 0 12px var(--primary));
        }
      `}</style>
      <div className="flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="w-32 h-32" aria-label="Загрузка" role="img">
          <path
            d={STAR_PATH}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.25"
          />
          <path
            d={STAR_PATH}
            className="splash-star"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default AppSplash;
