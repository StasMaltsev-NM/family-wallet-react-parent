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
      <div className="flex items-center justify-center">
        <svg
          viewBox="0 0 120 120"
          className="w-28 h-28"
          aria-label="Загрузка"
          role="img"
        >
          <path
            d={STAR_PATH}
            className="splash-star"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default AppSplash;
