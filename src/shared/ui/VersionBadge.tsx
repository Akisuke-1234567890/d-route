import { VERSION_LABEL } from '../../app/version';
export function VersionBadge() {
  return <span className="version-badge" aria-label={`アプリバージョン ${VERSION_LABEL}`}>{VERSION_LABEL}</span>;
}
