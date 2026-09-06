import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Icon } from './ui.jsx';

const navItems = {
  citizen: [
    { label: 'My Dashboard', icon: 'dashboard',     to: '/citizen/timeline' },
    { label: 'Check-In',     icon: 'edit_note',      to: '/citizen/check-in' },
    { label: 'My Results',   icon: 'assessment',     to: '/citizen/result' },
    { label: 'Timeline',     icon: 'timeline',       to: '/citizen/timeline' },
  ],
  counsellor: [
    { label: 'Dashboard',    icon: 'dashboard',      to: '/counsellor/dashboard' },
    { label: 'Cases',        icon: 'folder_open',    to: '/counsellor/dashboard' },
    { label: 'Alerts',       icon: 'notifications',  to: '/counsellor/dashboard' },
  ],
  district_officer: [
    { label: 'Dashboard',    icon: 'bar_chart',      to: '/district/dashboard' },
  ],
  state_officer: [
    { label: 'Dashboard',    icon: 'analytics',      to: '/district/dashboard' },
  ],
  national_admin: [
    { label: 'Dashboard',    icon: 'admin_panel_settings', to: '/district/dashboard' },
  ],
};

function getInitials(email) {
  if (!email) return '?';
  return email.split('@')[0].slice(0, 2).toUpperCase();
}

function roleLabel(role) {
  const map = {
    citizen: 'Citizen',
    counsellor: 'Counsellor',
    district_officer: 'District Officer',
    state_officer: 'State Officer',
    national_admin: 'National Admin',
  };
  return map[role] || role;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = (user && navItems[user.role]) || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo__name">🛡 RakshaSetu</div>
        <div className="sidebar-logo__tagline">Distress Management</div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <div className="sidebar-nav__label">Navigation</div>
        {items.map((item) => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            className={({ isActive }) => `sidebar-nav__item${isActive ? ' active' : ''}`}
          >
            <Icon name={item.icon} size="icon-sm" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout} title="Click to log out" role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleLogout()}>
          <div className="sidebar-avatar">{getInitials(user?.email)}</div>
          <div className="sidebar-user__info">
            <div className="sidebar-user__name truncate">{user?.email}</div>
            <div className="sidebar-user__role">{roleLabel(user?.role)} · Logout</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
