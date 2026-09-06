import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { casesApi } from '../../services/api.js';
import { LoadingCenter, AlertBanner, RiskBadge, Icon, Card } from '../../components/ui.jsx';
import PredictionPanel from '../../components/PredictionPanel.jsx';
import { DEMO_CASE, DEMO_PREDICTION, DEMO_STORED_PREDICTION, DEMO_CHECK_INS } from '../../services/demoData.js';
import { useNavigate } from 'react-router-dom';

export default function Result() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const isDemoMode = !token || token === 'demo-token-not-for-real-auth';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (isDemoMode) {
          setData({
            caseObj: DEMO_CASE,
            prediction: DEMO_PREDICTION,
            storedPrediction: DEMO_STORED_PREDICTION,
            previousScore: DEMO_CHECK_INS.length > 1 ? 43.2 : null,
            checkInsCount: DEMO_CHECK_INS.length,
          });
        } else {
          const casesData = await casesApi.list(token);
          const cases = casesData.cases || [];
          if (cases.length === 0) throw new Error('No active case found.');
          const c = cases[0];
          const ciData = await casesApi.checkIns(c.id, token);
          const checkIns = ciData.check_ins || [];
          // Latest prediction is embedded in check-in response; for now use last check-in data
          setData({ caseObj: c, checkIns, checkInsCount: checkIns.length });
        }
      } catch (err) {
        setError(err.message || 'Failed to load results.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, isDemoMode]);

  if (loading) return <LoadingCenter message="Loading your results…" />;

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <AlertBanner type="error">{error}</AlertBanner>
        <button className="btn btn-secondary" onClick={() => navigate('/citizen/check-in')} style={{ marginTop: '1rem' }}>
          <Icon name="edit_note" size="icon-sm" /> Submit a Check-In
        </button>
      </div>
    );
  }

  if (!data?.prediction && !data?.storedPrediction) {
    return (
      <div style={{ padding: '2rem', maxWidth: 540 }}>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h3>No Results Yet</h3>
          <p>Complete your first check-in to see your prediction result here.</p>
          <button className="btn btn-primary" onClick={() => navigate('/citizen/check-in')} style={{ marginTop: '1.5rem' }}>
            <Icon name="edit_note" size="icon-sm" /> Go to Check-In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 900 }}>
      <div className="page-header">
        <div className="page-header__left">
          <h2>My Latest Result</h2>
          <p>Case: <strong>{data.caseObj?.case_number}</strong> · {data.checkInsCount || 0} check-ins total</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/citizen/check-in')}>
          <Icon name="edit_note" size="icon-sm" /> New Check-In
        </button>
      </div>

      <PredictionPanel
        prediction={data.prediction}
        storedPrediction={data.storedPrediction}
        previousScore={data.previousScore}
      />
    </div>
  );
}
