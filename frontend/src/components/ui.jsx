// ─── Icon ────────────────────────────────────────────────────────────────────
export function Icon({ name, size = '', className = '' }) {
  return (
    <span className={`material-symbols-outlined ${size} ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}

// ─── RiskBadge ────────────────────────────────────────────────────────────────
export function RiskBadge({ level, className = '' }) {
  if (!level) return null;
  const l = String(level).toUpperCase();
  const cls = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high', URGENT: 'badge-urgent' }[l] || 'badge-gray';
  const icons = { LOW: 'check_circle', MEDIUM: 'warning', HIGH: 'error', URGENT: 'emergency' };
  return (
    <span className={`badge ${cls} ${className}`}>
      <Icon name={icons[l] || 'help'} size="icon-sm" />
      {l}
    </span>
  );
}

// ─── AlertStatusBadge ─────────────────────────────────────────────────────────
export function AlertStatusBadge({ status }) {
  const cls = { open: 'badge-open', acknowledged: 'badge-acknowledged', resolved: 'badge-resolved' }[status] || 'badge-gray';
  return <span className={`badge ${cls}`}>{status}</span>;
}

// ─── StageBadge ──────────────────────────────────────────────────────────────
export function StageBadge({ stage }) {
  const colors = { FIR: 'badge-blue', CHARGESHEET: 'badge-gray', TRIAL: 'badge-medium', RELIEF: 'badge-low', CLOSED: 'badge-gray' };
  return <span className={`badge ${colors[stage] || 'badge-gray'}`}>{stage}</span>;
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ large = false }) {
  return <div className={`spinner${large ? '-lg spinner' : ''}`} role="status" aria-label="Loading" />;
}

export function LoadingCenter({ message = 'Loading…' }) {
  return (
    <div className="loading-center">
      <Spinner large />
      <span>{message}</span>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = 'inbox', title = 'Nothing here', body = '' }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon"><Icon name={icon} /></div>
      <div className="empty-state__title">{title}</div>
      {body && <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{body}</p>}
    </div>
  );
}

// ─── AlertBanner ─────────────────────────────────────────────────────────────
export function AlertBanner({ type = 'info', children, onClose }) {
  const icons = { info: 'info', success: 'check_circle', warning: 'warning', error: 'error' };
  return (
    <div className={`alert-banner alert-banner-${type}`}>
      <Icon name={icons[type]} />
      <div style={{ flex: 1 }}>{children}</div>
      {onClose && (
        <button className="btn btn-ghost" style={{ padding: '0.125rem', minWidth: 0 }} onClick={onClose} aria-label="Dismiss">
          <Icon name="close" size="icon-sm" />
        </button>
      )}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ open, title, onClose, children, footer, maxWidth = '520px' }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal-box" style={{ maxWidth }} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h3 className="modal-title" id="modal-title">{title}</h3>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', style = {} }) {
  return <div className={`card ${className}`} style={style}>{children}</div>;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon, iconBg = '#eff6ff', iconColor = '#3b82f6' }) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      {sub && <div className="stat-card__sub">{sub}</div>}
      {icon && (
        <div className="stat-card__icon" style={{ background: iconBg, color: iconColor }}>
          <Icon name={icon} size="icon-lg" />
        </div>
      )}
    </div>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, color = '#3b82f6', height = 8 }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="progress-bar" style={{ height }}>
      <div className="progress-bar__fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── ScoreRing ────────────────────────────────────────────────────────────────
export function ScoreRing({ score, level, size = 120 }) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const dash = (pct / 100) * circ;

  const colors = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444', URGENT: '#991b1b' };
  const color = colors[String(level).toUpperCase()] || '#94a3b8';

  return (
    <div className="risk-score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="risk-score-text">
        <div className="risk-score-num" style={{ color }}>{Math.round(pct)}</div>
        <div className="risk-score-label">/ 100</div>
      </div>
    </div>
  );
}

// ─── Disclaimer ───────────────────────────────────────────────────────────────
export function Disclaimer({ text }) {
  return (
    <div className="disclaimer">
      <strong>⚠ Note:</strong> {text || 'This is a screening and triage aid only, not a clinical diagnosis. All predictions require human review by a trained counsellor.'}
    </div>
  );
}

// ─── TrendArrow ───────────────────────────────────────────────────────────────
export function TrendArrow({ trend }) {
  if (!trend) return null;
  const t = String(trend).toLowerCase();
  const isWorse = t.includes('wors');
  const isImprove = t.includes('improv') || t.includes('stable');
  return (
    <span style={{ color: isWorse ? '#ef4444' : isImprove ? '#22c55e' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>
      <Icon name={isWorse ? 'trending_up' : isImprove ? 'trending_down' : 'trending_flat'} size="icon-sm" />
      {trend}
    </span>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div className="page-header__left">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}

// ─── FormGroup ────────────────────────────────────────────────────────────────
export function FormGroup({ label, required, hint, error, children, id }) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}{required && <span aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="form-hint">{hint}</span>}
      {error && <span className="form-error" role="alert">{error}</span>}
    </div>
  );
}

// ─── ConsentSection ──────────────────────────────────────────────────────────
export function ConsentSection({ icon, title, body, checked, onChange, id }) {
  return (
    <div className="consent-section">
      <input type="checkbox" id={id} className="consent-checkbox" checked={checked} onChange={onChange} aria-label={title} />
      <label htmlFor={id} style={{ cursor: 'pointer' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {icon && <Icon name={icon} size="icon-sm" style={{ color: 'var(--brand-600)' }} />}
          {title}
        </div>
        <p style={{ fontSize: '0.875rem', margin: 0 }}>{body}</p>
      </label>
    </div>
  );
}

// ─── ScaleField ──────────────────────────────────────────────────────────────
export function ScaleField({ id, label, hint, value, min = 0, max = 10, step = 1, onChange, lowLabel, highLabel }) {
  return (
    <div className="scale-field">
      <div className="scale-field__header">
        <label htmlFor={id} className="form-label" style={{ marginBottom: 0 }}>{label}</label>
        <span className="scale-field__value">{value}</span>
      </div>
      {hint && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{hint}</p>}
      <input
        id={id}
        type="range"
        className="scale-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      <div className="scale-labels">
        <span>{lowLabel || min}</span>
        <span>{highLabel || max}</span>
      </div>
    </div>
  );
}
