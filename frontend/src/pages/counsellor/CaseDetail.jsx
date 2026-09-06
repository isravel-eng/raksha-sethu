import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { casesApi, interventionsApi, citizensApi } from '../../services/api.js';
import {
  LoadingCenter, AlertBanner, RiskBadge, StageBadge, Icon, Card, Modal, PageHeader
} from '../../components/ui.jsx';
import RiskTimeline from '../../components/RiskTimeline.jsx';
import PredictionPanel from '../../components/PredictionPanel.jsx';
import { DEMO_CASE, DEMO_CHECK_INS, DEMO_EVENTS, DEMO_PREDICTION, DEMO_STORED_PREDICTION, DEMO_CITIZEN } from '../../services/demoData.js';

export default function CaseDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const isDemoMode = !token || token === 'demo-token-not-for-real-auth';

  const [caseObj, setCaseObj] = useState(null);
  const [citizen, setCitizen] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [events, setEvents] = useState([]);
  const [interventions, setInterventions] = useState([]); // if backend supported fetching them, we'd load it
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Intervention modal
  const [intModal, setIntModal] = useState(false);
  const [intType, setIntType] = useState('COUNSELLING_SESSION');
  const [intNotes, setIntNotes] = useState('');
  const [intSubmitting, setIntSubmitting] = useState(false);

  useEffect(() => { load(); }, [id, token]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      if (isDemoMode) {
        setCaseObj(DEMO_CASE);
        setCitizen(DEMO_CITIZEN);
        setCheckIns(DEMO_CHECK_INS);
        setEvents(DEMO_EVENTS);
        setPredictions([{ ...DEMO_STORED_PREDICTION, check_in_id: 3 }]);
        setInterventions([]);
      } else {
        const c = await casesApi.get(id, token);
        setCaseObj(c.case);
        const [citData, ciData, evData] = await Promise.all([
          citizensApi.get(c.case.citizen_id, token),
          casesApi.checkIns(id, token),
          casesApi.events(id, token),
        ]);
        setCitizen(citData.citizen);
        setCheckIns(ciData.check_ins || []);
        setEvents(evData.events || []);
        // Note: Actual implementation would fetch predictions and interventions if available
        setPredictions([]);
        setInterventions([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load case details.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddIntervention() {
    setIntSubmitting(true);
    try {
      if (!isDemoMode) {
        await interventionsApi.create({
          case_id: caseObj.id,
          intervention_type: intType,
          notes: intNotes,
        }, token);
      }
      setInterventions((prev) => [
        { id: Date.now(), intervention_type: intType, notes: intNotes, created_at: new Date().toISOString() },
        ...prev
      ]);
      setIntModal(false);
      setIntNotes('');
    } catch (err) {
      alert(err.message || 'Failed to add intervention');
    } finally {
      setIntSubmitting(false);
    }
  }

  if (loading) return <LoadingCenter message="Loading case details…" />;
  if (error) return <div className="page-content"><AlertBanner type="error">{error}</AlertBanner></div>;
  if (!caseObj) return <div className="page-content"><EmptyState icon="folder_off" title="Case not found" /></div>;

  const latestPred = predictions[predictions.length - 1];

  return (
    <div className="page-content">
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/counsellor/dashboard')} style={{ paddingLeft: 0 }}>
          <Icon name="arrow_back" size="icon-sm" /> Back to Dashboard
        </button>
      </div>

      <PageHeader
        title={`Case: ${caseObj.case_number}`}
        subtitle={`${citizen?.name || 'Unknown Citizen'} · ${caseObj.district}, ${caseObj.state}`}
        actions={
          <button className="btn btn-primary" onClick={() => setIntModal(true)}>
            <Icon name="add_circle" size="icon-sm" /> Add Intervention
          </button>
        }
      />

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div>
          {/* Latest Prediction Summary */}
          {latestPred && (
            <div style={{ marginBottom: '1.5rem' }}>
              <PredictionPanel
                prediction={latestPred}
                storedPrediction={latestPred}
                previousScore={null}
              />
            </div>
          )}

          <Card>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="timeline" size="icon-sm" style={{ color: 'var(--brand-600)' }} /> Case Timeline
            </h3>
            <RiskTimeline checkIns={checkIns} events={events} predictions={predictions} />
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Citizen Profile</h4>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
              <InfoRow label="Name" value={citizen?.name} />
              <InfoRow label="Phone" value={citizen?.phone} />
              <InfoRow label="District" value={citizen?.district} />
              <InfoRow label="Consent Given" value={citizen?.consent_given ? 'Yes' : 'No'} />
              <InfoRow label="Registered" value={new Date(citizen?.created_at).toLocaleDateString('en-IN')} />
            </div>
          </Card>

          <Card style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Case Details</h4>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
              <InfoRow label="Case No." value={caseObj.case_number} />
              <InfoRow label="Stage" value={<StageBadge stage={caseObj.case_stage} />} />
              <InfoRow label="Status" value={caseObj.status} />
              <InfoRow label="Created" value={new Date(caseObj.created_at).toLocaleDateString('en-IN')} />
            </div>
          </Card>

          <Card>
            <h4 style={{ marginBottom: '1rem' }}>Interventions</h4>
            {interventions.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No interventions recorded yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {interventions.map((intv) => (
                  <li key={intv.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span className="badge badge-gray">{intv.intervention_type}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(intv.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    {intv.notes && <p style={{ fontSize: '0.85rem', margin: 0 }}>{intv.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={intModal}
        title="Record Intervention"
        onClose={() => setIntModal(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIntModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddIntervention} disabled={intSubmitting || !intNotes}>
              {intSubmitting ? 'Saving…' : 'Save Intervention'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={intType} onChange={(e) => setIntType(e.target.value)}>
            <option value="COUNSELLING_SESSION">Counselling Session</option>
            <option value="SUPPORT_CALL">Support Call</option>
            <option value="LEGAL_AID_REFERRAL">Legal Aid Referral</option>
            <option value="SHELTER_REFERRAL">Shelter Referral</option>
            <option value="POLICE_ESCALATION">Police Escalation</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea"
            value={intNotes}
            onChange={(e) => setIntNotes(e.target.value)}
            placeholder="Details of the intervention..."
            required
          />
        </div>
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
