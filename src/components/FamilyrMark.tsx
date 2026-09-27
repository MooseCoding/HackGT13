"use client";

import { useId } from "react";

export function FamilyrMark({ className = "h-5 w-5" }: { className?: string }) {
  const gradId = useId();

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="50" x2="100" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff66c4" />
          <stop offset="1" stopColor="#ffde59" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#${gradId})`} />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fill="#ffffff"
        fontFamily="var(--font-brand), cursive"
        fontSize="56"
      >
        F
      </text>
    </svg>
  );
}
