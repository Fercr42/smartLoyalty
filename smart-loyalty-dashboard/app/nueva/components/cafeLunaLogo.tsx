import { useId } from "react";

// Logo inventado de "Café Luna" (negocio de ejemplo): luna creciente ámbar con un grano de café.
export default function CafeLunaLogo({ size = 36 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <mask id={id}>
          <rect width="40" height="40" fill="#fff" />
          <circle cx="27" cy="14" r="13" fill="#000" />
        </mask>
      </defs>
      <circle cx="20" cy="20" r="16" fill="#f2b134" mask={`url(#${id})`} />
      <g transform="rotate(-32 23 23)">
        <ellipse cx="23" cy="23" rx="5" ry="7" fill="#f6ead8" />
        <path d="M23 16.5 C 20.8 20.5, 25.2 25.5, 23 29.5" stroke="#5b3a24" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
