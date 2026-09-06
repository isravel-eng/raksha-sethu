import 'dotenv/config';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../db/seed.js';

const base = `http://127.0.0.1:${process.env.PORT || 4000}`;

async function request(method, url, { token, body } = {}) {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: response.status, json };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const result = await request('GET', '/health');
assert(result.status === 200 && result.json.status === 'ok', 'health check failed');

const denied = await request('GET', '/cases');
assert(denied.status === 401, 'protected endpoint should require JWT');

const login = await request('POST', '/auth/login', {
  body: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
});
assert(login.status === 200 && login.json.token, `login failed: ${JSON.stringify(login.json)}`);
const token = login.json.token;
const citizenId = login.json.user.citizen_id;

const register = await request('POST', '/auth/register', {
  body: {
    email: `smoke.${Date.now()}@demo.rakshasetu`,
    password: 'SmokeTest!1',
    role: 'citizen',
    name: 'Smoke Citizen',
    phone: '9999999999',
    district: 'Hyderabad',
    state: 'Telangana',
    consent_given: true,
  },
});
assert(register.status === 201 && register.json.token, `register failed: ${JSON.stringify(register.json)}`);
assert(!('password_hash' in register.json.user), 'password hash leaked');

const citizen = await request('GET', `/citizens/${citizenId}`, { token });
assert(citizen.status === 200, `GET citizen failed: ${JSON.stringify(citizen.json)}`);

const cases = await request('GET', '/cases', { token });
assert(cases.status === 200 && cases.json.cases.length >= 1, 'GET /cases failed');
const caseId = cases.json.cases[0].id;

const checkIn = await request('POST', '/check-ins', {
  token,
  body: {
    case_id: caseId,
    emotional_distress: 9,
    distress_frequency: 6,
    overwhelm: 9,
    sleep_quality: 2,
    fatigue: 8,
    social_support: 2,
    coping_ability: 2,
    self_harm_indicator: 0,
    message_text: 'I feel unsafe and need immediate help after the postponed hearing.',
  },
});
assert([201, 202].includes(checkIn.status), `POST /check-ins failed: ${JSON.stringify(checkIn.json)}`);
assert(checkIn.json.check_in?.id, 'check-in was not stored');
assert(Array.isArray(checkIn.json.ml_request?.checkin_history), 'ML request history missing');
const latest = checkIn.json.ml_request.checkin_history.at(-1);
assert(latest.hearing_postponed === 1, 'hearing_postponed was not forwarded to ML');
assert(Number(latest.postponement_days) === 21, 'postponement_days was not forwarded to ML');
assert(latest.threat_reported === 1, 'threat_reported was not forwarded to ML');

if (checkIn.json.ml_error) {
  throw new Error(`ML integration failed: ${JSON.stringify(checkIn.json.ml_error)}`);
}

assert(checkIn.json.prediction?.risk_level, 'ML prediction missing');
assert(checkIn.json.stored_prediction?.id, 'prediction was not stored');
assert(
  checkIn.json.stored_prediction.risk_level === checkIn.json.prediction.risk_level,
  'stored prediction does not match FastAPI result'
);

if (checkIn.json.prediction.human_review_required) {
  assert(checkIn.json.alert?.id, 'human_review_required should create an alert');
  const high = ['HIGH', 'URGENT'].includes(String(checkIn.json.prediction.risk_level).toUpperCase());
  if (high) {
    assert(
      ['HIGH', 'URGENT'].includes(String(checkIn.json.alert.severity).toUpperCase()),
      'HIGH/URGENT alert severity mismatch'
    );
  }
} else {
  console.warn('Latest prediction did not require human review; alert creation was skipped.');
}

console.log('Smoke tests passed.');
console.log(`check_in_id=${checkIn.json.check_in.id} risk=${checkIn.json.prediction.risk_level} alert=${checkIn.json.alert?.id ?? 'none'}`);
