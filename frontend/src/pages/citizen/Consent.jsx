import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ConsentSection, AlertBanner, Icon } from '../../components/ui.jsx';

const CONSENT_ITEMS = [
  {
    id: 'c1',
    icon: 'database',
    title: 'Data Collection',
    body: 'I consent to the collection of my check-in responses, case details, and communications for the purpose of distress monitoring and support.',
  },
  {
    id: 'c2',
    icon: 'psychology',
    title: 'AI Processing',
    body: 'I understand that my data will be processed by an AI system that generates risk scores. These are screening aids only and are always reviewed by a human counsellor.',
  },
  {
    id: 'c3',
    icon: 'supervisor_account',
    title: 'Counsellor Access',
    body: 'I consent to trained counsellors viewing my data for support and intervention purposes. My data will not be shared with third parties.',
  },
  {
    id: 'c4',
    icon: 'security',
    title: 'Data Security',
    body: 'I acknowledge that my data is encrypted at rest and in transit, and that I may request data deletion at any time by contacting the platform administrator.',
  },
];

export default function Consent() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const allChecked = CONSENT_ITEMS.every((item) => checked[item.id]);

  function toggle(id) {
    setChecked((c) => ({ ...c, [id]: !c[id] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!allChecked) {
      setError('Please review and accept all consent items to proceed.');
      return;
    }
    setLoading(true);
    // Consent is stored server-side during registration. Navigate to profile/screening.
    navigate('/citizen/screening');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f7ff, #f7f9fb)', padding: '2rem' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: '2.5rem', maxWidth: 560, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛡</div>
          <h2>Informed Consent</h2>
          <p style={{ marginTop: '0.5rem' }}>
            Before we begin, please review and accept each item below. You can withdraw consent at any time.
          </p>
        </div>

        {error && <AlertBanner type="error" onClose={() => setError('')}>{error}</AlertBanner>}

        <form onSubmit={handleSubmit}>
          {CONSENT_ITEMS.map((item) => (
            <ConsentSection
              key={item.id}
              id={item.id}
              icon={item.icon}
              title={item.title}
              body={item.body}
              checked={!!checked[item.id]}
              onChange={() => toggle(item.id)}
            />
          ))}

          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !allChecked}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? 'Processing…' : <><Icon name="check_circle" size="icon-sm" /> I Agree — Continue to Screening</>}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              All {CONSENT_ITEMS.length} items must be accepted to proceed.
              {CONSENT_ITEMS.filter((i) => checked[i.id]).length} of {CONSENT_ITEMS.length} accepted.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
