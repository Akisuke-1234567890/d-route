import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getOwnRouteMember, type RouteMemberRole } from './members';

type RouteBottomNavProps = { routeId: string };

const ownerTabs = [
  { key: 'route', label: 'Route', icon: '🗺️', path: '' },
  { key: 'places', label: 'Places', icon: '📍', path: '/places' },
  { key: 'chat', label: 'Chat', icon: '💬', path: '/chat' },
  { key: 'members', label: 'Members', icon: '👥', path: '/members', beta: true },
  { key: 'menu', label: 'Menu', icon: '☰', path: '/menu' },
] as const;

const participantTabs = ownerTabs.filter((tab) => tab.key === 'route' || tab.key === 'chat');

export function RouteBottomNav({ routeId }: RouteBottomNavProps) {
  const [role, setRole] = useState<RouteMemberRole | null>(null);

  useEffect(() => {
    let active = true;
    void getOwnRouteMember(routeId)
      .then((member) => { if (active) setRole(member?.role ?? null); })
      .catch(() => { if (active) setRole(null); });
    return () => { active = false; };
  }, [routeId]);

  const tabs = role === 'member' ? participantTabs : ownerTabs;
  const base = `/routes/${routeId}`;

  return (
    <nav className={`route-bottom-nav${role === 'member' ? ' is-participant' : ''}`} aria-label="Route内ナビゲーション">
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={`${base}${tab.path}`}
          end={tab.path === ''}
          className={({ isActive }) => `route-bottom-nav-item${isActive ? ' is-active' : ''}`}
        >
          <span className="route-bottom-nav-icon" aria-hidden="true">{tab.icon}</span>
          <span className="route-bottom-nav-label">{tab.label}{'beta' in tab && tab.beta ? <small className="route-bottom-nav-beta">β</small> : null}</span>
        </NavLink>
      ))}
    </nav>
  );
}
