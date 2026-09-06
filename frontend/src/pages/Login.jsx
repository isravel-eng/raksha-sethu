import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Icon, AlertBanner, FormGroup } from '../components/ui.jsx';
import {
  DEMO_USER, DEMO_TOKEN,
  DEMO_COUNSELLOR_USER, DEMO_OFFICER_USER,
} from '../services/demoData.js';

const DEMO_ACCOUNTS = [
  { label: 'Citizen (Ananya Reddy)',  user: DEMO_USER,            token: DEMO_TOKEN },
  { label: 'Counsellor',             user: DEMO_COUNSELLOR_USER, token: DEMO_TOKEN },
  { label: 'District Officer',       user: DEMO_OFFICER_USER,    token: DEMO_TOKEN },
];

function roleHome(role) {
  if (role === 'citizen')         return '/citizen/timeline';
  if (role === 'counsellor')      return '/counsellor/dashboard';
  return '/district/dashboard';
}

export default function Login() {
  const { login, loginDirect } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showReg, setShowReg]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await login(email, password);
      navigate(roleHome(user.role));
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function handleDemo(account) {
    loginDirect(account.user, account.token);
    navigate(roleHome(account.user.role));
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡</div>
          <div className="auth-card__logo-name">RakshaSetu</div>
          <div className="auth-card__logo-tagline">National Distress Management System</div>
        </div>

        {error && <AlertBanner type="error" onClose={() => setError('')}>{error}</AlertBanner>}

        <form onSubmit={handleSubmit} noValidate>
          <FormGroup label="Email address" id="email">
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </FormGroup>

          <FormGroup label="Password" id="password">
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </FormGroup>

          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Signing in…</> : <><Icon name="login" size="icon-sm" /> Sign In</>}
          </button>
        </form>

        <div className="auth-divider">or try a demo account</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.label}
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', fontSize: '0.85rem' }}
              onClick={() => handleDemo(acc)}
            >
              <Icon name={acc.user.role === 'citizen' ? 'person' : acc.user.role === 'counsellor' ? 'supervisor_account' : 'account_balance'} size="icon-sm" />
              {acc.label}
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '0.85rem', color: 'var(--brand-600)' }}
            onClick={() => setShowReg((v) => !v)}
          >
            {showReg ? 'Cancel registration' : 'Register as a citizen →'}
          </button>
        </div>

        {showReg && <RegisterForm />}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <Link to="/" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', district: '', state: '', consent_given: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.consent_given) { setError('You must give consent to register.'); return; }
    setError('');
    setLoading(true);
    try {
      await register({ ...form, role: 'citizen' });
      navigate('/citizen/consent');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }} noValidate>
      <h4 style={{ marginBottom: '1rem' }}>Create Citizen Account</h4>
      {error && <AlertBanner type="error" onClose={() => setError('')}>{error}</AlertBanner>}
      {[['email','Email','email','email'],['password','Password','password','new-password'],['name','Full Name','text','name'],['phone','Phone','tel','tel'],['district','District','text','off'],['state','State','text','off']].map(([k,l,t,ac]) => (
        <FormGroup key={k} label={l} id={`reg-${k}`} required={k !== 'phone'}>
          <input id={`reg-${k}`} type={t} className="form-input" value={form[k]} onChange={set(k)} autoComplete={ac} required={k !== 'phone'} />
        </FormGroup>
      ))}
      <div className="form-group">
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input type="checkbox" checked={form.consent_given} onChange={(e) => setForm((f) => ({ ...f, consent_given: e.target.checked }))} style={{ marginTop: 3 }} />
          I give informed consent for data collection and processing as described in the platform's privacy policy.
        </label>
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
        {loading ? 'Creating…' : 'Create Account'}
      </button>
    </form>
  );
}
