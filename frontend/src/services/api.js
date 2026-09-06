/**
 * RakshaSetu API Service Layer
 * All backend communication goes through this file.
 * Switch between real backend and demo data via VITE_API_BASE_URL.
 */

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// ─── Core request helper ─────────────────────────────────────────────────────

async function request(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = { error: text }; }

  if (!res.ok) {
    const err = new Error(json?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.details = json?.details;
    throw err;
  }
  return json;
}

function get(path, token)        { return request('GET',    path, { token }); }
function post(path, body, token) { return request('POST',   path, { body, token }); }
function patch(path, body, token){ return request('PATCH',  path, { body, token }); }

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login:    (email, password)  => post('/auth/login',    { email, password }),
  register: (data)             => post('/auth/register', data),
};

// ─── Citizens ─────────────────────────────────────────────────────────────────

export const citizensApi = {
  get: (id, token) => get(`/citizens/${id}`, token),
};

// ─── Cases ────────────────────────────────────────────────────────────────────

export const casesApi = {
  list:       (token)        => get('/cases', token),
  get:        (id, token)    => get(`/cases/${id}`, token),
  create:     (data, token)  => post('/cases', data, token),
  checkIns:   (id, token)    => get(`/cases/${id}/check-ins`, token),
  events:     (id, token)    => get(`/cases/${id}/events`, token),
};

// ─── Screenings ───────────────────────────────────────────────────────────────

export const screeningsApi = {
  create: (data, token) => post('/screenings', data, token),
};

// ─── Check-ins ────────────────────────────────────────────────────────────────

export const checkInsApi = {
  create: (data, token) => post('/check-ins', data, token),
};

// ─── Case Events ──────────────────────────────────────────────────────────────

export const caseEventsApi = {
  create: (data, token) => post('/case-events', data, token),
};

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const alertsApi = {
  list:   (token)              => get('/alerts', token),
  update: (id, status, token)  => patch(`/alerts/${id}`, { status }, token),
};

// ─── Interventions ────────────────────────────────────────────────────────────

export const interventionsApi = {
  create: (data, token) => post('/interventions', data, token),
};

// ─── Predictions ──────────────────────────────────────────────────────────────
// Predictions are returned inline with check-in responses.
// This namespace is a placeholder for any future dedicated endpoint.
export const predictionsApi = {};
