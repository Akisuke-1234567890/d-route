import { useState } from 'react';

export function RefreshButton({ className = '' }: { className?: string }) {
  const [refreshing, setRefreshing] = useState(false);
  const classes = ['app-refresh-button', 'app-refresh-float', refreshing ? 'is-refreshing' : '', className]
    .filter(Boolean)
    .join(' ');

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => window.location.reload(), 420);
  };

  return (
    <button
      className={classes}
      type="button"
      onClick={refresh}
      aria-label="現在の画面を更新"
      title="更新"
      disabled={refreshing}
    >
      <svg className="app-refresh-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 6v5h-5" />
        <path d="M4 18v-5h5" />
        <path d="M6.1 8.2A7 7 0 0 1 18.7 7L20 11" />
        <path d="M17.9 15.8A7 7 0 0 1 5.3 17L4 13" />
      </svg>
    </button>
  );
}
