import { useEffect } from 'react';

export const WORKSPACE_PAGE_READY_EVENT = 'droute:workspace-page-ready';

export function useWorkspacePageReady(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent(WORKSPACE_PAGE_READY_EVENT, {
          detail: { pathname: window.location.pathname },
        }));
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [ready]);
}
