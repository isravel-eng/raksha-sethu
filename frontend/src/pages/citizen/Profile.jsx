import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { casesApi } from '../../services/api.js';
import {
  LoadingCenter, AlertBanner, Icon, Card, PageHeader
} from '../../components/ui.jsx';
import { DEMO_CITIZEN, DEMO_CASE } from '../../services/demoData.js';

export default function Profile() {
  const { user, token } = useAuth();
  const isDemoMode = !token || token === 'demo-token-not-for-real-auth';

  const [caseObj, setCaseObj] = useState(null);
  const [citizen, setCitizen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [token]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      if (isDemoMode) {
        setCaseObj(DEMO_CASE);
        setCitizen(DEMO_CITIZEN);
      } else {
        // Real logic: get cases for current user. Citizen profile is part of it.
        const casesData = await casesApi.list(token);
        const cases = casesData.cases || [];
        if (cases.length > 0) {
          setCaseObj(cases[0]);
          // For a real app we'd fetch the citizen details too, or get it from auth context
          setCitizen({ name: user?.email, phone: 'XXX-XXX-XXXX', district: 'Unknown', consent_given: true });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingCenter message="Loading profile…" />;

  return (
    <div className="page-content" style={{ maxWidth: 800 }}>
      {error && <AlertBanner type="error" onClose={() => setError('')}>{error}</AlertBanner>}

      <PageHeader
        title="My Profile"
        subtitle="Manage your personal details and active case information."
      />

      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'var(--brand-100)', color: 'var(--brand-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 600 }}>
            {citizen?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{citizen?.name || user?.email || 'User'}</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>Registered Citizen</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <InfoRow label="Email" value={user?.email || '—'} />
          <InfoRow label="Phone" value={citizen?.phone || '—'} />
          <InfoRow label="District" value={citizen?.district || '—'} />
          <InfoRow label="Consent Provided" value={citizen?.consent_given ? 'Yes' : 'No'} />
        </div>
      </Card>

      {caseObj && (
        <Card>
          <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="folder_open" size="icon-sm" style={{ color: 'var(--brand-600)' }} /> Active Case
          </h4>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoRow label="Case Number" value={caseObj.case_number} />
            <InfoRow label="District" value={caseObj.district} />
            <InfoRow label="State" value={caseObj.state} />
            <InfoRow label="Current Stage" value={caseObj.case_stage} />
            <InfoRow label="Status" value={caseObj.status} />
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0', borderBottom: '1px solid var(--gray-100)' }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
