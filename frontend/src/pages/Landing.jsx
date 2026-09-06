import { Link } from 'react-router-dom';
import { Icon } from '../components/ui.jsx';

const HOW_STEPS = [
  { icon: 'how_to_reg', title: 'Consent & Profile', desc: 'Provide informed consent and basic profile details. Your data is encrypted and never shared.' },
  { icon: 'quiz', title: 'Baseline Screening', desc: 'Complete a validated distress screening to establish your initial wellbeing baseline.' },
  { icon: 'edit_note', title: 'Periodic Check-Ins', desc: 'Short, regular check-ins capture emotional distress, sleep, coping, and social support.' },
  { icon: 'psychology', title: 'AI Risk Analysis', desc: 'Our ML model analyses your history against case events to compute a dynamic risk score.' },
  { icon: 'supervisor_account', title: 'Counsellor Review', desc: 'High-risk predictions trigger immediate human review by trained support counsellors.' },
  { icon: 'volunteer_activism', title: 'Targeted Support', desc: 'Personalised interventions, referrals, and follow-up ensure continuous, tailored care.' },
];

export default function Landing() {
  return (
    <div>
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav__logo">
          <Icon name="shield" style={{ color: 'var(--brand-600)' }} />
          RakshaSetu
        </div>
        <div className="landing-nav__links">
          <Link to="/login" className="btn btn-ghost">Sign In</Link>
          <Link to="/login" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero__content">
          <div className="landing-hero__badge">
            <Icon name="psychology_alt" size="icon-sm" />
            AI-Powered Distress Monitoring
          </div>
          <h1>
            Protecting Survivors with<br />
            <span>Intelligent Support</span>
          </h1>
          <p className="landing-hero__desc">
            RakshaSetu is a national distress management platform that uses AI to monitor mental health,
            identify risk, and connect victims of atrocities with timely counsellor support — all with full
            transparency and consent.
          </p>
          <div className="landing-hero__cta">
            <Link to="/login" className="btn btn-primary btn-lg">
              <Icon name="login" />
              Access Your Account
            </Link>
            <a href="#how-it-works" className="btn btn-outline btn-lg">
              How It Works
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section" id="how-it-works" style={{ background: '#fff' }}>
        <div className="landing-section__center">
          <h2>How It Works</h2>
          <p>A trauma-informed, privacy-first approach to continuous distress monitoring</p>
        </div>
        <div className="how-grid">
          {HOW_STEPS.map((step, i) => (
            <div className="how-card" key={i}>
              <div className="how-card__icon">
                <Icon name={step.icon} size="icon-lg" />
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust banner */}
      <div className="trust-banner">
        <div className="container">
          <h2>Privacy & Consent First</h2>
          <p>
            Your data belongs to you. Every interaction is consent-driven, encrypted at rest and in transit,
            and subject to strict data minimisation principles. This platform is a <strong>screening and triage aid</strong> —
            all risk assessments are reviewed by trained human counsellors.
          </p>
          <Link to="/login" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>
            <Icon name="lock" />
            Begin with Consent
          </Link>
          <div className="trust-items">
            {[['100%', 'Consent Driven'], ['E2E', 'Encrypted'], ['0', 'Third-party Data Sales'], ['24/7', 'Counsellor Backup']].map(([num, label]) => (
              <div className="trust-item" key={label}>
                <div className="trust-item__num">{num}</div>
                <div className="trust-item__label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Roles section */}
      <section className="landing-section">
        <div className="landing-section__center">
          <h2>Built for Every Role</h2>
          <p>From individual citizens to national administrators — each stakeholder has a tailored dashboard</p>
        </div>
        <div className="how-grid" style={{ maxWidth: 900 }}>
          {[
            { icon: 'person', title: 'Citizen', desc: 'Track your check-ins, view your risk timeline, and access your prediction results privately.' },
            { icon: 'supervisor_account', title: 'Counsellor', desc: 'Review cases, act on alerts, record interventions, and monitor multi-citizen risk dashboards.' },
            { icon: 'account_balance', title: 'District Officer', desc: 'Monitor district-wide risk distribution, case stages, and pending alert volumes.' },
          ].map((r, i) => (
            <div className="how-card" key={i}>
              <div className="how-card__icon"><Icon name={r.icon} size="icon-lg" /></div>
              <h3>{r.title}</h3>
              <p>{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer__logo">🛡 RakshaSetu</div>
        <p style={{ marginBottom: '0.5rem' }}>National Distress Management System · Ministry of Women & Child Development</p>
        <p>This platform is a <em>screening and triage aid only</em> — not a clinical diagnosis tool. All assessments require human counsellor review.</p>
        <p style={{ marginTop: '1.5rem', fontSize: '0.78rem' }}>© 2024 Government of India. All rights reserved.</p>
      </footer>
    </div>
  );
}
