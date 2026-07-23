import { NavLink } from 'react-router-dom';

type RouteBottomNavProps = { routeId: string };

const tabs = [
  { key: 'route', label: 'Route', icon: '🗺️', path: '' },
  { key: 'places', label: 'Places', icon: '📍', path: '/places' },
  { key: 'chat', label: 'Chat', icon: '💬', path: '/chat' },
  { key: 'members', label: 'Members', icon: '👥', path: '/members' },
  { key: 'menu', label: 'Menu', icon: '☰', path: '/menu' },
] as const;

export function RouteBottomNav({ routeId }: RouteBottomNavProps) {
  const base = `/routes/${routeId}`;
  return (
    <nav className="route-bottom-nav" aria-label="Route内ナビゲーション">
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={`${base}${tab.path}`}
          end={tab.path === ''}
          className={({ isActive }) => `route-bottom-nav-item${isActive ? ' is-active' : ''}`}
        >
          <span className="route-bottom-nav-icon" aria-hidden="true">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
