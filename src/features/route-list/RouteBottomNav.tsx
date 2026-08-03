import { useEffect, useState, type MouseEvent } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getOwnRouteMember, type RouteMemberRole } from './members';

type RouteBottomNavProps = { routeId: string };

const ownerTabs = [
  { key: 'route', label: 'Route', icon: '🗺️', path: '' },
  { key: 'places', label: 'Places', icon: '📍', path: '/places' },
  { key: 'chat', label: 'Chat', icon: '💬', path: '/chat' },
  { key: 'members', label: 'Members', icon: '👥', path: '/members' },
  { key: 'menu', label: 'Menu', icon: '☰', path: '/menu' },
] as const;

const participantTabs = ownerTabs.filter((tab) => tab.key === 'route' || tab.key === 'chat');

export function RouteBottomNav({ routeId }: RouteBottomNavProps) {
  const [role, setRole] = useState<RouteMemberRole | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    void getOwnRouteMember(routeId)
      .then((member) => { if (active) setRole(member?.role ?? null); })
      .catch(() => { if (active) setRole(null); });
    return () => { active = false; };
  }, [routeId]);


  const handleTabClick = (event: MouseEvent<HTMLAnchorElement>, target: string) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (location.pathname === target) return;
    event.preventDefault();
    navigate(target);
  };

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
          onClick={(event) => handleTabClick(event, `${base}${tab.path}`)}
        >
          <span className="route-bottom-nav-icon" aria-hidden="true">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
