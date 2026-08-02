import { APP_VERSION } from '../../app/version';
export function VersionBadge() {
  return <span className="version-badge" aria-label={`アプリバージョン ${APP_VERSION}`}>{APP_VERSION}</span>;
}
