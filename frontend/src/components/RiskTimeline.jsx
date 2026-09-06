import { RiskBadge, Icon, StageBadge } from './ui.jsx';

function fmt(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function riskDot(level) {
  const map = { LOW: 'timeline-dot-low', MEDIUM: 'timeline-dot-medium', HIGH: 'timeline-dot-high', URGENT: 'timeline-dot-urgent' };
  return map[String(level || '').toUpperCase()] || 'timeline-dot-event';
}

function eventIcon(type) {
  const map = {
    FIR: 'gavel', CHARGESHEET: 'description', TRIAL_DATE: 'calendar_today',
    HEARING_POSTPONED: 'event_busy', RELIEF: 'volunteer_activism', THREAT_REPORTED: 'warning',
  };
  return map[type] || 'circle';
}

export default function RiskTimeline({ checkIns = [], events = [], predictions = [] }) {
  // Build unified timeline items
  const items = [];

  checkIns.forEach((ci) => {
    // Find prediction for this check-in
    const pred = predictions.find((p) => p.check_in_id === ci.id);
    items.push({ type: 'checkin', date: ci.timestamp || ci.created_at, data: ci, prediction: pred });
  });

  events.forEach((ev) => {
    items.push({ type: 'event', date: ev.event_date || ev.created_at, data: ev });
  });

  items.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (items.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No timeline data yet.</p>;
  }

  return (
    <div className="timeline">
      {items.map((item, i) => {
        if (item.type === 'checkin') {
          const ci = item.data;
          const pred = item.prediction;
          const level = pred?.risk_level || 'LOW';
          const score = pred?.dynamic_score;
          return (
            <div className="timeline-item" key={`ci-${ci.id || i}`}>
              <div className={`timeline-dot ${riskDot(level)}`} />
              <div className="timeline-date">{fmt(item.date)}</div>
              <div className="timeline-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Icon name="edit_note" size="icon-sm" style={{ color: 'var(--text-muted)' }} />
                Check-In
                {pred && <RiskBadge level={level} />}
                {score != null && <span className="tag">Score: {Math.round(score)}</span>}
              </div>
              {ci.message_text && (
                <div className="timeline-body" style={{ marginTop: '0.375rem', fontStyle: 'italic' }}>
                  "{ci.message_text}"
                </div>
              )}
              {pred && (
                <div className="timeline-body" style={{ marginTop: '0.375rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {pred.trend && <span>Trend: <strong>{pred.trend}</strong></span>}
                  {pred.confidence != null && <span>Confidence: <strong>{Math.round(pred.confidence * 100)}%</strong></span>}
                </div>
              )}
            </div>
          );
        }

        // Event
        const ev = item.data;
        const details = typeof ev.details_json === 'object' ? ev.details_json : {};
        return (
          <div className="timeline-item" key={`ev-${ev.id || i}`}>
            <div className="timeline-dot timeline-dot-event" style={{ background: 'var(--brand-600)', boxShadow: '0 0 0 2px var(--brand-200)' }} />
            <div className="timeline-date">{fmtDate(item.date)}</div>
            <div className="timeline-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Icon name={eventIcon(ev.event_type)} size="icon-sm" style={{ color: 'var(--brand-600)' }} />
              <span className="badge badge-blue" style={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
                {ev.event_type?.replace(/_/g, ' ')}
              </span>
              {details.new_hearing_date && (
                <span className="tag">New hearing: {fmtDate(details.new_hearing_date)}</span>
              )}
            </div>
            {Object.keys(details).length > 0 && (
              <div className="timeline-body" style={{ marginTop: '0.375rem' }}>
                {details.station && <span>Station: {details.station} · </span>}
                {details.reason && <span>Reason: {details.reason} · </span>}
                {details.postponement_days && <span>Postponed by {details.postponement_days} days · </span>}
                {details.description && <span>{details.description}</span>}
                {details.court && <span>Court: {details.court}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
