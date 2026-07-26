import { useId } from 'react';

export function BrandMark({ size = 56 }: { size?: number }) {
  const gradientId = useId().replace(/:/g, '');
  const routeGradientId = `d-route-${gradientId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={routeGradientId} x1="14" y1="10" x2="50" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#38E0C6" />
          <stop offset="0.45" stopColor="#38BDF8" />
          <stop offset="0.72" stopColor="#5B8CFF" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>

      <path
        d="M18 12H34C45.05 12 54 20.95 54 32C54 43.05 45.05 52 34 52H18"
        fill="none"
        stroke={`url(#${routeGradientId})`}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 12V52"
        fill="none"
        stroke={`url(#${routeGradientId})`}
        strokeWidth="6"
        strokeLinecap="round"
      />

      <circle cx="18" cy="12" r="6.3" fill="#38E0C6" />
      <circle cx="18" cy="12" r="3" fill="#F8FAFF" />

      <circle cx="18" cy="32" r="6.3" fill="#F8B63F" />
      <circle cx="18" cy="32" r="3" fill="#F8FAFF" />

      <circle cx="18" cy="52" r="6.3" fill="#7C3AED" />
      <circle cx="18" cy="52" r="3" fill="#F8FAFF" />

      <circle cx="54" cy="32" r="6.3" fill="#38BDF8" />
      <circle cx="54" cy="32" r="3" fill="#F8FAFF" />
    </svg>
  );
}
