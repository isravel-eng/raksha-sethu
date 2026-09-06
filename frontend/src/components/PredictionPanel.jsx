import { RiskBadge, ScoreRing, TrendArrow, Disclaimer, Icon, ProgressBar } from './ui.jsx';

function riskColor(level) {
  const map = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444', URGENT: '#991b1b' };
  return map[String(level || '').toUpperCase()] || '#94a3b8';
}

export default function PredictionPanel({ prediction, storedPrediction, previousScore }) {
  if (!prediction) return null;

  const score  = storedPrediction?.dynamic_score ?? prediction?.dynamic_score?.score ?? prediction?.dynamic_score ?? 0;
  const level  = prediction.risk_level || storedPrediction?.risk_level || 'LOW';
  const color  = riskColor(level);
  const factors = prediction.top_risk_factors || storedPrediction?.top_risk_factors_json || [];
  const protective = prediction.protective_factors || storedPrediction?.protective_factors_json || [];
  const humanReview = prediction.human_review_required ?? storedPrediction?.human_review_required ?? false;
  const confidence = prediction.confidence ?? storedPrediction?.confidence ?? 0;
  const urgentProb = prediction.urgent_probability ?? storedPrediction?.urgent_probability ?? 0;
  const trend  = prediction.trend || storedPrediction?.trend || '';
  const mv     = prediction.model_version || storedPrediction?.model_version || '';
  const disclaimer = prediction.disclaimer || 'Screening and triage aid only — not a clinical diagnosis or recommendation.';

  return (
    <div className="risk-panel">
      <div className="risk-panel__header">
        <div>
          <h3 style={{ marginBottom: '0.5rem' }}>Prediction Result</h3>
          {humanReview && (
            <div className="alert-banner alert-banner-error" style={{ marginBottom: 0, padding: '0.6rem 1rem' }}>
              <Icon name="emergency" />
              <strong>Human review required</strong> — a counsellor has been alerted.
            </div>
          )}
        </div>
        <RiskBadge level={level} />
      </div>

      <div className="risk-panel__score-row">
        <ScoreRing score={score} level={level} size={130} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <MetricRow label="Dynamic Score" value={`${Math.round(score)}/100`} color={color} />
            <MetricRow label="Confidence"   value={`${Math.round(confidence * 100)}%`} bar={confidence} barColor="#3b82f6" />
            <MetricRow label="Urgent Probability" value={`${Math.round(urgentProb * 100)}%`} bar={urgentProb} barColor="#ef4444" />
            <div className="flex items-center justify-between" style={{ gap: '0.5rem' }}>
              <span className="text-muted" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Trend</span>
              <TrendArrow trend={trend} />
            </div>
            {previousScore != null && (
              <div className="flex items-center justify-between" style={{ gap: '0.5rem' }}>
                <span className="text-muted" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Previous Score</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{Math.round(previousScore)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="divider" />

      <div className="risk-panel__factors">
        <div>
          <div className="section-title" style={{ color: '#ef4444' }}>
            <Icon name="warning" size="icon-sm" />
            Risk Factors
          </div>
          {factors.length === 0
            ? <p style={{ fontSize: '0.85rem' }}>None identified</p>
            : (
              <ul className="factor-list">
                {factors.map((f, i) => (
                  <li key={i}>
                    <span className="factor-dot factor-dot-risk" />
                    {f}
                  </li>
                ))}
              </ul>
            )
          }
        </div>

        <div>
          <div className="section-title" style={{ color: '#22c55e' }}>
            <Icon name="shield" size="icon-sm" />
            Protective Factors
          </div>
          {protective.length === 0
            ? <p style={{ fontSize: '0.85rem' }}>None identified</p>
            : (
              <ul className="factor-list">
                {protective.map((f, i) => (
                  <li key={i}>
                    <span className="factor-dot factor-dot-protective" />
                    {f}
                  </li>
                ))}
              </ul>
            )
          }
        </div>
      </div>

      {mv && (
        <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Model version: <span className="font-mono">{mv}</span>
        </div>
      )}

      <div className="divider" />
      <Disclaimer text={disclaimer} />
    </div>
  );
}

function MetricRow({ label, value, color, bar, barColor }) {
  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: '0.2rem' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: color || 'var(--text-primary)' }}>{value}</span>
      </div>
      {bar != null && <ProgressBar value={bar * 100} color={barColor} height={4} />}
    </div>
  );
}
