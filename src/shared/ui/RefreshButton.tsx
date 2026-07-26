import { useState } from 'react';
import { useLocation } from 'react-router-dom';

export function RefreshButton() {
  const location = useLocation();
  const [refreshing, setRefreshing] = useState(false);

  const hasBottomNav = /^\/routes\/[^/]+(?:\/places|\/chat|\/members|\/menu)?$/.test(location.pathname);

  function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => window.location.reload(), 360);
  }

  return (
    <button
      className={`global-refresh-button${hasBottomNav ? ' is-above-nav' : ''}`}
      type="button"
      onClick={handleRefresh}
      aria-label="現在の画面を更新"
      title="更新"
    >
      <svg
        className={`global-refresh-icon${refreshing ? ' is-spinning' : ''}`}
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
      >
        <path
          d="M20 11a8 8 0 1 0-2.34 5.66"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M20 5v6h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
