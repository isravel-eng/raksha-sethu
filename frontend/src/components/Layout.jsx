import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from './Sidebar.jsx';

export default function Layout({ allowedRoles }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="loading-center">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛔</div>
        <h3>Access Denied</h3>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <header className="topbar">
          <div className="topbar__left">
            {/* Can put a breadcrumb or page title here if needed */}
          </div>
          <div className="topbar__right">
            <div className="sidebar-avatar" style={{ width: '2rem', height: '2rem', fontSize: '0.8rem' }}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
