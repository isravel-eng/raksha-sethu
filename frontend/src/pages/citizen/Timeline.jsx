import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { casesApi, caseEventsApi, checkInsApi } from '../../services/api.js';
import { LoadingCenter, AlertBanner, RiskBadge, StageBadge, Icon, Card, StatCard, Modal } from '../../components/ui.jsx';
import RiskTimeline from '../../components/RiskTimeline.jsx';
import { DEMO_CASE, DEMO_CHECK_INS, DEMO_EVENTS, DEMO_CITIZEN, DEMO_PREDICTION, DEMO_STORED_PREDICTION } from '../../services/demoData.js';

export default function Timeline() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const isDemoMode = !token || token === 'demo-token-not-for-real-auth';

  const [caseObj, setCaseObj] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [events, setEvents] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [citizen, setCitizen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [postponeModal, setPostponeModal] = useState(false);
  const [postponeLoading, setPostponeLoading] = useState(false);
  const [postponeSuccess, setPostponeSuccess] = useState(false);

  useEffect(() => { load(); }, [token]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      if (isDemoMode) {
        setCaseObj(DEMO_CASE);
        setCheckIns(DEMO_CHECK_INS);
        setEvents(DEMO_EVENTS);
        setCitizen(DEMO_CITIZEN);
        setPredictions([{ ...DEMO_STORED_PREDICTION, check_in_id: 3 }]);
      } else {
        const casesData = await casesApi.list(token);
        const cases = casesData.cases || [];
        if (cases.length === 0) throw new Error('No active case found.');
        const c = cases[0];
        setCaseObj(c);
        const [ciData, evData] = await Promise.all([
          casesApi.checkIns(c.id, token),
          casesApi.events(c.id, token),
        ]);
        setCheckIns(ciData.check_ins || []);
        setEvents(evData.events || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load timeline.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePostpone() {
    setPostponeLoading(true);
    try {
      if (!isDemoMode) {
        await caseEventsApi.create({
          case_id: caseObj.id,
          event_type: 'HEARING_POSTPONED',
          details_json: { postponement_days: 21, reason: 'Demo simulation', new_hearing_date: new Date(Date.now() + 21*86400000).toISOString() },
        }, token);
        const data = await checkInsApi.create({
          case_id: caseObj.id,
          emotional_distress: 9, distress_frequency: 6, overwhelm: 9,
          sleep_quality: 2, fatigue: 9, social_support: 2, coping_ability: 2,
          self_harm_indicator: 0,
          message_text: 'Hearing postponed again. Feeling desperate.',
        }, token);
        // Reload
        await load();
      } else {
        // Demo: add fake postpone event + check-in
        const now = new Date().toISOString();
        setEvents((prev) => [
          ...prev,
          { id: 99, case_id: 1, event_type: 'HEARING_POSTPONED', event_date: now, details_json: { postponement_days: 21, reason: 'Demo simulation', new_hearing_date: new Date(Date.now() + 21*86400000).toISOString() }, created_at: now },
        ]);
        setCheckIns((prev) => [
          ...prev,
          { id: 99, citizen_id: 1, case_id: 1, timestamp: now, emotional_distress: 9, distress_frequency: 6, overwhelm: 9, sleep_quality: 2, fatigue: 9, social_support: 2, coping_ability: 2, self_harm_indicator: 0, message_text: 'Hearing postponed again. Feeling desperate.', created_at: now },
        ]);
        setPredictions((prev) => [
          ...prev,
          { id: 99, check_in_id: 99, risk_level: 'URGENT', dynamic_score: 84.2, trend: 'worsening', confidence: 0.78, urgent_probability: 0.55, top_risk_factors_json: ['hearing postponed', 'severe distress spike', 'threat reported'], human_review_required: true, created_at: now },
        ]);
      }
      setPostponeSuccess(true);
      setPostponeModal(false);
    } catch (err) {
      setError(err.message || 'Postponement simulation failed.');
      setPostponeModal(false);
    } finally {
      setPostponeLoading(false);
    }
  }

  if (loading) return <LoadingCenter message="Loading timeline…" />;

  const latestPred = predictions[predictions.length - 1];

  return (
    <div>
      {/* Demo bar */}
      <div className="demo-bar">
        <div className="demo-bar__text"><span>Demo:</span> Simulate how a hearing postponement triggers URGENT prediction and counsellor alert.</div>
        <button className="btn btn-warning btn-sm" onClick={() => setPostponeModal(true)} style={{ background: '#fbbf24', color: '#1c1917' }}>
          <Icon name="event_busy" size="icon-sm" /> Simulate Hearing Postponement
        </button>
      </div>

      <div className="page-content">
        {error && <AlertBanner type="error" onClose={() => setError('')}>{error}</AlertBanner>}
        {postponeSuccess && (
          <AlertBanner type="warning" onClose={() => setPostponeSuccess(false)}>
            <strong>Hearing Postponed!</strong> New check-in created. Risk level escalated to URGENT. Counsellor has been alerted.
          </AlertBanner>
        )}

        <div className="page-header">
          <div className="page-header__left">
            <h2>My Timeline</h2>
            {caseObj && <p>Case {caseObj.case_number} · <StageBadge stage={caseObj.case_stage} /></p>}
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/citizen/check-in')}>
            <Icon name="add" size="icon-sm" /> New Check-In
          </button>
        </div>

        {/* Summary stats */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: '2rem' }}>
          <StatCard label="Check-Ins" value={checkIns.length} icon="edit_note" />
          <StatCard label="Case Events" value={events.length} icon="event" iconBg="#eff6ff" iconColor="#3b82f6" />
          {latestPred && (
            <>
              <StatCard
                label="Current Score"
                value={Math.round(latestPred.dynamic_score || 0)}
                sub="out of 100"
                icon="analytics"
                iconBg={latestPred.risk_level === 'URGENT' ? '#fee2e2' : latestPred.risk_level === 'HIGH' ? '#ffedd5' : '#dcfce7'}
                iconColor={latestPred.risk_level === 'URGENT' ? '#991b1b' : latestPred.risk_level === 'HIGH' ? '#c2410c' : '#15803d'}
              />
              <div className="stat-card">
                <div className="stat-card__label">Risk Level</div>
                <div style={{ marginTop: '0.5rem' }}><RiskBadge level={latestPred.risk_level} /></div>
              </div>
            </>
          )}
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>
          <Card>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="timeline" size="icon-sm" style={{ color: 'var(--brand-600)' }} /> Full Timeline
            </h3>
            <RiskTimeline checkIns={checkIns} events={events} predictions={predictions} />
          </Card>

          <div>
            {latestPred && (
              <Card style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>Latest Risk Assessment</h4>
                <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <InfoRow label="Risk Level" value={<RiskBadge level={latestPred.risk_level} />} />
                  <InfoRow label="Score" value={`${Math.round(latestPred.dynamic_score || 0)} / 100`} />
                  <InfoRow label="Trend" value={latestPred.trend || '—'} />
                  <InfoRow label="Confidence" value={`${Math.round((latestPred.confidence || 0) * 100)}%`} />
                  <InfoRow label="Human Review" value={latestPred.human_review_required ? '✓ Required' : 'Not required'} />
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => navigate('/citizen/result')} style={{ marginTop: '1rem' }}>
                  <Icon name="assessment" size="icon-sm" /> Full Result
                </button>
              </Card>
            )}

            {caseObj && (
              <Card>
                <h4 style={{ marginBottom: '1rem' }}>Case Details</h4>
                <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <InfoRow label="Case No." value={caseObj.case_number} />
                  <InfoRow label="District" value={caseObj.district} />
                  <InfoRow label="State" value={caseObj.state} />
                  <InfoRow label="Stage" value={<StageBadge stage={caseObj.case_stage} />} />
                  <InfoRow label="Status" value={caseObj.status} />
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={postponeModal}
        title="Simulate Hearing Postponement"
        onClose={() => setPostponeModal(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPostponeModal(false)}>Cancel</button>
            <button className="btn btn-warning" onClick={handlePostpone} disabled={postponeLoading}>
              {postponeLoading ? 'Running demo…' : <><Icon name="event_busy" size="icon-sm" /> Run Demo Flow</>}
            </button>
          </>
        }
      >
        <p style={{ marginBottom: '1rem' }}>This will execute the full demo flow:</p>
        <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <li>POST <strong>HEARING_POSTPONED</strong> event to backend</li>
          <li>Create new check-in with elevated distress</li>
          <li>Backend forwards to FastAPI ML service</li>
          <li>Receive URGENT prediction</li>
          <li>Display updated timeline with new risk level</li>
          <li>Show counsellor alert banner</li>
        </ol>
      </Modal>
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
