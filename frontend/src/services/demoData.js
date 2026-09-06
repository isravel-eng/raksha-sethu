/**
 * Demo fallback data — mirrors exact API response shapes.
 * Used when the backend is unavailable or for showcasing.
 * To switch to real backend: set VITE_API_BASE_URL and remove VITE_USE_DEMO=true.
 */

export const DEMO_TOKEN = 'demo-token-not-for-real-auth';

export const DEMO_USER = {
  id: 1,
  email: 'ananya.reddy@demo.rakshasetu',
  role: 'citizen',
  citizen_id: 1,
  created_at: '2024-03-01T00:00:00Z',
  updated_at: '2024-03-01T00:00:00Z',
};

export const DEMO_COUNSELLOR_USER = {
  id: 10,
  email: 'priya.sharma@rakshasetu.gov',
  role: 'counsellor',
  citizen_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const DEMO_OFFICER_USER = {
  id: 20,
  email: 'officer@district.gov',
  role: 'district_officer',
  citizen_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const DEMO_CITIZEN = {
  id: 1,
  user_id: 1,
  name: 'Ananya Reddy',
  phone: '9876543210',
  district: 'Hyderabad',
  state: 'Telangana',
  consent_given: true,
  created_at: '2024-03-01T00:00:00Z',
  updated_at: '2024-03-01T00:00:00Z',
};

export const DEMO_CASE = {
  id: 1,
  citizen_id: 1,
  case_number: 'RS-2024-00001',
  district: 'Hyderabad',
  state: 'Telangana',
  case_stage: 'TRIAL',
  status: 'active',
  created_at: '2024-03-02T00:00:00Z',
  updated_at: '2024-09-22T00:00:00Z',
};

export const DEMO_EVENTS = [
  { id: 1, case_id: 1, event_type: 'FIR',               event_date: '2024-03-02T09:00:00Z', details_json: { station: 'Banjara Hills PS', fir_number: 'FIR-118/2024' },       created_at: '2024-03-02T09:00:00Z' },
  { id: 2, case_id: 1, event_type: 'CHARGESHEET',       event_date: '2024-05-18T11:00:00Z', details_json: { chargesheet_number: 'CS-44/2024' },                              created_at: '2024-05-18T11:00:00Z' },
  { id: 3, case_id: 1, event_type: 'TRIAL_DATE',        event_date: '2024-08-05T10:00:00Z', details_json: { hearing_date: '2024-09-20T10:00:00Z', court: 'Special Court, Hyderabad' }, created_at: '2024-08-05T10:00:00Z' },
  { id: 4, case_id: 1, event_type: 'HEARING_POSTPONED', event_date: '2024-09-18T16:00:00Z', details_json: { postponement_days: 21, reason: 'Witness unavailable', new_hearing_date: '2024-10-11T10:00:00Z' }, created_at: '2024-09-18T16:00:00Z' },
  { id: 5, case_id: 1, event_type: 'THREAT_REPORTED',   event_date: '2024-09-22T14:30:00Z', details_json: { protection_needed: true, description: 'Accused relatives contacted citizen.' }, created_at: '2024-09-22T14:30:00Z' },
];

export const DEMO_CHECK_INS = [
  { id: 1, citizen_id: 1, case_id: 1, timestamp: '2024-03-10T08:00:00Z', emotional_distress: 4, distress_frequency: 2, overwhelm: 3, sleep_quality: 7, fatigue: 4, social_support: 7, coping_ability: 7, self_harm_indicator: 0, message_text: 'Filed complaint. Feeling supported by sister.', created_at: '2024-03-10T08:00:00Z' },
  { id: 2, citizen_id: 1, case_id: 1, timestamp: '2024-06-02T08:00:00Z', emotional_distress: 6, distress_frequency: 4, overwhelm: 6, sleep_quality: 5, fatigue: 6, social_support: 5, coping_ability: 5, self_harm_indicator: 0, message_text: 'Chargesheet filed but tired and worried about trial.', created_at: '2024-06-02T08:00:00Z' },
  { id: 3, citizen_id: 1, case_id: 1, timestamp: '2024-09-25T08:00:00Z', emotional_distress: 8, distress_frequency: 6, overwhelm: 8, sleep_quality: 3, fatigue: 8, social_support: 2, coping_ability: 3, self_harm_indicator: 0, message_text: 'Feeling unsafe after the threat and postponed hearing. Need help.', created_at: '2024-09-25T08:00:00Z' },
];

export const DEMO_PREDICTION = {
  risk_level: 'HIGH',
  ml_risk_level: 'HIGH',
  dynamic_score: { score: 68.4, risk_tier: 'HIGH' },
  urgent_probability: 0.41,
  confidence: 0.62,
  trend: 'worsening',
  top_risk_factors: ['emotional distress', 'worsening trend', 'safety signal'],
  protective_factors: [],
  human_review_required: true,
  model_version: 'synthetic-risk-v1',
  disclaimer: 'Synthetic demonstration only; not a diagnosis or clinical recommendation.',
};

export const DEMO_STORED_PREDICTION = {
  id: 1,
  citizen_id: 1,
  case_id: 1,
  check_in_id: 3,
  risk_level: 'HIGH',
  dynamic_score: 68.4,
  urgent_probability: 0.41,
  confidence: 0.62,
  trend: 'worsening',
  top_risk_factors_json: ['emotional distress', 'worsening trend', 'safety signal'],
  protective_factors_json: [],
  human_review_required: true,
  model_version: 'synthetic-risk-v1',
  created_at: '2024-09-25T08:00:00Z',
};

export const DEMO_ALERT = {
  id: 1,
  citizen_id: 1,
  case_id: 1,
  prediction_id: 1,
  severity: 'HIGH',
  status: 'open',
  message: 'Human review required: HIGH risk after threat report and postponed hearing.',
  created_at: '2024-09-25T08:00:00Z',
  resolved_at: null,
};

export const DEMO_CASES_LIST = [
  { id: 1, citizen_id: 1, case_number: 'RS-2024-00001', district: 'Hyderabad', state: 'Telangana', case_stage: 'TRIAL',  status: 'active', created_at: '2024-03-02T00:00:00Z', citizen_name: 'Ananya Reddy',   latest_risk: 'HIGH',   latest_score: 68.4 },
  { id: 2, citizen_id: 2, case_number: 'RS-2024-00002', district: 'Warangal',  state: 'Telangana', case_stage: 'FIR',    status: 'active', created_at: '2024-04-15T00:00:00Z', citizen_name: 'Kavitha Rao',    latest_risk: 'URGENT', latest_score: 82.1 },
  { id: 3, citizen_id: 3, case_number: 'RS-2024-00003', district: 'Nizamabad', state: 'Telangana', case_stage: 'RELIEF', status: 'active', created_at: '2024-05-20T00:00:00Z', citizen_name: 'Meena Sharma',   latest_risk: 'MEDIUM', latest_score: 43.7 },
  { id: 4, citizen_id: 4, case_number: 'RS-2024-00004', district: 'Karimnagar',state: 'Telangana', case_stage: 'TRIAL',  status: 'active', created_at: '2024-06-10T00:00:00Z', citizen_name: 'Lakshmi Nair',   latest_risk: 'LOW',    latest_score: 18.3 },
  { id: 5, citizen_id: 5, case_number: 'RS-2024-00005', district: 'Hyderabad', state: 'Telangana', case_stage: 'TRIAL',  status: 'active', created_at: '2024-07-05T00:00:00Z', citizen_name: 'Rekha Gupta',    latest_risk: 'HIGH',   latest_score: 71.2 },
];

export const DEMO_ALERTS_LIST = [
  { id: 1, citizen_id: 1, case_id: 1, prediction_id: 1, severity: 'HIGH',   status: 'open',   message: 'Human review required: HIGH risk after threat and postponed hearing.', created_at: '2024-09-25T08:00:00Z', citizen_name: 'Ananya Reddy' },
  { id: 2, citizen_id: 2, case_id: 2, prediction_id: 2, severity: 'URGENT', status: 'open',   message: 'URGENT: Distress score 82 requires immediate intervention.',             created_at: '2024-09-24T14:00:00Z', citizen_name: 'Kavitha Rao' },
  { id: 3, citizen_id: 5, case_id: 5, prediction_id: 5, severity: 'HIGH',   status: 'acknowledged', message: 'Worsening trend across last 3 check-ins.',                       created_at: '2024-09-23T10:00:00Z', citizen_name: 'Rekha Gupta' },
];
