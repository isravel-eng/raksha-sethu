import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import Layout from './components/Layout.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';

// Citizen Pages
import Consent from './pages/citizen/Consent.jsx';
import Screening from './pages/citizen/Screening.jsx';
import CheckIn from './pages/citizen/CheckIn.jsx';
import Result from './pages/citizen/Result.jsx';
import Timeline from './pages/citizen/Timeline.jsx';
import Profile from './pages/citizen/Profile.jsx';

// Counsellor Pages
import CounsellorDashboard from './pages/counsellor/Dashboard.jsx';
import CaseDetail from './pages/counsellor/CaseDetail.jsx';

// District Pages
import DistrictDashboard from './pages/district/Dashboard.jsx';

function RoleRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'counsellor') return <Navigate to="/counsellor/dashboard" replace />;
  if (user?.role === 'officer') return <Navigate to="/district/dashboard" replace />;
  return <Navigate to="/citizen/check-in" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes inside App Shell (Sidebar) */}
          <Route element={<Layout />}>
            <Route path="/home" element={<RoleRedirect />} />

            {/* Citizen Routes */}
            <Route path="/citizen/consent" element={<Consent />} />
            <Route path="/citizen/screening" element={<Screening />} />
            <Route path="/citizen/check-in" element={<CheckIn />} />
            <Route path="/citizen/result" element={<Result />} />
            <Route path="/citizen/timeline" element={<Timeline />} />
            <Route path="/citizen/profile" element={<Profile />} />

            {/* Counsellor Routes */}
            <Route element={<Layout allowedRoles={['counsellor']} />}>
              <Route path="/counsellor/dashboard" element={<CounsellorDashboard />} />
              <Route path="/counsellor/cases/:id" element={<CaseDetail />} />
            </Route>

            {/* District Routes */}
            <Route element={<Layout allowedRoles={['officer']} />}>
              <Route path="/district/dashboard" element={<DistrictDashboard />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
