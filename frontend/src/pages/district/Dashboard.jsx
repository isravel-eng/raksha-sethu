import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { casesApi, alertsApi } from '../../services/api.js';
import {
  LoadingCenter, AlertBanner, StatCard, Icon, Card, PageHeader
} from '../../components/ui.jsx';
import { DEMO_CASES_LIST, DEMO_ALERTS_LIST } from '../../services/demoData.js';

export default function DistrictDashboard() {
  const { token } = useAuth();
  const isDemoMode = !token || token === 'demo-token-not-for-real-auth';

  const [cases, setCases] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [token]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      if (isDemoMode) {
        setCases(DEMO_CASES_LIST);
        setAlerts(DEMO_ALERTS_LIST);
      } else {
        const [casesData, alertsData] = await Promise.all([
          casesApi.list(token),
          alertsApi.list(token),
        ]);
        // For a real app, district officer would see all cases in their district.
        // Assuming the backend handles filtering by the officer's district based on JWT.
        setCases(casesData.cases || []);
        setAlerts(alertsData.alerts || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load district dashboard.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingCenter message="Loading district data…" />;

  const totalCases = cases.length;
  const byRisk = { URGENT: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
  const byStage = {};
  cases.forEach((c) => {
    byRisk[c.latest_risk] = (byRisk[c.latest_risk] || 0) + 1;
    byStage[c.case_stage] = (byStage[c.case_stage] || 0) + 1;
  });

  const pendingAlerts = alerts.filter((a) => a.status === 'open').length;

  return (
    <div className="page-content">
      {error && <AlertBanner type="error" onClose={() => setError('')}>{error}</AlertBanner>}

      <PageHeader
        title="District Overview"
        subtitle="Aggregated statistics and monitoring for your district."
        actions={
          <button className="btn btn-secondary btn-sm" onClick={load}>
            <Icon name="refresh" size="icon-sm" /> Refresh Data
          </button>
        }
      />

      <div className="stat-grid" style={{ marginBottom: '2rem' }}>
        <StatCard label="Total Registered Cases" value={totalCases} icon="folder_shared" />
        <StatCard label="Pending Alerts" value={pendingAlerts} icon="notifications_active" iconBg={pendingAlerts > 0 ? '#fee2e2' : '#eff6ff'} iconColor={pendingAlerts > 0 ? '#991b1b' : '#3b82f6'} sub={pendingAlerts > 0 ? 'Requires counsellor attention' : 'All clear'} />
        <StatCard label="Urgent Risk Cases" value={byRisk['URGENT'] || 0} icon="emergency" iconBg="#fee2e2" iconColor="#991b1b" />
      </div>

      <div className="grid-2">
        <Card>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="pie_chart" size="icon-sm" style={{ color: 'var(--brand-600)' }} /> Cases by Risk Level
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((level) => {
              const count = byRisk[level] || 0;
              const pct = totalCases ? Math.round((count / totalCases) * 100) : 0;
              const colors = {
                URGENT: 'var(--risk-urgent-text)',
                HIGH: 'var(--risk-high-text)',
                MEDIUM: 'var(--risk-medium-text)',
                LOW: 'var(--risk-low-text)'
              };
              return (
                <div key={level}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>{level}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--gray-100)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: colors[level], width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="bar_chart" size="icon-sm" style={{ color: 'var(--brand-600)' }} /> Cases by Judicial Stage
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(byStage).sort((a,b) => b[1] - a[1]).map(([stage, count]) => (
              <div key={stage} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                <span className="badge badge-gray">{stage.replace(/_/g, ' ')}</span>
                <span style={{ fontWeight: 600 }}>{count}</span>
              </div>
            ))}
            {Object.keys(byStage).length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No data available.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
