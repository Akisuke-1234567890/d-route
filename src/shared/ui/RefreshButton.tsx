export function RefreshButton({ className = '' }: { className?: string }) {
  const classes = ['app-refresh-button', className].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      type="button"
      onClick={() => window.location.reload()}
      aria-label="現在の画面を更新"
    >
      <span aria-hidden="true">↻</span>
      <span>更新</span>
    </button>
  );
}
