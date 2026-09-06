import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { casesApi, alertsApi } from '../../services/api.js';
import {
  LoadingCenter, AlertBanner, RiskBadge, StageBadge, AlertStatusBadge,
  StatCard, Icon, Card, EmptyState, PageHeader,
} from '../../components/ui.jsx';
import { DEMO_CASES_LIST, DEMO_ALERTS_LIST } from '../../services/demoData.js';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CounsellorDashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const isDemoMode = !token || token === 'demo-token-not-for-real-auth';

  const [cases, setCases] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('cases');
  const [updatingAlert, setUpdatingAlert] = useState(null);

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
        setCases(casesData.cases || []);
        setAlerts(alertsData.alerts || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAlertAck(alertId) {
    setUpdatingAlert(alertId);
    try {
      if (!isDemoMode) {
        await alertsApi.update(alertId, 'acknowledged', token);
      }
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, status: 'acknowledged' } : a));
    } catch (err) {
      setError(err.message || 'Failed to update alert.');
    } finally {
      setUpdatingAlert(null);
    }
  }

  async function handleAlertResolve(alertId) {
    setUpdatingAlert(alertId);
    try {
      if (!isDemoMode) {
        await alertsApi.update(alertId, 'resolved', token);
      }
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, status: 'resolved' } : a));
    } catch (err) {
      setError(err.message || 'Failed to update alert.');
    } finally {
      setUpdatingAlert(null);
    }
  }

  if (loading) return <LoadingCenter message="Loading dashboard…" />;

  const totalActive    = cases.filter((c) => c.status === 'active').length;
  const urgentCases    = cases.filter((c) => c.latest_risk === 'URGENT').length;
  const highCases      = cases.filter((c) => c.latest_risk === 'HIGH').length;
  const pendingReview  = alerts.filter((a) => a.status === 'open').length;
  const openAlerts     = alerts.filter((a) => a.status === 'open');

  return (
    <div>
      <div className="page-content">
        {error && <AlertBanner type="error" onClose={() => setError('')}>{error}</AlertBanner>}

        <PageHeader
          title="Counsellor Dashboard"
          subtitle="Monitor active cases, manage alerts, and record interventions."
          actions={
            <button className="btn btn-secondary btn-sm" onClick={load}>
              <Icon name="refresh" size="icon-sm" /> Refresh
            </button>
          }
        />

        {/* Stats */}
        <div className="stat-grid">
          <StatCard label="Total Active Cases" value={totalActive}  icon="folder_open"  iconBg="#eff6ff" iconColor="#3b82f6" />
          <StatCard label="Urgent Cases"       value={urgentCases}  icon="emergency"    iconBg="#fee2e2" iconColor="#991b1b" sub={urgentCases > 0 ? 'Immediate action needed' : 'None currently'} />
          <StatCard label="High Risk Cases"    value={highCases}    icon="error"        iconBg="#ffedd5" iconColor="#c2410c" />
          <StatCard label="Pending Review"     value={pendingReview} icon="notifications" iconBg="#fef9c3" iconColor="#854d0e" sub="Open alerts" />
        </div>

        {/* Open alerts banner */}
        {openAlerts.length > 0 && (
          <div className="alert-banner alert-banner-error" style={{ marginBottom: '1.5rem' }}>
            <Icon name="notifications_active" size="icon-lg" />
            <div>
              <strong>{openAlerts.length} open alert{openAlerts.length > 1 ? 's' : ''} requiring attention</strong>
              <div style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                {openAlerts.map((a) => (
                  <span key={a.id} style={{ marginRight: '1rem' }}>
                    {a.citizen_name}: <strong>{a.severity}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0' }}>
          {[['cases', 'folder_open', 'Cases'], ['alerts', 'notifications', 'Alerts']].map(([id, icon, label]) => (
            <button
              key={id}
              className="btn btn-ghost"
              onClick={() => setTab(id)}
              style={{
                borderRadius: 0,
                borderBottom: tab === id ? '2px solid var(--brand-600)' : '2px solid transparent',
                marginBottom: -2,
                color: tab === id ? 'var(--brand-600)' : 'var(--text-muted)',
                fontWeight: tab === id ? 700 : 500,
                padding: '0.6rem 1rem',
              }}
            >
              <Icon name={icon} size="icon-sm" />
              {label}
              {id === 'alerts' && openAlerts.length > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 800, padding: '0.1rem 0.45rem', marginLeft: '0.375rem' }}>
                  {openAlerts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'cases' && <CasesTable cases={cases} onView={(id) => navigate(`/counsellor/cases/${id}`)} />}
        {tab === 'alerts' && <AlertsTable alerts={alerts} onAck={handleAlertAck} onResolve={handleAlertResolve} updatingAlert={updatingAlert} onViewCase={(id) => navigate(`/counsellor/cases/${id}`)} />}
      </div>
    </div>
  );
}

function CasesTable({ cases, onView }) {
  if (cases.length === 0) return <EmptyState icon="folder_open" title="No cases assigned" body="Cases assigned to you will appear here." />;
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Citizen</th>
            <th>Case No.</th>
            <th>District</th>
            <th>Stage</th>
            <th>Risk Level</th>
            <th>Score</th>
            <th>Registered</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id}>
              <td style={{ fontWeight: 600 }}>{c.citizen_name || `Citizen #${c.citizen_id}`}</td>
              <td className="font-mono">{c.case_number}</td>
              <td>{c.district}, {c.state}</td>
              <td><StageBadge stage={c.case_stage} /></td>
              <td><RiskBadge level={c.latest_risk || '—'} /></td>
              <td style={{ fontWeight: 700 }}>{c.latest_score != null ? Math.round(c.latest_score) : '—'}</td>
              <td style={{ color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
              <td>
                <button className="btn btn-secondary btn-sm" onClick={() => onView(c.id)}>
                  <Icon name="open_in_new" size="icon-sm" /> View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlertsTable({ alerts, onAck, onResolve, updatingAlert, onViewCase }) {
  if (alerts.length === 0) return <EmptyState icon="notifications" title="No alerts" body="Alerts for high-risk citizens will appear here." />;
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Citizen</th>
            <th>Severity</th>
            <th>Message</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id}>
              <td style={{ fontWeight: 600 }}>{a.citizen_name || `Citizen #${a.citizen_id}`}</td>
              <td><RiskBadge level={a.severity} /></td>
              <td style={{ maxWidth: 280, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{a.message}</td>
              <td><AlertStatusBadge status={a.status} /></td>
              <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(a.created_at).toLocaleDateString('en-IN')}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {a.status === 'open' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => onAck(a.id)} disabled={updatingAlert === a.id}>
                      {updatingAlert === a.id ? '…' : 'Ack'}
                    </button>
                  )}
                  {a.status !== 'resolved' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => onResolve(a.id)} disabled={updatingAlert === a.id}>
                      {updatingAlert === a.id ? '…' : 'Resolve'}
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => onViewCase(a.case_id)}>
                    <Icon name="open_in_new" size="icon-sm" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
