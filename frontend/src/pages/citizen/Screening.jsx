import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { screeningsApi } from '../../services/api.js';
import { ScaleField, AlertBanner, Icon, FormGroup } from '../../components/ui.jsx';

const QUESTIONS = [
  { id: 'q1', label: 'Overall Emotional Distress', hint: '0 = No distress, 10 = Extreme distress', min: 0, max: 10, low: 'None', high: 'Extreme', key: 'emotional_distress' },
  { id: 'q2', label: 'Frequency of Distressing Feelings (days per week)', hint: '0 = Never, 7 = Every day', min: 0, max: 7, low: 'Never', high: 'Every day', key: 'distress_frequency' },
  { id: 'q3', label: 'Feeling of Overwhelm', hint: '0 = Not at all, 10 = Completely overwhelmed', min: 0, max: 10, low: 'Not at all', high: 'Completely', key: 'overwhelm' },
  { id: 'q4', label: 'Sleep Quality', hint: '0 = Very poor, 10 = Excellent', min: 0, max: 10, low: 'Very poor', high: 'Excellent', key: 'sleep_quality' },
  { id: 'q5', label: 'Fatigue Level', hint: '0 = No fatigue, 10 = Severe fatigue', min: 0, max: 10, low: 'None', high: 'Severe', key: 'fatigue' },
  { id: 'q6', label: 'Social Support Available', hint: '0 = No support, 10 = Strong support network', min: 0, max: 10, low: 'None', high: 'Strong', key: 'social_support' },
  { id: 'q7', label: 'Coping Ability', hint: '0 = Unable to cope, 10 = Coping well', min: 0, max: 10, low: 'Unable', high: 'Well', key: 'coping_ability' },
];

export default function Screening() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState(() => Object.fromEntries(QUESTIONS.map((q) => [q.key, 5])));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = QUESTIONS.length + 1; // +1 for notes/submit
  const q = QUESTIONS[step];
  const isNotesStep = step === QUESTIONS.length;

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const citizenId = user?.citizen_id;
      if (!citizenId) throw new Error('No citizen profile found. Please log out and log in again.');
      await screeningsApi.create({
        citizen_id: citizenId,
        screening_type: 'PHQ-baseline',
        responses_json: responses,
        score: Object.values(responses).reduce((a, b) => a + b, 0) / QUESTIONS.length,
      }, token);
      navigate('/citizen/check-in');
    } catch (err) {
      setError(err.message || 'Failed to save screening. Continuing…');
      setTimeout(() => navigate('/citizen/check-in'), 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f7ff, #f7f9fb)', padding: '2rem' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: '2.5rem', maxWidth: 560, width: '100%' }}>
        {/* Progress */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>BASELINE SCREENING</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{step + 1} / {totalSteps}</span>
          </div>
          <div className="screening-progress">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`screening-progress__step${i < step ? ' done' : i === step ? ' active' : ''}`}
              />
            ))}
          </div>
        </div>

        {error && <AlertBanner type="error" onClose={() => setError('')}>{error}</AlertBanner>}

        {!isNotesStep ? (
          <>
            <h3 style={{ marginBottom: '0.375rem' }}>Question {step + 1}</h3>
            <p style={{ marginBottom: '2rem' }}>This helps us understand your current wellbeing baseline.</p>
            <ScaleField
              id={q.id}
              label={q.label}
              hint={q.hint}
              value={responses[q.key]}
              min={q.min}
              max={q.max}
              lowLabel={q.low}
              highLabel={q.high}
              onChange={(v) => setResponses((r) => ({ ...r, [q.key]: v }))}
            />
          </>
        ) : (
          <>
            <h3 style={{ marginBottom: '0.5rem' }}>Anything else you'd like to share?</h3>
            <p style={{ marginBottom: '1rem' }}>Optional — your counsellor will read this.</p>
            <FormGroup label="Additional notes (optional)" id="notes">
              <textarea
                id="notes"
                className="form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How are you feeling overall? Any specific concerns?"
              />
            </FormGroup>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', gap: '1rem' }}>
          {step > 0 ? (
            <button className="btn btn-secondary" onClick={() => setStep((s) => s - 1)}>
              <Icon name="arrow_back" size="icon-sm" /> Back
            </button>
          ) : <div />}

          {!isNotesStep ? (
            <button className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>
              Next <Icon name="arrow_forward" size="icon-sm" />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving…' : <><Icon name="check_circle" size="icon-sm" /> Complete Screening</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
