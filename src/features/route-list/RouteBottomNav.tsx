import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
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
  const navRef = useRef<HTMLElement>(null);
  const [visualTop, setVisualTop] = useState<number | null>(null);
  const [role, setRole] = useState<RouteMemberRole | null>(null);
  const [roleResolved, setRoleResolved] = useState(false);

  useEffect(() => {
    let active = true;
    setRoleResolved(false);
    void getOwnRouteMember(routeId)
      .then((member) => {
        if (!active) return;
        setRole(member?.role ?? null);
        setRoleResolved(true);
      })
      .catch(() => {
        if (!active) return;
        setRole(null);
        setRoleResolved(true);
      });
    return () => { active = false; };
  }, [routeId]);

  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      setVisualTop(null);
      return;
    }

    let frame = 0;
    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const height = navRef.current?.getBoundingClientRect().height ?? 0;
        setVisualTop(Math.max(0, viewport.offsetTop + viewport.height - height));
      });
    };

    sync();
    viewport.addEventListener('resize', sync);
    viewport.addEventListener('scroll', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      window.cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', sync);
      viewport.removeEventListener('scroll', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);

  const tabs = !roleResolved || role === 'member' ? participantTabs : ownerTabs;
  const base = `/routes/${routeId}`;

  return (
    <nav ref={navRef} className={`route-bottom-nav${!roleResolved || role === 'member' ? ' is-participant' : ''}`} style={visualTop === null ? undefined : { top: `${visualTop}px`, bottom: 'auto' }} aria-label="Route内ナビゲーション" aria-busy={!roleResolved}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={`${base}${tab.path}`}
          end={tab.path === ''}
          className={({ isActive }) => `route-bottom-nav-item${isActive ? ' is-active' : ''}`}
        >
          <span className="route-bottom-nav-icon" aria-hidden="true">{tab.icon}</span>
          <span className="route-bottom-nav-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
