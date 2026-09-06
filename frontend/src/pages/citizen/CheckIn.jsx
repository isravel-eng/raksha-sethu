import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { checkInsApi, casesApi, caseEventsApi } from '../../services/api.js';
import { ScaleField, AlertBanner, Icon, FormGroup, Modal, Card } from '../../components/ui.jsx';
import {
  DEMO_CASE, DEMO_PREDICTION,
  DEMO_CHECK_INS, DEMO_CITIZEN,
} from '../../services/demoData.js';

const SCALES = [
  { id: 'ci_ed',  key: 'emotional_distress',  label: 'Emotional Distress',          low: 'None',    high: 'Extreme', min:0, max:10 },
  { id: 'ci_df',  key: 'distress_frequency',   label: 'Distress Frequency (days)',    low: 'Never',   high: 'Every day', min:0, max:7 },
  { id: 'ci_ow',  key: 'overwhelm',            label: 'Feeling of Overwhelm',         low: 'Not at all', high: 'Completely', min:0, max:10 },
  { id: 'ci_sq',  key: 'sleep_quality',         label: 'Sleep Quality',               low: 'Very poor', high: 'Excellent', min:0, max:10 },
  { id: 'ci_fa',  key: 'fatigue',              label: 'Fatigue Level',               low: 'None',    high: 'Severe',  min:0, max:10 },
  { id: 'ci_ss',  key: 'social_support',       label: 'Social Support',              low: 'None',    high: 'Strong',  min:0, max:10 },
  { id: 'ci_ca',  key: 'coping_ability',       label: 'Coping Ability',              low: 'Unable',  high: 'Well',    min:0, max:10 },
];

const DEFAULT_VALS = Object.fromEntries(SCALES.map((s) => [s.key, 5]));

export default function CheckIn() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const isDemoMode = !token || token === 'demo-token-not-for-real-auth';

  const [activeCase, setActiveCase] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_VALS, self_harm_indicator: 0, message_text: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState(null);
  const [postponeModal, setPostponeModal] = useState(false);
  const [postponeLoading, setPostponeLoading] = useState(false);
  const [fetchingCase, setFetchingCase] = useState(true);

  useEffect(() => {
    async function loadCase() {
      setFetchingCase(true);
      try {
        if (isDemoMode) {
          setActiveCase(DEMO_CASE);
        } else {
          const data = await casesApi.list(token);
          const cases = data.cases || [];
          if (cases.length > 0) setActiveCase(cases[0]);
        }
      } catch {
        if (isDemoMode) setActiveCase(DEMO_CASE);
      } finally {
        setFetchingCase(false);
      }
    }
    loadCase();
  }, [token, isDemoMode]);

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!activeCase) { setError('No active case found. Please contact your counsellor.'); return; }
    setLoading(true);
    setError('');
    try {
      if (isDemoMode) {
        // Demo simulation
        await new Promise((r) => setTimeout(r, 800));
        const demoResult = {
          check_in: { id: DEMO_CHECK_INS.length + 1, ...form },
          prediction: DEMO_PREDICTION,
          alert: form.emotional_distress >= 7 ? { id: 99, severity: DEMO_PREDICTION.risk_level } : null,
        };
        setResult(demoResult);
        setSuccess(true);
      } else {
        const data = await checkInsApi.create({
          case_id: activeCase.id,
          ...form,
        }, token);
        setResult(data);
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Check-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePostpone() {
    if (!activeCase) return;
    setPostponeLoading(true);
    try {
      if (!isDemoMode) {
        await caseEventsApi.create({
          case_id: activeCase.id,
          event_type: 'HEARING_POSTPONED',
          details_json: { postponement_days: 21, reason: 'Simulated via demo flow', new_hearing_date: new Date(Date.now() + 21 * 86400000).toISOString() },
        }, token);
      }
      setPostponeModal(false);
      // Auto-submit a new check-in with elevated distress after postponement
      const elevatedForm = {
        ...form,
        emotional_distress: Math.min(10, form.emotional_distress + 2),
        overwhelm: Math.min(10, form.overwhelm + 2),
        coping_ability: Math.max(0, form.coping_ability - 2),
        message_text: 'Hearing was postponed again. Feeling very anxious and unsafe.',
      };
      setForm(elevatedForm);
      // Now trigger the check-in
      setLoading(true);
      let data;
      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 1000));
        data = {
          check_in: { id: 999 },
          prediction: {
            ...DEMO_PREDICTION,
            risk_level: 'URGENT',
            dynamic_score: { score: 81.4 },
            human_review_required: true,
            top_risk_factors: ['hearing postponed', 'emotional distress spike', 'worsening trend'],
          },
          alert: { id: 99, severity: 'URGENT' },
        };
      } else {
        data = await checkInsApi.create({ case_id: activeCase.id, ...elevatedForm }, token);
      }
      setResult(data);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Postponement simulation failed.');
    } finally {
      setPostponeLoading(false);
      setLoading(false);
    }
  }

  if (fetchingCase) {
    return (
      <div className="loading-center">
        <div className="spinner spinner-lg" />
        <span>Loading your case…</span>
      </div>
    );
  }

  if (success && result) {
    return <CheckInResult result={result} onNewCheckIn={() => { setSuccess(false); setResult(null); setForm({ ...DEFAULT_VALS, self_harm_indicator: 0, message_text: '' }); }} />;
  }

  return (
    <div>
      {/* Demo flow bar */}
      <div className="demo-bar">
        <div className="demo-bar__text">
          <span>Demo Flow:</span> You can simulate how a hearing postponement affects the risk prediction.
        </div>
        <button
          type="button"
          className="btn btn-warning btn-sm"
          onClick={() => setPostponeModal(true)}
          style={{ background: '#fbbf24', color: '#1c1917' }}
        >
          <Icon name="event_busy" size="icon-sm" />
          Simulate Hearing Postponement
        </button>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2>Daily Check-In</h2>
          {activeCase && (
            <p>Case: <strong>{activeCase.case_number}</strong> · Stage: <strong>{activeCase.case_stage}</strong></p>
          )}
          {!activeCase && <p style={{ color: 'var(--risk-high-text)' }}>No active case found. Contact your counsellor.</p>}
        </div>

        {error && <AlertBanner type="error" onClose={() => setError('')}>{error}</AlertBanner>}

        <form onSubmit={handleSubmit}>
          <Card>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>How are you feeling today?</h3>
            {SCALES.map((s) => (
              <ScaleField
                key={s.id}
                id={s.id}
                label={s.label}
                value={form[s.key]}
                min={s.min}
                max={s.max}
                lowLabel={s.low}
                highLabel={s.high}
                onChange={(v) => setField(s.key, v)}
              />
            ))}
          </Card>

          <Card style={{ marginTop: '1.25rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Safety</h4>
            <div className="form-group">
              <label className="form-label">Are you having thoughts of harming yourself?</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.375rem' }}>
                {[0, 1].map((v) => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: v === form.self_harm_indicator ? 700 : 400 }}>
                    <input
                      type="radio"
                      name="self_harm"
                      value={v}
                      checked={form.self_harm_indicator === v}
                      onChange={() => setField('self_harm_indicator', v)}
                      style={{ accentColor: 'var(--brand-600)' }}
                    />
                    {v === 0 ? 'No' : 'Yes'}
                  </label>
                ))}
              </div>
              {form.self_harm_indicator === 1 && (
                <div className="alert-banner alert-banner-error" style={{ marginTop: '0.75rem' }}>
                  <Icon name="emergency" />
                  Your counsellor will be alerted immediately. If you are in immediate danger, please call <strong>112</strong>.
                </div>
              )}
            </div>

            <FormGroup label="Message to your counsellor (optional)" id="ci-msg">
              <textarea
                id="ci-msg"
                className="form-textarea"
                value={form.message_text}
                onChange={(e) => setField('message_text', e.target.value)}
                placeholder="How are you feeling? Anything specific you'd like your counsellor to know?"
              />
            </FormGroup>
          </Card>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !activeCase}
            style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem' }}
          >
            {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Analysing…</> : <><Icon name="send" size="icon-sm" /> Submit Check-In</>}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Your response will be analysed by our AI model and reviewed by your counsellor.
          </p>
        </form>
      </div>

      <Modal
        open={postponeModal}
        title="Simulate Hearing Postponement"
        onClose={() => setPostponeModal(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPostponeModal(false)}>Cancel</button>
            <button className="btn btn-warning" onClick={handlePostpone} disabled={postponeLoading}>
              {postponeLoading ? 'Processing…' : <><Icon name="event_busy" size="icon-sm" /> Confirm & Run Demo</>}
            </button>
          </>
        }
      >
        <p style={{ marginBottom: '1rem' }}>
          This will simulate the full demo flow:
        </p>
        <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <li>POST a <strong>HEARING_POSTPONED</strong> event to the backend</li>
          <li>Create a new check-in with elevated distress values</li>
          <li>Node backend calls FastAPI ML service</li>
          <li>Receive and display updated prediction</li>
          <li>Show counsellor alert if <code>human_review_required = true</code></li>
        </ol>
      </Modal>
    </div>
  );
}

function CheckInResult({ result, onNewCheckIn }) {
  const navigate = useNavigate();
  const pred = result?.prediction;
  const alert = result?.alert;
  const level = pred?.risk_level || 'LOW';
  const score = pred?.dynamic_score?.score ?? pred?.dynamic_score ?? 0;

  const riskColors = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444', URGENT: '#991b1b' };
  const color = riskColors[String(level).toUpperCase()] || '#94a3b8';

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{level === 'URGENT' ? '🚨' : level === 'HIGH' ? '⚠️' : '✅'}</div>
        <h2>Check-In Submitted</h2>
        <p>Your response has been analysed. Here are your results.</p>
      </div>

      {alert && (
        <div className="alert-banner alert-banner-error" style={{ marginBottom: '1.5rem' }}>
          <Icon name="notifications_active" />
          <div>
            <strong>Alert Created</strong> — Your counsellor has been notified and will review your case.
            Severity: <strong>{alert.severity}</strong>
          </div>
        </div>
      )}

      <Card style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Current Risk Score
        </div>
        <div style={{ fontSize: '4rem', fontWeight: 900, color, lineHeight: 1 }}>{Math.round(score)}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>out of 100</div>
        <span className={`badge badge-${level.toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
          {level}
        </span>
        {pred?.trend && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: pred.trend.includes('wors') ? '#ef4444' : '#22c55e' }}>
            <Icon name={pred.trend.includes('wors') ? 'trending_up' : 'trending_down'} size="icon-sm" /> {pred.trend}
          </div>
        )}
      </Card>

      {pred?.top_risk_factors?.length > 0 && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.75rem' }}>Top Risk Factors Identified</h4>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {pred.top_risk_factors.map((f, i) => <li key={i} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{f}</li>)}
          </ul>
        </Card>
      )}

      <div className="disclaimer" style={{ marginBottom: '1.5rem' }}>
        <strong>⚠ Note:</strong> {pred?.disclaimer || 'This is a screening aid only — not a clinical diagnosis. Your counsellor will review this result.'}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={onNewCheckIn} style={{ flex: 1 }}>
          <Icon name="refresh" size="icon-sm" /> New Check-In
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/citizen/timeline')} style={{ flex: 1 }}>
          <Icon name="timeline" size="icon-sm" /> View Timeline
        </button>
      </div>
    </div>
  );
}
