import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  mlServiceUrl: (process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, ''),
  mlTimeoutMs: Number(process.env.ML_TIMEOUT_MS || 10000),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export const ROLES = [
  'citizen',
  'counsellor',
  'district_officer',
  'state_officer',
  'national_admin',
];

export const STAFF_ROLES = ROLES.filter((role) => role !== 'citizen');

export const EVENT_TYPES = [
  'FIR',
  'CHARGESHEET',
  'TRIAL_DATE',
  'HEARING_POSTPONED',
  'RELIEF',
  'THREAT_REPORTED',
];

export const CASE_STAGES = ['FIR', 'CHARGESHEET', 'TRIAL', 'RELIEF', 'CLOSED'];
export const ALERT_STATUSES = ['open', 'acknowledged', 'resolved'];
