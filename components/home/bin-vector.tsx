"use client";

import { useId } from "react";

const widths: Record<string, number> = {
  "2m3": 270,
  "3m3": 300,
  "4.5m3": 340,
  "6m3": 375,
  "9m3": 415,
  "12m3": 450,
};

export function BinVector({ id, size, name }: { id: string; size: string; name: string }) {
  const rawId = useId().replaceAll(":", "");
  const gradientId = `bin-gradient-${rawId}`;
  const shadowId = `bin-shadow-${rawId}`;
  const width = widths[id] ?? 340;
  const x = (520 - width) / 2;
  const right = x + width;

  return (
    <svg
      viewBox="0 0 520 300"
      role="img"
      aria-labelledby={`${rawId}-title ${rawId}-description`}
      className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id={`${rawId}-title`}>{`${size} ${name} skip bin illustration`}</title>
      <desc id={`${rawId}-description`}>Scalable green vector showing the relative size of this skip bin.</desc>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#65A30D" />
          <stop offset="0.55" stopColor="#3F7F18" />
          <stop offset="1" stopColor="#14532D" />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-30%" width="140%" height="180%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#0B3B24" floodOpacity="0.2" />
        </filter>
      </defs>

      <rect width="520" height="300" fill="#EEF5E5" />
      <circle cx="70" cy="62" r="34" fill="#DDECCB" />
      <circle cx="455" cy="52" r="20" fill="#DDECCB" />
      <path d="M36 238 C138 218 385 218 484 240" fill="none" stroke="#C6DAB0" strokeWidth="3" />

      <g filter={`url(#${shadowId})`}>
        <path
          d={`M${x + 18} 105 L${right - 18} 105 L${right} 224 Q${right - 5} 239 ${right - 24} 239 L${x + 24} 239 Q${x + 5} 239 ${x} 224 Z`}
          fill={`url(#${gradientId})`}
          stroke="#0B3B24"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d={`M${x + 10} 105 L${right - 10} 105`} stroke="#0B3B24" strokeWidth="14" strokeLinecap="round" />
        <path d={`M${x + 26} 120 L${right - 26} 120`} stroke="#9BC96D" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
        {[0.22, 0.4, 0.6, 0.78].map((ratio) => {
          const ribX = x + width * ratio;
          return <path key={ratio} d={`M${ribX} 123 L${ribX} 226`} stroke="#0B3B24" strokeWidth="7" opacity="0.55" />;
        })}
        <path d={`M${x + 18} 205 L${right - 18} 205`} stroke="#9BC96D" strokeWidth="3" opacity="0.5" />
        <rect x={x + width / 2 - 55} y="148" width="110" height="48" rx="8" fill="#FAF9F3" stroke="#0B3B24" strokeWidth="3" />
        <text x="260" y="179" textAnchor="middle" fill="#0B3B24" fontSize="24" fontWeight="900" fontFamily="system-ui, sans-serif">
          {size}
        </text>
        <path d={`M${x - 4} 218 H${x + 28} V241 H${x - 13} Z`} fill="#0B3B24" />
        <path d={`M${right + 4} 218 H${right - 28} V241 H${right + 13} Z`} fill="#0B3B24" />
      </g>
    </svg>
  );
}
