import { BrandMark } from '../../shared/ui/BrandMark';
import { VersionBadge } from '../../shared/ui/VersionBadge';

export function SplashScreen() {
  return (
    <main className="splash-screen" aria-busy="true" aria-label="セッションを確認しています">
      <div className="star-field" aria-hidden="true" />
      <div className="splash-content">
        <BrandMark size={76} />
        <div className="brand-wordmark">D Route</div>
        <div className="loading-dots" aria-hidden="true"><i /><i /><i /></div>
        <VersionBadge />
      </div>
    </main>
  );
}
