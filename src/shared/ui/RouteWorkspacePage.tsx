import type { ReactNode } from 'react';
import { GlobalHeader } from './GlobalHeader';
import { VersionBadge } from './VersionBadge';

type RouteWorkspacePageProps = {
  children: ReactNode;
  footerLabel: string;
  shellClassName?: string;
  backTo?: string;
  backLabel?: string;
};

export function RouteWorkspacePage({
  children,
  footerLabel,
  shellClassName = 'route-tab-shell',
  backTo,
  backLabel,
}: RouteWorkspacePageProps) {
  return (
    <main className={`app-shell route-workspace-page ${shellClassName}`.trim()}>
      <GlobalHeader backTo={backTo} backLabel={backLabel} />
      {children}
      <footer className="app-footer route-workspace-footer">
        <VersionBadge />
        <span>{footerLabel}</span>
      </footer>
    </main>
  );
}
