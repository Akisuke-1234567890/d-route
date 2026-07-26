import { useState } from 'react';
import { useLocation } from 'react-router-dom';

type RefreshButtonProps = {
  placement?: 'auto' | 'header' | 'footer';
};

export function RefreshButton({ placement = 'auto' }: RefreshButtonProps) {
  const location = useLocation();
  const [refreshing, setRefreshing] = useState(false);

  const isRouteList = location.pathname === '/routes';
  const isRouteWorkspace = /^\/routes\/[^/]+(?:\/places|\/chat|\/members|\/menu)?$/.test(location.pathname);

  if (placement === 'auto' && (isRouteList || isRouteWorkspace)) return null;

  function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => window.location.reload(), 360);
  }

  const className = placement === 'header'
    ? 'header-refresh-button'
    : placement === 'footer'
      ? 'home-footer-action home-footer-refresh'
      : 'global-refresh-button';

  return (
    <button
      className={className}
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
      {placement === 'footer' ? <span>更新</span> : null}
    </button>
  );
}
