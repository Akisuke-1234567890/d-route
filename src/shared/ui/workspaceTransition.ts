const ACTIVE_CLASS = 'route-workspace-transition-active';
let navigationTimer: number | null = null;

export function beginWorkspaceTransition(commit: () => void) {
  if (navigationTimer !== null) window.clearTimeout(navigationTimer);
  document.documentElement.classList.add(ACTIVE_CLASS);
  navigationTimer = window.setTimeout(() => {
    navigationTimer = null;
    commit();
  }, 90);
}

export function revealWorkspaceTransition() {
  if (navigationTimer !== null) {
    window.clearTimeout(navigationTimer);
    navigationTimer = null;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove(ACTIVE_CLASS);
    });
  });
}

export function cancelWorkspaceTransition() {
  if (navigationTimer !== null) {
    window.clearTimeout(navigationTimer);
    navigationTimer = null;
  }
  document.documentElement.classList.remove(ACTIVE_CLASS);
}
