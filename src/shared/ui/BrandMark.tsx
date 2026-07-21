export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="pin" x1="12" y1="8" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BDA7FF" />
          <stop offset="1" stopColor="#7A75FF" />
        </linearGradient>
      </defs>
      <path d="M32 4C18.8 4 9 13.5 9 26.1c0 16.8 23 33.9 23 33.9s23-17.1 23-33.9C55 13.5 45.2 4 32 4Z" fill="url(#pin)" />
      <path d="m32 14 3.1 8.9 8.9 3.1-8.9 3.1L32 38l-3.1-8.9L20 26l8.9-3.1L32 14Z" fill="#fff" />
    </svg>
  );
}
