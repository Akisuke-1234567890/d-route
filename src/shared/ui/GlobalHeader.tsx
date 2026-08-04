import { Link } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import { RefreshButton } from './RefreshButton';

type GlobalHeaderProps = {
  backTo?: string;
  backLabel?: string;
  showRefresh?: boolean;
};

export function GlobalHeader({
  backTo = '/routes',
  backLabel = '一覧へ戻る',
  showRefresh = true,
}: GlobalHeaderProps) {
  return (
    <header className="global-header">
      <div className="header-brand">
        <BrandMark size={34} />
        <strong>D Route</strong>
      </div>
      <div className="header-actions">
        <Link className="icon-button header-link" to={backTo}>{backLabel}</Link>
        {showRefresh ? <RefreshButton placement="header" /> : null}
      </div>
    </header>
  );
}
